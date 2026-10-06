/**
 * Home: hero, category rail, featured products and current deals.
 *
 * The legacy index.html fetched these in four separate API calls; here they
 * are slices of the one catalogue the CatalogueProvider already loaded.
 */
import { Link } from 'react-router-dom'

import CatalogueNotice from '../components/CatalogueNotice'
import ProductCard from '../components/ProductCard'
import { useCatalogue } from '../state/CatalogueContext'
import type { CatalogProduct } from '../types/database'

function byPriceAscending(a: CatalogProduct, b: CatalogProduct): number {
  return a.price_cents - b.price_cents || a.name.localeCompare(b.name)
}

export default function HomePage() {
  const { status, products, categories } = useCatalogue()

  const featured = products.filter((product) => product.is_featured).slice(0, 8)
  const deals = products.filter((product) => product.is_on_sale).sort(byPriceAscending).slice(0, 4)

  const countByCategory = new Map<string, number>()
  for (const product of products) {
    if (product.category_slug) {
      countByCategory.set(
        product.category_slug,
        (countByCategory.get(product.category_slug) ?? 0) + 1,
      )
    }
  }

  return (
    <>
      {/* Hero */}
      <section className="ink-canvas relative border-b border-ghost-border">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-16 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Electronics &amp; tech accessories</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Gear that earns its place on your desk.
            </h1>
            <p className="mt-4 max-w-xl text-ghost-text-soft">
              Phones, laptops, audio, gaming gear and the small accessories that make a setup
              work. Stocked in South Africa, priced in rands, and delivered free over R 2 500.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/shop" className="btn btn-primary">
                Shop the catalogue
              </Link>
              <Link to="/shop?on_sale=1" className="btn btn-ghost">
                See what is on sale
              </Link>
            </div>

            <dl className="mt-8 grid max-w-lg grid-cols-3 gap-4">
              <div>
                <dd className="text-2xl font-extrabold text-brand">
                  {status === 'ready' ? products.length : '—'}
                </dd>
                <dt className="text-xs text-ghost-text-soft">Products in stock</dt>
              </div>
              <div>
                <dd className="text-2xl font-extrabold text-brand">
                  {status === 'ready' ? categories.length : '—'}
                </dd>
                <dt className="text-xs text-ghost-text-soft">Categories</dt>
              </div>
              <div>
                <dd className="text-2xl font-extrabold text-brand">15%</dd>
                <dt className="text-xs text-ghost-text-soft">VAT included</dt>
              </div>
            </dl>
          </div>

          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-brand/20 to-transparent blur-3xl" />
            <img
              src={`${import.meta.env.BASE_URL}images/products/displays.svg`}
              alt=""
              width={800}
              height={600}
              className="relative hidden w-full rounded-2xl border border-ghost-border lg:block"
            />
          </div>
        </div>
      </section>

      {/* Category rail */}
      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="section-title">Shop by category</h2>
            <p className="section-intro">
              Eight aisles, from flagship handsets to the cable that finally charges everything
              at once.
            </p>
          </div>
          <Link to="/shop" className="link-more">
            Browse everything
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/shop?category=${category.slug}`}
              className="card-elevated p-4 transition-colors hover:border-brand"
            >
              <span className="text-2xl" aria-hidden="true">
                {category.icon ?? '▸'}
              </span>
              <h3 className="mt-2 font-bold">{category.name}</h3>
              <p className="text-xs text-ghost-text-soft">
                {countByCategory.get(category.slug) ?? 0} products
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured this week */}
      <section className="border-y border-ghost-border bg-ghost-surface">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="section-title">Featured this week</h2>
              <p className="section-intro">
                The pieces the shop would buy itself, pulled straight from the catalogue.
              </p>
            </div>
            <Link to="/shop?sort=featured" className="link-more">
              All featured
            </Link>
          </div>

          <div className="mt-4">
            <CatalogueNotice />
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* On sale */}
      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="section-title">
              On sale <span className="text-brand">right now</span>
            </h2>
            <p className="section-intro">
              Discounts come straight from the database, so what you see is what you pay.
            </p>
          </div>
          <Link to="/shop?on_sale=1" className="link-more">
            All sale items
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {deals.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {status === 'ready' && deals.length === 0 ? (
          <p className="mt-4 text-sm text-ghost-text-soft">Nothing is on sale right now.</p>
        ) : null}
      </section>
    </>
  )
}