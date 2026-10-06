/**
 * Cart lines and the pure functions that change them.
 *
 * A cart line holds a SKU, a quantity and a little display snapshot (name,
 * slug, image, brand) so a card or summary can paint straight away. It does
 * NOT hold a price the browser is willing to believe in: `unit_price_cents` is
 * a display fallback only, and every total comes from `quoteCart()`, which
 * re-prices each line against the live catalogue. A stale or edited cart can
 * therefore never move a total — the same rule the legacy `store.js` followed
 * when it refused to persist prices.
 *
 * Kept free of React so the logic can be tested under plain node
 * (src/state/cart.test.ts), matching how src/utils/pricing.ts is tested.
 *
 * Storage keys are the ones the legacy front end used (`ghostinc-cart`,
 * `ghostinc-promo`), so a browser that visited the old static site keeps its
 * cart shape. Every read is defensive: localStorage throws in some private
 * browsing modes, and a shop should still work when storage does not.
 */
import type { CatalogProduct } from '../types/database'
import {
  calculateCartQuote,
  MAX_QUANTITY,
  MIN_QUANTITY,
  type PromoCode,
  type Quote,
} from '../utils/pricing'

export const CART_STORAGE_KEY = 'ghostinc-cart'
export const PROMO_STORAGE_KEY = 'ghostinc-promo'

export interface CartLine {
  sku: string
  /** Always clamped to MIN_QUANTITY..MAX_QUANTITY. */
  quantity: number

  /* -- display snapshot: never priced from --------------------------------- */
  slug: string
  name: string
  brand: string | null
  image: string | null
  /**
   * Unit price at the moment the line was added. Display only — totals are
   * always recomputed by quoteCart() from the catalogue row.
   */
  unit_price_cents: number
}

/* -- Quantity -------------------------------------------------------------- */

/** Matches the legacy cart: quantities are integers clamped to 1..99. */
export function clampQuantity(quantity: number): number {
  const parsed = Math.trunc(quantity)
  if (!Number.isFinite(parsed) || parsed < MIN_QUANTITY) {
    return MIN_QUANTITY
  }
  if (parsed > MAX_QUANTITY) {
    return MAX_QUANTITY
  }
  return parsed
}

/* -- Line operations (pure) ------------------------------------------------ */

/** Add a line, or bump an existing one. The sum is clamped, not wrapped. */
export function addLine(lines: readonly CartLine[], incoming: CartLine): CartLine[] {
  const existing = lines.find((line) => line.sku === incoming.sku)

  if (!existing) {
    return [...lines, { ...incoming, quantity: clampQuantity(incoming.quantity) }]
  }

  return lines.map((line) =>
    line.sku === incoming.sku
      ? { ...line, ...incoming, quantity: clampQuantity(line.quantity + incoming.quantity) }
      : line,
  )
}

/** Change a line's quantity. Out-of-range input clamps rather than throws. */
export function setLineQuantity(
  lines: readonly CartLine[],
  sku: string,
  quantity: number,
): CartLine[] {
  return lines.map((line) =>
    line.sku === sku ? { ...line, quantity: clampQuantity(quantity) } : line,
  )
}

export function removeLine(lines: readonly CartLine[], sku: string): CartLine[] {
  return lines.filter((line) => line.sku !== sku)
}

/** Units in the cart — not distinct lines. A 3-pack counts as 3. */
export function countUnits(lines: readonly CartLine[]): number {
  return lines.reduce((total, line) => total + line.quantity, 0)
}

/* -- localStorage ---------------------------------------------------------- */

function storage(): Storage | null {
  try {
    // typeof guards the node test environment, where localStorage does not
    // exist; the try/catch covers browsers where touching it throws.
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

function readJson(key: string): unknown {
  try {
    const store = storage()
    const raw = store?.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    // Corrupt JSON or blocked storage: treat as empty rather than crash.
    return null
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    storage()?.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or blocked: carry on without persisting.
  }
}

/**
 * Rebuild cart lines from stored JSON.
 *
 * Anything that is not a plausible line is dropped, duplicate SKUs are merged
 * (quantities summed, then clamped), and a missing quantity falls back to 1.
 * The stored shape is never trusted for price — see quoteCart().
 */
export function readStoredCart(): CartLine[] {
  const parsed = readJson(CART_STORAGE_KEY)
  if (!Array.isArray(parsed)) {
    return []
  }

  const bySku = new Map<string, CartLine>()

  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object') {
      continue
    }
    const raw = entry as Record<string, unknown>
    if (typeof raw.sku !== 'string' || raw.sku === '') {
      continue
    }

    const quantity =
      typeof raw.quantity === 'number' ? clampQuantity(raw.quantity) : MIN_QUANTITY

    const existing = bySku.get(raw.sku)
    if (existing) {
      existing.quantity = clampQuantity(existing.quantity + quantity)
      continue
    }

    bySku.set(raw.sku, {
      sku: raw.sku,
      quantity,
      slug: typeof raw.slug === 'string' ? raw.slug : '',
      name: typeof raw.name === 'string' ? raw.name : raw.sku,
      brand: typeof raw.brand === 'string' ? raw.brand : null,
      image: typeof raw.image === 'string' ? raw.image : null,
      unit_price_cents:
        typeof raw.unit_price_cents === 'number' && Number.isFinite(raw.unit_price_cents)
          ? Math.max(0, Math.trunc(raw.unit_price_cents))
          : 0,
    })
  }

  return [...bySku.values()]
}

export function writeStoredCart(lines: readonly CartLine[]): void {
  writeJson(CART_STORAGE_KEY, lines)
}

/** The applied promo code as typed, or '' for none. */
export function readStoredPromo(): string {
  const parsed = readJson(PROMO_STORAGE_KEY)
  return typeof parsed === 'string' ? parsed : ''
}

export function writeStoredPromo(code: string): void {
  writeJson(PROMO_STORAGE_KEY, code)
}

export function clearStoredCart(): void {
  writeJson(CART_STORAGE_KEY, [])
}

export function clearStoredPromo(): void {
  writeJson(PROMO_STORAGE_KEY, '')
}

/* -- Pricing --------------------------------------------------------------- */

/**
 * Price the cart against the LIVE catalogue.
 *
 * Lines whose product no longer exists are skipped, so a stale cart cannot
 * quote a price the store no longer sells. The maths itself is
 * `calculateCartQuote()` — this module never re-implements it (see .clinerules).
 */
export function quoteCart(
  lines: readonly CartLine[],
  catalogue: readonly CatalogProduct[],
  promo: PromoCode | null,
): Quote {
  const items = lines.flatMap((line) => {
    const product = catalogue.find((candidate) => candidate.sku === line.sku)
    return product ? [{ price_cents: product.price_cents, quantity: line.quantity }] : []
  })

  return calculateCartQuote(items, promo)
}

/** Resolve a line to its catalogue row, or null when it has vanished. */
export function resolveLine(
  line: CartLine,
  catalogue: readonly CatalogProduct[],
): CatalogProduct | null {
  return catalogue.find((candidate) => candidate.sku === line.sku) ?? null
}


