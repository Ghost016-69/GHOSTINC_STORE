/**
 * Cart pricing for GHOSTINC_STORE.
 *
 * This is a direct port of `Back-end/store/pricing.py::quote()`. The two must
 * agree to the cent, because the browser shows one total and the server charges
 * another. See PROJECT_CONTEXT.md section 5.
 *
 * ---------------------------------------------------------------------------
 * Why this file does the maths in integer cents
 * ---------------------------------------------------------------------------
 * The shorter version would be:
 *
 *   const vat = Math.round(taxableCents * 0.15)
 *
 * That form is *not* wrong at this shop's VAT rate. An exhaustive sweep
 * (_probe_float.mjs) shows it agrees with the integer form for every taxable
 * value from 0 to R 1,000,000, at 15% and at every other rate tried. So this
 * module is not fixing a live bug — it is choosing a form whose correctness does
 * not depend on how 0.15 happens to round in binary.
 *
 * Two reasons to prefer integers anyway:
 *
 *   1. Exactness by construction. Multiplying by an integer permille and doing
 *      one integer half-up division has no float anywhere in the path, so the
 *      answer cannot shift if the VAT rate changes to a value with more binary
 *      digits, or if the totals grow.
 *   2. Matching the back end. Django uses Decimal with ROUND_HALF_UP. Doing the
 *      same thing with integers means the two implementations cannot disagree
 *      about rounding mode, which is a much more likely source of a real
 *      one-cent drift than either formula being arithmetically wrong.
 */

/* -- Store rules ----------------------------------------------------------
 * These mirror Back-end/config/settings.py. They are also written into the
 * database migration, so change all three together.
 * ------------------------------------------------------------------------- */

/** 15% VAT expressed in permille, so the maths stays integral. */
export const VAT_PERMILLE = 150

/** Flat delivery: R 99.00 */
export const SHIPPING_FLAT_CENTS = 9_900

/** Free delivery at or above R 2 500.00 */
export const FREE_SHIPPING_THRESHOLD_CENTS = 250_000

export const CURRENCY = 'ZAR'

/** Matches the legacy cart: quantities are clamped to 1..99. */
export const MIN_QUANTITY = 1
export const MAX_QUANTITY = 99

/* -- Types ---------------------------------------------------------------- */

export interface CartItemInput {
  /** Unit price in integer cents, e.g. 24900 = R 249.00 */
  price_cents: number
  quantity: number
}

export interface QuoteRow extends CartItemInput {
  line_total_cents: number
}

/** The shape the blueprint asks for, plus the fields the UI already renders. */
export interface Quote {
  subtotal_cents: number
  discount_cents: number
  shipping_cents: number
  vat_cents: number
  total_cents: number

  item_count: number
  rows: QuoteRow[]
  currency: string
  free_shipping_threshold_cents: number
  shipping_flat_cents: number
  vat_rate: string
}

export interface PromoCode {
  code: string
  percent_off: number
  description?: string | null
  /** Mirrors the `is_active` column; omitted means active. */
  is_active?: boolean
  /** ISO-8601 timestamp, or null for "no expiry". */
  valid_until?: string | null
}

/* -- Integer helpers ------------------------------------------------------ */

/**
 * Python's ROUND_HALF_UP, on non-negative integers.
 *
 * `Math.round` is *not* a substitute: it rounds .5 towards +Infinity, which
 * happens to match for positive values, but it operates on a value that has
 * already been through float arithmetic. Doing the division on integers keeps
 * the whole expression exact.
 */
function halfUpDivide(numerator: number, denominator: number): number {
  return Math.floor((numerator + Math.floor(denominator / 2)) / denominator)
}

/** Largest integer that JavaScript can represent exactly. */
const MAX_SAFE = Number.MAX_SAFE_INTEGER

