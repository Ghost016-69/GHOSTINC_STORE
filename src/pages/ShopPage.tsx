/**
 * The shop: filters, sorting and pagination over the loaded catalogue.
 *
 * Filter state lives in the URL query string rather than component state, for
 * the same reason the legacy page did it that way: a link like
 * `/shop?on_sale=1&sort=newest` is shareable, survives a refresh, and lets the
 * footer and home-page shortcuts deep-link straight into a filtered view.
 *
 * Filtering is client-side because the whole active catalogue is already in
 * memory (see CatalogueContext). Page size 12 and the sort keys match the
 * Django API (store/views.py::SORT_OPTIONS), so results order identically.
 */
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import CatalogueNotice from '../components/CatalogueNotice'
import ProductCard from '../components/ProductCard'
import { usePageTitle } from '../lib/usePageTitle'
import { useCatalogue } from '../state/CatalogueContext'
import type { CatalogProduct } from '../types/database'
import { parseCents } from '../utils/format'

/** Matches StorePagination.page_size in Back-end/store/views.py. */
const PAGE_SIZE = 12

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Best rated' },
  { value: 'newest', label: 'Newest first' },
  { value: 'name', label: 'Name A to Z' },
] as const

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])

/** Mirrors store/views.py::SORT_OPTIONS, applied client-side. */
function sorterFor(key: string): (a: CatalogProduct, b: CatalogProduct) => number {
  switch (key) {
    case 'price_asc':
      return (a, b) => a.price_cents - b.price_cents || a.name.localeCompare(b.name)
    case 'price_desc':
      return (a, b) => b.price_cents - a.price_cents || a.name.localeCompare(b.name)
    case 'rating':
      return (a, b) => b.rating - a.rating || b.rating_count - a.rating_count
    case 'newest':
      return (a, b) => b.created_at.localeCompare(a.created_at)
    case 'name':
      return (a, b) => a.name.localeCompare(b.name)
    default:
      return (a, b) =>
        Number(b.is_featured) - Number(a.is_featured) ||
        b.rating - a.rating ||
        a.name.localeCompare(b.name)
  }
}

