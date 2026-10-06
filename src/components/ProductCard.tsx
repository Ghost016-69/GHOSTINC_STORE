/**
 * A catalogue product as a clickable card: image, category, rating, price and
 * an add-to-cart button. Used by the home page rails, the shop grid and the
 * "More like this" rail on a product page — one card, so a price or stock
 * change can never render differently in two places.
 *
 * Adding to the cart does not re-price anything here: the button hands the
 * product to CartProvider, and every total is computed by quoteCart() later.
 */
import { Link } from 'react-router-dom'

import { productImageUrl } from '../lib/productImage'
import { useCart } from '../state/CartContext'
import type { CatalogProduct } from '../types/database'
import { formatCents } from '../utils/format'

export default function ProductCard({ product }: { product: CatalogProduct }) {
  const { add } = useCart()
  const image = productImageUrl(product.image_path)

  return (
    <article className="card flex flex-col overflow-hidden">
      <Link
        to={`/product/${product.slug}`}
        className="block border-b border-ghost-border bg-ghost-surface-soft"
      >
        {image ? (
          <img src={image} alt="" width={800} height={600} className="h-40 w-full object-cover" />
        ) : (
          <div className="h-40 w-full bg-gradient-to-br from-ghost-surface-soft to-ghost-bg" />
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs uppercase tracking-wider text-ghost-text-soft">
          {product.category ?? 'Uncategorised'}
          {product.brand ? ` · ${product.brand}` : ''}
        </p>

        <h3 className="mt-1 text-base font-bold leading-snug">
          <Link to={`/product/${product.slug}`} className="hover:text-brand">
            {product.name}
          </Link>
        </h3>

        {product.rating > 0 ? (
          <p className="mt-1 text-xs text-ghost-text-soft">
            <span className="text-brand" aria-hidden="true">★</span>{' '}
            {product.rating.toFixed(1)} ({product.rating_count})
          </p>
        ) : null}

        {product.short_description ? (
          <p className="mt-1 flex-1 text-sm text-ghost-text-soft">{product.short_description}</p>
        ) : (
          <div className="flex-1" />
        )}

        <p className="mt-3 text-xl font-extrabold">
          {formatCents(product.price_cents)}
          {product.is_on_sale && product.compare_at_cents ? (
            <span className="ml-2 text-sm font-normal text-ghost-text-soft line-through">
              {formatCents(product.compare_at_cents)}
            </span>
          ) : null}
        </p>

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="pill">
            {product.in_stock
              ? product.low_stock
                ? `Only ${product.stock} left`
                : 'In stock'
              : 'Sold out'}
          </span>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!product.in_stock}
            onClick={() => add(product)}
          >
            {product.in_stock ? 'Add to cart' : 'Sold out'}
          </button>
        </div>
      </div>
    </article>
  )
}