function assertSafeCents(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number, received ${value}`)
  }
  if (!Number.isInteger(value)) {
    throw new TypeError(
      `${label} must be an integer number of cents, received ${value}`,
    )
  }
  if (Math.abs(value) > MAX_SAFE) {
    throw new RangeError(`${label} is too large to price safely: ${value}`)
  }
  return value
}

function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) {
    return MIN_QUANTITY
  }
  const whole = Math.trunc(quantity)
  if (whole < MIN_QUANTITY) {
    return MIN_QUANTITY
  }
  if (whole > MAX_QUANTITY) {
    return MAX_QUANTITY
  }
  return whole
}

/* -- The quote ----------------------------------------------------------- */

/**
 * Price a cart.
 *
 * Mirrors `quote()` in Back-end/store/pricing.py exactly, including the order
 * of operations and the rounding points:
 *
 *   subtotal   = sum(unit_price_cents * quantity)
 *   discount   = half_up(subtotal * percent_off / 100)     when a promo applies
 *   discounted = subtotal - discount
 *   shipping   = 0 when the cart is empty
 *                0 when discounted >= FREE_SHIPPING_THRESHOLD_CENTS
 *                SHIPPING_FLAT_CENTS otherwise
 *   taxable    = discounted + shipping
 *   vat        = half_up(taxable * VAT_PERMILLE / 1000)
 *   total      = taxable + vat
 *
 * Two details that are easy to get wrong and are covered by tests:
 *   - Delivery is judged on the *discounted* value, not the subtotal.
 *   - An empty cart never pays for delivery.
 */
export function calculateCartQuote(
  items: readonly CartItemInput[],
  promo?: PromoCode | null,
): Quote {
  const rows: QuoteRow[] = []
  let subtotalCents = 0
  let itemCount = 0

  for (const item of items) {
    const priceCents = assertSafeCents(item.price_cents, 'price_cents')
    if (priceCents < 0) {
      throw new RangeError(`price_cents cannot be negative: ${priceCents}`)
    }

    const quantity = clampQuantity(item.quantity)
    const lineTotalCents = priceCents * quantity

    if (subtotalCents + lineTotalCents > MAX_SAFE) {
      throw new RangeError('cart subtotal exceeds the safe integer range')
    }

    subtotalCents += lineTotalCents
    itemCount += quantity
    rows.push({ price_cents: priceCents, quantity, line_total_cents: lineTotalCents })
  }

  // -- discount ------------------------------------------------------------
  const percentOff =
    promo && Number.isFinite(promo.percent_off) ? Math.trunc(promo.percent_off) : 0
  const discountCents =
    percentOff > 0 ? halfUpDivide(subtotalCents * percentOff, 100) : 0

  const discountedCents = subtotalCents - discountCents

  // -- delivery ------------------------------------------------------------
  // Judged on units, not on items.length: a line of quantity 0 still means an
  // empty cart. Matches the legacy `if units == 0` branch.
  const shippingCents =
    itemCount > 0 && discountedCents < FREE_SHIPPING_THRESHOLD_CENTS
      ? SHIPPING_FLAT_CENTS
      : 0

  // -- tax -----------------------------------------------------------------
  const taxableCents = discountedCents + shippingCents
  const vatCents = halfUpDivide(taxableCents * VAT_PERMILLE, 1000)
  const totalCents = taxableCents + vatCents

  return {
    subtotal_cents: subtotalCents,
    discount_cents: discountCents,
    shipping_cents: shippingCents,
    vat_cents: vatCents,
    total_cents: totalCents,

    item_count: itemCount,
    rows,
    currency: CURRENCY,
    free_shipping_threshold_cents: FREE_SHIPPING_THRESHOLD_CENTS,
    shipping_flat_cents: SHIPPING_FLAT_CENTS,
    vat_rate: String(VAT_PERMILLE / 10),
  }
}

/* -- Promo validation ----------------------------------------------------- */

export interface PromoCheck {
  valid: boolean
  code: string
  detail?: string
  promo?: PromoCode
}

/**
 * Mirror of `PromoCode.is_valid()` in Back-end/store/models.py.
 *
 * True when the code is switched on, has a sensible percentage, and is not past
 * its expiry. `now` is injectable so tests do not depend on the wall clock.
 */
export function isPromoValid(
  promo: PromoCode | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!promo || !promo.code) {
    return false
  }
  if (promo.is_active === false) {
    return false
  }
  if (!Number.isFinite(promo.percent_off) || promo.percent_off <= 0) {
    return false
  }
  if (promo.valid_until) {
    const expiry = Date.parse(promo.valid_until)
    // An unparseable expiry is treated as expired rather than as valid.
    if (Number.isNaN(expiry) || expiry < now.getTime()) {
      return false
    }
  }
  return true
}

/**
 * Resolve a typed code against the codes the caller fetched from
 * `promo_codes`. Kept separate from fetching so it stays pure and testable.
 */
export function checkPromoCode(
  typed: string,
  codes: readonly PromoCode[],
  now: Date = new Date(),
): PromoCheck {
  const wanted = typed.trim().toUpperCase()

  if (!wanted) {
    return { valid: false, code: wanted, detail: 'Enter a promo code.' }
  }

  const match = codes.find(
    (candidate) => candidate.code.toUpperCase() === wanted,
  )

  if (!match || !isPromoValid(match, now)) {
    return {
      valid: false,
      code: wanted,
      detail: 'That promo code is not valid.',
    }
  }

  return { valid: true, code: match.code, promo: match }
}

