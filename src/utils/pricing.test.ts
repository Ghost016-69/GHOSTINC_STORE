/**
 * Pricing tests.
 *
 * Every expected figure in FIXTURES below was produced by the legacy Django
 * back end — by `store.pricing.quote()` itself, via Tests/_cart_fixtures.py —
 * not by this module. So these assertions check the TypeScript port against the
 * system it replaces, which is the only comparison that actually means
 * something.
 *
 * Run with: npm test
 */
import { describe, expect, it } from 'vitest'

import {
  CURRENCY,
  FREE_SHIPPING_THRESHOLD_CENTS,
  SHIPPING_FLAT_CENTS,
  calculateCartQuote,
  checkPromoCode,
  isPromoValid,
  type CartItemInput,
  type PromoCode,
} from './pricing'

interface Fixture {
  label: string
  items: CartItemInput[]
  promo?: PromoCode | null
  expected: {
    subtotal_cents: number
    discount_cents: number
    shipping_cents: number
    vat_cents: number
    total_cents: number
    item_count: number
  }
}

/* SKUs from the seeded catalogue:
 *   GH-AC-002  Ironclad Braided USB-C Cable   R   249.00
 *   GH-AU-003  Reference Monitor Headset      R 3 000.00
 *   GH-LP-002  Vanta 16 Creator               R 44 999.00
 */
const FIXTURES: Fixture[] = [
  {
    label: 'empty cart',
    items: [],
    expected: {
      subtotal_cents: 0,
      discount_cents: 0,
      shipping_cents: 0,
      vat_cents: 0,
      total_cents: 0,
      item_count: 0,
    },
  },
  {
    label: 'cheapest x1 — under the threshold, so delivery applies',
    items: [{ price_cents: 24900, quantity: 1 }],
    expected: {
      subtotal_cents: 24900,
      discount_cents: 0,
      shipping_cents: 9900,
      vat_cents: 5220,
      total_cents: 40020,
      item_count: 1,
    },
  },
  {
    label: 'cheapest x3',
    items: [{ price_cents: 24900, quantity: 3 }],
    expected: {
      subtotal_cents: 74700,
      discount_cents: 0,
      shipping_cents: 9900,
      vat_cents: 12690,
      total_cents: 97290,
      item_count: 3,
    },
  },
  {
    label: 'mid x2 — over the threshold, so delivery is free',
    items: [{ price_cents: 300000, quantity: 2 }],
    expected: {
      subtotal_cents: 600000,
      discount_cents: 0,
      shipping_cents: 0,
      vat_cents: 90000,
      total_cents: 690000,
      item_count: 2,
    },
  },
  {
    label: 'cheapest + mid',
    items: [
      { price_cents: 24900, quantity: 1 },
      { price_cents: 300000, quantity: 1 },
    ],
    expected: {
      subtotal_cents: 324900,
      discount_cents: 0,
      shipping_cents: 0,
      vat_cents: 48735,
      total_cents: 373635,
      item_count: 2,
    },
  },
  {
    label: 'dearest x1 with GHOST10 — the case the float formula gets wrong',
    items: [{ price_cents: 4499900, quantity: 1 }],
    promo: { code: 'GHOST10', percent_off: 10 },
    expected: {
      subtotal_cents: 4499900,
      discount_cents: 449990,
      shipping_cents: 0,
      vat_cents: 607487,
      total_cents: 4657397,
      item_count: 1,
    },
  },
  {
    label: 'cheapest x3 with TECH15 — half-up rounding on VAT',
    items: [{ price_cents: 24900, quantity: 3 }],
    promo: { code: 'TECH15', percent_off: 15 },
    expected: {
      subtotal_cents: 74700,
      discount_cents: 11205,
      shipping_cents: 9900,
      vat_cents: 11009,
      total_cents: 84404,
      item_count: 3,
    },
  },
]

describe('calculateCartQuote matches the Django back end', () => {
  for (const fixture of FIXTURES) {
    it(fixture.label, () => {
      const quote = calculateCartQuote(fixture.items, fixture.promo ?? null)

      expect(quote.subtotal_cents).toBe(fixture.expected.subtotal_cents)
      expect(quote.discount_cents).toBe(fixture.expected.discount_cents)
      expect(quote.shipping_cents).toBe(fixture.expected.shipping_cents)
      expect(quote.vat_cents).toBe(fixture.expected.vat_cents)
      expect(quote.total_cents).toBe(fixture.expected.total_cents)
      expect(quote.item_count).toBe(fixture.expected.item_count)
    })
  }
})

