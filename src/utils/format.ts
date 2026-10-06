/**
 * Formatting helpers for integer cents.
 *
 * Kept apart from pricing.ts so the arithmetic module never imports anything
 * that could tempt a caller to mix formatting with maths.
 */

/**
 * 249900 -> "R 2 499.00"
 *
 * Grouped thousands with a space, matching the legacy front end
 * (Front-end/Scripts/store.js::money).
 */
export function formatCents(cents: number): string {
  if (!Number.isFinite(cents)) {
    return 'R 0.00'
  }

  const rounded = Math.round(cents)
  const negative = rounded < 0
  const absolute = Math.abs(rounded)

  const whole = Math.floor(absolute / 100)
  const part = absolute % 100

  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

  return `${negative ? '-R ' : 'R '}${grouped}.${part < 10 ? '0' + part : part}`
}

/**
 * Parse a user-typed rand amount ("1 234.50", "R1234.5") into cents.
 *
 * Returns null when the text is not a usable amount, so callers can show a
 * validation message instead of silently pricing at zero.
 */
export function parseCents(input: string): number | null {
  const cleaned = input.replace(/[^\d.,-]/g, '').replace(/,/g, '')
  if (!cleaned) {
    return null
  }

  if (!/^-?\d*\.?\d*$/.test(cleaned)) {
    return null
  }

  const value = Number.parseFloat(cleaned)
  if (!Number.isFinite(value)) {
    return null
  }

  const cents = Math.round(value * 100)
  return Number.isSafeInteger(cents) ? cents : null
}