export default function ShopPage() {
  usePageTitle('Shop')

  const { status, products, categories, brands } = useCatalogue()
  const [params, setParams] = useSearchParams()

  const search = params.get('search') ?? ''
  const category = params.get('category') ?? ''
  const selectedBrands = params.getAll('brand')
  const minPrice = params.get('min_price') ?? ''
  const maxPrice = params.get('max_price') ?? ''
  const inStockOnly = TRUE_VALUES.has(params.get('in_stock') ?? '')
  const onSaleOnly = TRUE_VALUES.has(params.get('on_sale') ?? '')
  const sort = params.get('sort') ?? 'featured'
  const requestedPage = Number.parseInt(params.get('page') ?? '1', 10)

  /** Merge changes into the query string; any filter change returns to page 1. */
  function update(patch: Record<string, string | string[] | null>): void {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      next.delete(key)
      if (value === null || value === '') continue
      if (Array.isArray(value)) {
        for (const entry of value) next.append(key, entry)
      } else {
        next.set(key, value)
      }
    }
    // Changing a filter restarts the listing — unless the patch IS the paging.
    if (!('page' in patch)) {
      next.delete('page')
    }
    setParams(next, { replace: true })
  }

  function toggleBrand(slug: string): void {
    const without = selectedBrands.filter((entry) => entry !== slug)
    update({ brand: selectedBrands.includes(slug) ? without : [...without, slug] })
  }

  const { filtered, pageCount, currentPage, pageItems } = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const minCents = parseCents(minPrice)
    const maxCents = parseCents(maxPrice)

    const filtered = products
      .filter((product) => {
        if (category && product.category_slug !== category) return false
        if (selectedBrands.length > 0 && !product.brand_slug) return false
        if (selectedBrands.length > 0 && !selectedBrands.includes(product.brand_slug ?? '')) {
          return false
        }
        if (minCents !== null && product.price_cents < minCents) return false
        if (maxCents !== null && product.price_cents > maxCents) return false
        if (inStockOnly && !product.in_stock) return false
        if (onSaleOnly && !product.is_on_sale) return false
        if (needle) {
          const haystack = [
            product.name,
            product.sku,
            product.category ?? '',
            product.brand ?? '',
          ]
            .join(' ')
            .toLowerCase()
          if (!haystack.includes(needle)) return false
        }
        return true
      })
      .sort(sorterFor(sort))

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const currentPage = Math.min(Math.max(1, requestedPage || 1), pageCount)
    const start = (currentPage - 1) * PAGE_SIZE

    return {
      filtered,
      pageCount,
      currentPage,
      pageItems: filtered.slice(start, start + PAGE_SIZE),
    }
  }, [
    products,
    search,
    category,
    selectedBrands,
    minPrice,
    maxPrice,
    inStockOnly,
    onSaleOnly,
    sort,
    requestedPage,
  ])

  const hasFilters =
    search !== '' ||
    category !== '' ||
    selectedBrands.length > 0 ||
    minPrice !== '' ||
    maxPrice !== '' ||
    inStockOnly ||
    onSaleOnly

  return (
    <section className="ink-canvas mx-auto max-w-6xl px-5 py-10">
      <h1 className="page-title">Shop</h1>
      <p className="section-intro">
        Every product in the shop, filtered and sorted in one place, so the counts and the
        totals always agree.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[16rem_1fr]">
        <aside className="card-elevated h-fit p-4" aria-label="Filter products">
          <div>
            <label className="label" htmlFor="shop-search">
              Search
            </label>
            <input
              id="shop-search"
              className="input"
              type="search"
              placeholder="Search products…"
              value={search}
              onChange={(event) => update({ search: event.target.value })}
            />
          </div>

          <fieldset className="mt-5">
            <legend className="label">Category</legend>
            <div className="space-y-1">
              <label className="check">
                <input
                  type="radio"
                  name="category"
                  checked={category === ''}
                  onChange={() => update({ category: null })}
                />
                <span>All categories</span>
              </label>
              {categories.map((entry) => (
                <label className="check" key={entry.id}>
                  <input
                    type="radio"
                    name="category"
                    checked={category === entry.slug}
                    onChange={() => update({ category: entry.slug })}
                  />
                  <span>{entry.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-5">
            <legend className="label">Brand</legend>
            <div className="space-y-1">
              {brands.map((entry) => (
                <label className="check" key={entry.id}>
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(entry.slug)}
                    onChange={() => toggleBrand(entry.slug)}
                  />
                  <span>{entry.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-5">
            <legend className="label">Price (R)</legend>
            <div className="flex gap-2">
              <input
                className="input"
                type="number"
                min={0}
                step={50}
                placeholder="Min"
                aria-label="Minimum price"
                value={minPrice}
                onChange={(event) => update({ min_price: event.target.value })}
              />
              <input
                className="input"
                type="number"
                min={0}
                step={50}
                placeholder="Max"
                aria-label="Maximum price"
                value={maxPrice}
                onChange={(event) => update({ max_price: event.target.value })}
              />
            </div>
          </fieldset>

          <fieldset className="mt-5">
            <legend className="label">Availability</legend>
            <div className="space-y-1">
              <label className="check">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={() => update({ in_stock: inStockOnly ? null : '1' })}
                />
                <span>In stock only</span>
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={onSaleOnly}
                  onChange={() => update({ on_sale: onSaleOnly ? null : '1' })}
                />
                <span>On sale only</span>
              </label>
            </div>
          </fieldset>

          <div className="mt-5">
            <button
              type="button"
              className="btn btn-ghost btn-block btn-sm"
              disabled={!hasFilters}
              onClick={() => setParams(new URLSearchParams(), { replace: true })}
            >
              Clear filters
            </button>
          </div>
        </aside>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ghost-text-soft" aria-live="polite">
              {status === 'ready'
                ? `${filtered.length} product${filtered.length === 1 ? '' : 's'}`
                : 'Loading…'}
            </p>
            <label className="flex items-center gap-2 text-sm">
              <span className="sr-only">Sort by</span>
              <select
                className="input w-auto"
                value={sort}
                onChange={(event) => update({ sort: event.target.value })}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4">
            <CatalogueNotice />
          </div>

          {status === 'ready' && pageItems.length === 0 ? (
            <div className="empty-state mt-4">
              <h2 className="text-lg font-bold">Nothing matches those filters</h2>
              <p className="text-sm text-ghost-text-soft">
                Try a wider price range, or clear the filters and start again.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setParams(new URLSearchParams(), { replace: true })}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {pageItems.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {pageCount > 1 ? (
            <nav className="mt-8 flex items-center justify-center gap-4" aria-label="Pagination">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={currentPage <= 1}
                onClick={() => update({ page: String(currentPage - 1) })}
              >
                Previous
              </button>
              <span className="text-sm text-ghost-text-soft">
                Page {currentPage} of {pageCount}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={currentPage >= pageCount}
                onClick={() => update({ page: String(currentPage + 1) })}
              >
                Next
              </button>
            </nav>
          ) : null}
        </div>
      </div>
    </section>
  )
}


