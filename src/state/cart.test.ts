/**
 * Tests for the pure cart logic.
 *
 * The React provider is deliberately thin — these are the rules that matter:
 * quantity clamping, merge/remove behaviour, defensive storage reads, and the
 * guarantee that pricing comes from the live catalogue rather than whatever
 * was snapshotted into the line.
 *
 * Vitest runs in the `node` environment (vite.config.ts), which is why cart.ts
 * guards its localStorage access: there is none here to begin with.
 */
import { describe, expect, it, vi } from 'vitest'

import type { CatalogProduct } from '../types/database'
import {
  addLine,
  clampQuantity,
  countUnits,
  quoteCart,
  readStoredCart,
  removeLine,
  setLineQuantity,
  type CartLine,
} from './cart'

const MIN_QUANTITY_TEST = 1
const MAX_QUANTITY_TEST = 99

function line(sku: string, quantity = 1): CartLine {
  return {
    sku,
    quantity,
    slug: sku.toLowerCase(),
    name: `Product ${sku}`,
    brand: null,
    image: null,
    unit_price_cents: 10_00,
  }
}

function product(sku: string, priceCents: number): CatalogProduct {
  return {
    id: sku,
    sku,
    name: `Product ${sku}`,
    slug: sku.toLowerCase(),
    category_id: null,
    brand_id: null,
    price_cents: priceCents,
    compare_at_cents: null,
    stock: 5,
    low_stock_threshold: 3,
    short_description: null,
    description: null,
    specs: {},
    image_path: null,
    rating: 0,
    rating_count: 0,
    condition: 'new',
    is_featured: false,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    in_stock: true,
    low_stock: false,
    is_on_sale: false,
    discount_percent: 0,
    category: null,
    category_slug: null,
    brand: null,
    brand_slug: null,
  }
}

describe('clampQuantity', () => {
  it('keeps values inside the legacy 1..99 range', () => {
    expect(clampQuantity(5)).toBe(5)
    expect(clampQuantity(0)).toBe(MIN_QUANTITY_TEST)
    expect(clampQuantity(-3)).toBe(MIN_QUANTITY_TEST)
    expect(clampQuantity(1_000)).toBe(MAX_QUANTITY_TEST)
  })

  it('treats non-numeric input as one', () => {
    expect(clampQuantity(Number.NaN)).toBe(MIN_QUANTITY_TEST)
    expect(clampQuantity(2.9)).toBe(2)
  })
})

describe('line operations', () => {
  it('adds a new line and merges an existing SKU', () => {
    const once = addLine([], line('A1', 2))
    expect(once).toHaveLength(1)
    expect(once[0]?.quantity).toBe(2)

    const twice = addLine(once, line('A1', 3))
    expect(twice).toHaveLength(1)
    expect(twice[0]?.quantity).toBe(5)
  })

  it('clamps the merged quantity instead of overflowing', () => {
    const merged = addLine([line('A1', 98)], line('A1', 5))
    expect(merged[0]?.quantity).toBe(MAX_QUANTITY_TEST)
  })

  it('changes and removes lines by SKU', () => {
    const cart = [line('A1'), line('B2', 2)]

    expect(setLineQuantity(cart, 'B2', 7)[1]?.quantity).toBe(7)
    expect(setLineQuantity(cart, 'B2', 0)[1]?.quantity).toBe(MIN_QUANTITY_TEST)
    expect(removeLine(cart, 'A1').map((entry) => entry.sku)).toEqual(['B2'])
  })

  it('counts units, not distinct lines', () => {
    expect(countUnits([line('A1', 3), line('B2', 4)])).toBe(7)
    expect(countUnits([])).toBe(0)
  })
})

describe('readStoredCart', () => {
  it('returns an empty cart when storage is unavailable', () => {
    expect(readStoredCart()).toEqual([])
  })

  it('drops rubbish entries and merges duplicate SKUs', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    })

    try {
      store.set(
        'ghostinc-cart',
        JSON.stringify([
          { sku: 'A1', quantity: 2, name: 'First' },
          { sku: 'A1', quantity: 3, name: 'Duplicate' },
          { quantity: 4 },
          'not-an-object',
          { sku: 'B2', quantity: 500 },
        ]),
      )

      const lines = readStoredCart()
      expect(lines).toHaveLength(2)
      expect(lines[0]).toMatchObject({ sku: 'A1', quantity: 5 })
      // Oversized stored quantity is clamped on read, not trusted.
      expect(lines[1]).toMatchObject({ sku: 'B2', quantity: MAX_QUANTITY_TEST })
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('quoteCart', () => {
  it('prices from the catalogue, never from the line snapshot', () => {
    const stale = { ...line('A1', 2), unit_price_cents: 100 }
    const quote = quoteCart([stale], [product('A1', 2_000)], null)

    expect(quote.subtotal_cents).toBe(4_000)
    expect(quote.item_count).toBe(2)
  })

  it('skips lines whose product has left the catalogue', () => {
    const quote = quoteCart([line('GONE', 4)], [product('A1', 2_000)], null)

    expect(quote.subtotal_cents).toBe(0)
    expect(quote.item_count).toBe(0)
    expect(quote.rows).toHaveLength(0)
  })

  it('applies the promo and reaches the same total the server computes', () => {
    const quote = quoteCart(
      [line('A1', 2)],
      [product('A1', 2_000)],
      { code: 'GHOST10', percent_off: 10 },
    )

    // 2 × R20 = R40 subtotal, 10% off = R4, then R99 delivery, then 15% VAT.
    expect(quote.subtotal_cents).toBe(4_000)
    expect(quote.discount_cents).toBe(400)
    expect(quote.shipping_cents).toBe(9_900)
    expect(quote.vat_cents).toBe(2_025)
    expect(quote.total_cents).toBe(15_525)
  })
})

