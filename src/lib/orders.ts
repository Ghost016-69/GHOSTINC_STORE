/**
 * Order placement and lookup against the Supabase RPCs.
 *
 * The browser never decides what an order costs. `place_order()` re-prices
 * every line from the `products` table, validates the promo code, checks stock
 * and decrements it — so a tampered or stale cart is rejected rather than
 * honoured (see supabase/migrations/001_ecommerce_schema.sql).
 *
 * Two round trips on purpose: place_order() returns the priced lines but not
 * `status`/`created_at`, so the confirmation re-reads the canonical row with
 * lookup_order(). That keeps one renderer for both "we just placed it" and
 * "someone reopened /confirmation?order=GH-123456".
 *
 * lookup_order() is a SECURITY DEFINER function because `orders` deliberately
 * has no SELECT policy — it returns exactly one order, by reference, and only
 * if it is less than 90 days old.
 */
import { describeError, getSupabase } from './supabase'

export interface OrderItem {
  product_name: string
  product_sku: string
  product_slug: string
  unit_price_cents: number
  quantity: number
  line_total_cents: number
}

export interface OrderDetails {
  order_number: string
  status: string
  created_at: string | null
  customer_name: string
  customer_email: string

  subtotal_cents: number
  discount_cents: number
  shipping_cents: number
  vat_cents: number
  total_cents: number
  currency: string

  items: OrderItem[]
}

/** Free-form JSONB stored on `orders.shipping_address`. */
export interface DeliveryAddress {
  line1: string
  line2?: string
  city: string
  province?: string
  postal_code: string
  notes?: string
  phone?: string
}

export interface PlaceOrderInput {
  email: string
  /** First and last name joined — the schema stores one `customer_name`. */
  name: string
  address: DeliveryAddress
  /** SKU + quantity only. Any price sent here is ignored by the server. */
  items: { sku: string; quantity: number }[]
  promoCode?: string | null
}

/** Shape place_order() returns: priced lines, no status timestamps. */
interface PlaceOrderResult {
  order_number: string
  item_count?: number
  subtotal_cents?: number
  discount_cents?: number
  shipping_cents?: number
  vat_cents?: number
  total_cents?: number
  currency?: string
  items?: Array<Record<string, unknown>>
}

function asInt(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : 0
}

function asText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

/** Normalise either RPC's line array into OrderItem, deriving the total. */
function toOrderItems(raw: unknown): OrderItem[] {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw.map((entry) => {
    const item = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>
    const unit = asInt(item.unit_price_cents)
    const quantity = asInt(item.quantity)

    return {
      product_name: asText(item.product_name),
      product_sku: asText(item.product_sku ?? item.sku),
      product_slug: asText(item.product_slug),
      unit_price_cents: unit,
      quantity,
      // place_order() omits the line total; lookup_order() includes it.
      line_total_cents: asInt(item.line_total_cents) || unit * quantity,
    }
  })
}

function toOrderDetails(raw: unknown, fallback?: PlaceOrderInput): OrderDetails {
  const details = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>

  return {
    order_number: asText(details.order_number),
    status: asText(details.status, 'pending'),
    created_at: typeof details.created_at === 'string' ? details.created_at : null,
    customer_name: asText(details.customer_name, fallback?.name ?? ''),
    customer_email: asText(details.customer_email, fallback?.email ?? ''),
    subtotal_cents: asInt(details.subtotal_cents),
    discount_cents: asInt(details.discount_cents),
    shipping_cents: asInt(details.shipping_cents),
    vat_cents: asInt(details.vat_cents),
    total_cents: asInt(details.total_cents),
    currency: asText(details.currency, 'ZAR'),
    items: toOrderItems(details.items),
  }
}

/**
 * Place an order.
 *
 * Throws with the server's message on failure — `place_order()` raises things
 * like "only 2 left, you asked for 5", which is exactly what the checkout form
 * should show the customer.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<OrderDetails> {
  const supabase = getSupabase()

  const { data, error } = await supabase.rpc('place_order', {
    p_email: input.email,
    p_name: input.name,
    p_address: input.address,
    p_items: input.items,
    p_promo_code: input.promoCode ?? null,
  })
  if (error) {
    throw new Error(describeError(error))
  }

  const placed = data as PlaceOrderResult | null
  if (!placed || typeof placed.order_number !== 'string' || !placed.order_number) {
    throw new Error('The order was not accepted. Please try again.')
  }

  // Prefer the canonical row; fall back to what place_order() returned if the
  // lookup fails, because the order itself did succeed.
  try {
    const canonical = await lookupOrder(placed.order_number)
    if (canonical) {
      return canonical
    }
  } catch {
    /* fall through to the raw result */
  }

  return toOrderDetails(placed, input)
}

/** Fetch one order by its reference, or null when it is unknown/expired. */
export async function lookupOrder(orderNumber: string): Promise<OrderDetails | null> {
  const supabase = getSupabase()

  const { data, error } = await supabase.rpc('lookup_order', {
    p_order_number: orderNumber.trim().toUpperCase(),
  })
  if (error) {
    throw new Error(describeError(error))
  }
  if (!data) {
    return null
  }

  return toOrderDetails(data)
}
