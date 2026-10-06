/**
 * Cart state for the whole app.
 *
 * The line list lives in React state and is mirrored into localStorage under
 * the same key the legacy site used, so the cart survives a reload and a
 * revisit. What is stored is only the display snapshot — totals are always
 * recomputed from the catalogue by quoteCart(); see src/state/cart.ts.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import type { CatalogProduct } from '../types/database'
import {
  addLine,
  clearStoredCart,
  clearStoredPromo,
  countUnits,
  readStoredCart,
  readStoredPromo,
  removeLine,
  setLineQuantity,
  writeStoredCart,
  writeStoredPromo,
  type CartLine,
} from './cart'
import { productImageUrl } from '../lib/productImage'

interface CartContextValue {
  /** Cart lines in insertion order. Quantities are already clamped. */
  lines: CartLine[]
  /** Units, not distinct lines — what the header badge shows. */
  itemCount: number
  /** Applied promo code, or '' for none. */
  promoCode: string

  add: (product: CatalogProduct, quantity?: number) => void
  setQuantity: (sku: string, quantity: number) => void
  remove: (sku: string) => void
  clear: () => void
  setPromoCode: (code: string) => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => readStoredCart())
  const [promoCode, setPromoState] = useState<string>(() => readStoredPromo())

  const add = useCallback((product: CatalogProduct, quantity = 1) => {
    setLines((current) => {
      const next = addLine(current, {
        sku: product.sku,
        quantity,
        slug: product.slug,
        name: product.name,
        brand: product.brand,
        image: productImageUrl(product.image_path),
        unit_price_cents: product.price_cents,
      })
      writeStoredCart(next)
      return next
    })
  }, [])

  const setQuantity = useCallback((sku: string, quantity: number) => {
    setLines((current) => {
      const next = setLineQuantity(current, sku, quantity)
      writeStoredCart(next)
      return next
    })
  }, [])

  const remove = useCallback((sku: string) => {
    setLines((current) => {
      const next = removeLine(current, sku)
      writeStoredCart(next)
      return next
    })
  }, [])

  const clear = useCallback(() => {
    setLines([])
    clearStoredCart()
  }, [])

  const setPromoCode = useCallback((code: string) => {
    setPromoState(code)
    if (code) {
      writeStoredPromo(code)
    } else {
      clearStoredPromo()
    }
  }, [])

  const itemCount = useMemo(() => countUnits(lines), [lines])

  const value = useMemo<CartContextValue>(
    () => ({ lines, itemCount, promoCode, add, setQuantity, remove, clear, setPromoCode }),
    [lines, itemCount, promoCode, add, setQuantity, remove, clear, setPromoCode],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const value = useContext(CartContext)
  if (!value) {
    throw new Error('useCart must be used inside <CartProvider>.')
  }
  return value
}

