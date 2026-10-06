/**
 * Product detail: /product/:slug.
 *
 * The legacy page asked the API for one product and its related items; here
 * the same thing is a lookup in the loaded catalogue, with related items taken
 * from the same category. Quantity is clamped by the shared cart rules, and
 * adding to cart never trusts the displayed price — the cart re-prices.
 */
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import CatalogueNotice from '../components/CatalogueNotice'
import ProductCard from '../components/ProductCard'
import { productImageUrl } from '../lib/productImage'
import { usePageTitle } from '../lib/usePageTitle'
import { clampQuantity } from '../state/cart'
import { useCart } from '../state/CartContext'
import { useCatalogue } from '../state/CatalogueContext'
import { formatCents } from '../utils/format'

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>()
  const { status, products } = useCatalogue()
  const { add } = useCart()

  const [quantity, setQuantity] = useState(1)
  const [addedNote, setAddedNote] = useState('')

  const product = useMemo(
    () => products.find((candidate) => candidate.slug === slug) ?? null,
    [products, slug],
  )

  const related = useMemo(() => {
    if (!product || !product.category_slug) return []
    return products
      .filter(
        (candidate) =>
          candidate.slug !== product.slug &&
          candidate.category_slug === product.category_slug,
      )
      .slice(0, 4)
  }, [products, product])

  usePageTitle(product ? product.name : 'Product')

  const image = product ? productImageUrl(product.image_path) : null

  return (
    <section className="ink-canvas mx-auto max-w-6xl px-5 py-10">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap gap-2 text-sm text-ghost-text-soft">
          <li>
            <Link to="/" className="hover:text-brand">Home</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link to="/shop" className="hover:text-brand">Shop</Link>
          </li>
          {product?.category ? (
            <>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  to={`/shop?category=${product.category_slug ?? ''}`}
                  className="hover:text-brand"
                >
                  {product.category}
                </Link>
              </li>
            </>
          ) : null}
        </ol>
      </nav>

      <div className="mt-6">
        <CatalogueNotice />
      </div>

      {status === 'ready' && !product ? (
        <div className="empty-state mt-4">
          <h1 className="text-xl font-bold">We cannot show that product</h1>
          <p className="text-sm text-ghost-text-soft">
            It may have been removed from the catalogue, or the link is wrong.
          </p>
          <Link to="/shop" className="btn btn-primary">Back to the shop</Link>
        </div>
      ) : null}

      {product ? (
        <>
          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            <figure className="card-elevated overflow-hidden">
              {image ? (
                <img src={image} alt="" width={800} height={600} className="w-full object-cover" />
              ) : (
                <div className="aspect-[4/3] w-full bg-gradient-to-br from-ghost-surface-soft to-ink" />
              )}
            </figure>

            <div>
              <p className="text-xs uppercase tracking-wider text-ghost-text-soft">
                {[product.brand, product.category].filter(Boolean).join(' · ')}
              </p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{product.name}</h1>

              {product.rating > 0 ? (
                <p className="mt-2 text-sm text-ghost-text-soft">
                  <span className="text-brand" aria-hidden="true">★</span>{' '}
                  {product.rating.toFixed(1)} out of 5 · {product.rating_count} reviews
                </p>
              ) : null}

              <p className="mt-4 text-3xl font-extrabold">
                {formatCents(product.price_cents)}
                {product.is_on_sale && product.compare_at_cents ? (
                  <span className="ml-3 text-lg font-normal text-ghost-text-soft line-through">
                    {formatCents(product.compare_at_cents)}
                  </span>
                ) : null}
                {product.discount_percent > 0 ? (
                  <span className="ml-3 text-sm font-semibold text-sale">
                    {product.discount_percent}% off
                  </span>
                ) : null}
              </p>

              <p className="mt-3">
                <span className="pill">
                  {product.in_stock
                    ? product.low_stock
                      ? `Only ${product.stock} left in stock`
                      : 'In stock'
                    : 'Sold out'}
                </span>
              </p>

              {product.short_description ? (
                <p className="mt-4 text-ghost-text-soft">{product.short_description}</p>
              ) : null}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <div className="flex items-center rounded-lg border border-ghost-border bg-ghost-surface">
                  <button
                    type="button"
                    className="px-3 py-2 text-lg"
                    aria-label="Decrease quantity"
                    onClick={() => setQuantity((current) => clampQuantity(current - 1))}
                  >
                    −
                  </button>
                  <label className="sr-only" htmlFor="qty">Quantity</label>
                  <input
                    id="qty"
                    className="w-12 border-x border-ghost-border bg-transparent py-2 text-center"
                    inputMode="numeric"
                    value={quantity}
                    onChange={(event) =>
                      setQuantity(clampQuantity(Number.parseInt(event.target.value, 10) || 1))
                    }
                  />
                  <button
                    type="button"
                    className="px-3 py-2 text-lg"
                    aria-label="Increase quantity"
                    onClick={() => setQuantity((current) => clampQuantity(current + 1))}
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!product.in_stock}
                  onClick={() => {
                    add(product, quantity)
                    setAddedNote(`Added ${quantity} × ${product.name} to your cart.`)
                  }}
                >
                  {product.in_stock ? 'Add to cart' : 'Sold out'}
                </button>
              </div>

              <p className="form-status mt-2 text-brand" role="status">
                {addedNote ? (
                  <>
                    {addedNote}{' '}
                    <Link to="/cart" className="underline hover:text-brand-strong">View cart</Link>
                  </>
                ) : null}
              </p>

              <ul className="mt-6 space-y-1 text-sm text-ghost-text-soft">
                <li>Free delivery on orders over R 2 500</li>
                <li>Two-year warranty on every item</li>
                <li>All prices include 15% VAT</li>
              </ul>

              <h2 className="mt-8 text-base font-bold">Overview</h2>
              <p className="mt-2 text-ghost-text-soft">
                {product.description ?? product.short_description ?? 'No description yet.'}
              </p>

              <h2 className="mt-6 text-base font-bold">Specifications</h2>
              <dl className="mt-2 divide-y divide-ghost-border text-sm">
                {Object.entries(product.specs).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-4 py-2">
                    <dt className="text-ghost-text-soft">{key}</dt>
                    <dd className="text-right">{value}</dd>
                  </div>
                ))}
              </dl>

              <p className="mt-4 text-xs text-ghost-text-soft">SKU {product.sku}</p>
            </div>
          </div>

          {related.length > 0 ? (
            <section className="mt-12 border-t border-ghost-border pt-10">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <h2 className="section-title">More like this</h2>
                <Link to="/shop" className="link-more">See the whole shop</Link>
              </div>
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {related.map((candidate) => (
                  <ProductCard key={candidate.id} product={candidate} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </section>
  )
}