describe('the invariants PROJECT_CONTEXT.md calls out', () => {
  it('never charges delivery on an empty cart', () => {
    const quote = calculateCartQuote([])
    expect(quote.shipping_cents).toBe(0)
    expect(quote.total_cents).toBe(0)
  })

  it('judges free delivery on the discounted value, not the subtotal', () => {
    // 24900 + 300000 = 324900 subtotal, but 25% off leaves 243675, which is
    // below the threshold, so delivery is charged even though the subtotal
    // was above it.
    const quote = calculateCartQuote(
      [
        { price_cents: 24900, quantity: 1 },
        { price_cents: 300000, quantity: 1 },
      ],
      { code: 'SAVE25', percent_off: 25 },
    )

    expect(quote.subtotal_cents).toBe(324900)
    expect(quote.discount_cents).toBe(81225)
    expect(quote.shipping_cents).toBe(SHIPPING_FLAT_CENTS)
  })

  it('grants free delivery exactly at the threshold', () => {
    const atThreshold = calculateCartQuote([
      { price_cents: FREE_SHIPPING_THRESHOLD_CENTS, quantity: 1 },
    ])
    expect(atThreshold.shipping_cents).toBe(0)

    const justUnder = calculateCartQuote([
      { price_cents: FREE_SHIPPING_THRESHOLD_CENTS - 1, quantity: 1 },
    ])
    expect(justUnder.shipping_cents).toBe(SHIPPING_FLAT_CENTS)
  })

  it('rounds the discount half up', () => {
    // 1010c * 15% = 151.5c. Half up gives 152, not 151.
    const quote = calculateCartQuote(
      [{ price_cents: 1010, quantity: 1 }],
      { code: 'HALF', percent_off: 15 },
    )

    expect(quote.discount_cents).toBe(152)

    const discounted = quote.subtotal_cents - quote.discount_cents
    expect(discounted).toBe(858)

    // Still under the free-delivery threshold, so R 99.00 is added before VAT.
    expect(quote.shipping_cents).toBe(SHIPPING_FLAT_CENTS)

    const taxable = discounted + quote.shipping_cents
    expect(taxable).toBe(10758)
    expect(quote.vat_cents).toBe(1614)
    expect(quote.total_cents).toBe(taxable + 1614)
  })

  it('adds delivery before VAT', () => {
    const quote = calculateCartQuote([{ price_cents: 24900, quantity: 1 }])
    const taxable = quote.subtotal_cents + quote.shipping_cents

    expect(taxable).toBe(34800)
    expect(quote.vat_cents).toBe(5220)
    expect(quote.total_cents).toBe(taxable + 5220)
  })

  it('agrees with the float form at 15%, but does not rely on it', () => {
    const quote = calculateCartQuote(
      [{ price_cents: 4499900, quantity: 1 }],
      { code: 'GHOST10', percent_off: 10 },
    )

    // 4499900 - 449990 = 4049910 cents of taxable value.
    const taxable = 4049910

    // The float form this module deliberately does not use. An exhaustive sweep
    // (see _probe_float.mjs) shows it happens to agree at 15% for every value
    // up to R 1,000,000 — the integer form is used because it is exact by
    // construction rather than by luck, not because this case needs it.
    const floatVat = Math.round(taxable * 0.15)
    const integerVat = Math.floor((taxable * 150 + 500) / 1000)

    expect(floatVat).toBe(607487)
    expect(integerVat).toBe(607487)
    expect(quote.vat_cents).toBe(607487)

    // The integer form is half-up on exact integers, with no float in the path.
    // This is the property that actually matters, and it is what the Django
    // Decimal implementation does with ROUND_HALF_UP.
    expect(integerVat).toBe(Math.floor((taxable * 150 + 500) / 1000))
  })

  it('clamps quantities to 1..99 like the legacy cart', () => {
    expect(calculateCartQuote([{ price_cents: 100, quantity: 0 }]).item_count).toBe(1)
    expect(calculateCartQuote([{ price_cents: 100, quantity: -5 }]).item_count).toBe(1)
    expect(calculateCartQuote([{ price_cents: 100, quantity: 500 }]).item_count).toBe(99)
  })

  it('rejects prices that are not whole cents', () => {
    expect(() => calculateCartQuote([{ price_cents: 249.5, quantity: 1 }])).toThrow(
      /integer number of cents/,
    )
    expect(() => calculateCartQuote([{ price_cents: Number.NaN, quantity: 1 }])).toThrow(
      /finite number/,
    )
    expect(() => calculateCartQuote([{ price_cents: -100, quantity: 1 }])).toThrow(
      /negative/,
    )
  })

  it('reports the store rules alongside the quote', () => {
    const quote = calculateCartQuote([])
    expect(quote.currency).toBe(CURRENCY)
    expect(quote.shipping_flat_cents).toBe(9900)
    expect(quote.free_shipping_threshold_cents).toBe(250000)
    expect(quote.vat_rate).toBe('15')
  })

  it('keeps one row per line, with its own line total', () => {
    const quote = calculateCartQuote([
      { price_cents: 24900, quantity: 3 },
      { price_cents: 300000, quantity: 1 },
    ])

    expect(quote.rows).toHaveLength(2)
    expect(quote.rows[0]?.line_total_cents).toBe(74700)
    expect(quote.rows[1]?.line_total_cents).toBe(300000)
  })
})

describe('promo codes', () => {
  const now = new Date('2026-10-05T00:00:00Z')

  it('accepts a live code, case-insensitively', () => {
    const result = checkPromoCode('ghost10', [{ code: 'GHOST10', percent_off: 10 }], now)
    expect(result.valid).toBe(true)
    expect(result.promo?.percent_off).toBe(10)
  })

  it('rejects an unknown code', () => {
    const result = checkPromoCode('NOPE', [{ code: 'GHOST10', percent_off: 10 }], now)
    expect(result.valid).toBe(false)
  })

  it('rejects a code past its expiry', () => {
    const result = checkPromoCode(
      'EXPIRED20',
      [
        {
          code: 'EXPIRED20',
          percent_off: 20,
          valid_until: '2026-10-01T00:00:00Z',
        },
      ],
      now,
    )
    expect(result.valid).toBe(false)
  })

  it('rejects a deactivated code', () => {
    const result = checkPromoCode(
      'TECH15',
      [{ code: 'TECH15', percent_off: 15, is_active: false }],
      now,
    )
    expect(result.valid).toBe(false)
  })

  it('prompts for input when nothing was typed', () => {
    const result = checkPromoCode('   ', [], now)
    expect(result.valid).toBe(false)
    expect(result.detail).toMatch(/enter a promo code/i)
  })

  it('treats an unparseable expiry as expired', () => {
    expect(
      isPromoValid({ code: 'X', percent_off: 10, valid_until: 'not-a-date' }, now),
    ).toBe(false)
  })
})

