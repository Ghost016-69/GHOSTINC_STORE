/**
 * The chrome every page shares: announcement bar, header with primary nav and
 * cart badge, the routed page itself, and the footer.
 *
 * Replaces the markup that was copy-pasted into all seven legacy templates.
 * Every link is a react-router <Link> so navigation stays inside the SPA; the
 * router's basename (src/main.tsx) keeps them working under /GHOSTINC_STORE/.
 */
import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

import { useCart } from '../state/CartContext'

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/shop', label: 'Shop', end: false },
  { to: '/about', label: 'About', end: false },
  { to: '/contact', label: 'Contact', end: false },
] as const

export default function Layout() {
  const { itemCount } = useCart()
  const { pathname } = useLocation()

  // A new route is a new "page": start at the top, like a document load.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <div className="border-b border-ghost-border bg-ghost-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-6 gap-y-1 px-5 py-2 text-xs text-ghost-text-soft">
          <span>Free delivery over R 2 500</span>
          <span>
            Use <strong className="text-brand">GHOST10</strong> for 10% off
          </span>
          <span>Demo store — no real payments are taken</span>
        </div>
      </div>

      <header className="border-b border-ghost-border bg-ghost-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Link to="/" className="flex items-center" aria-label="GHOSTINC home">
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="GHOST INC."
              width={132}
              height={50}
              className="h-10 w-auto"
            />
          </Link>

          <nav aria-label="Primary">
            <ul className="flex items-center gap-5 text-sm font-semibold">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      isActive
                        ? 'text-brand'
                        : 'text-ghost-text-soft transition-colors hover:text-ghost-text'
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <Link
            to="/cart"
            className="relative rounded-lg border border-ghost-border px-3 py-2 text-sm hover:border-brand"
            aria-label={
              itemCount > 0
                ? `Open your cart, ${itemCount} item${itemCount === 1 ? '' : 's'}`
                : 'Open your cart'
            }
          >
            <span aria-hidden="true">🛒</span>
            {itemCount > 0 ? (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-xs font-bold text-brand-on">
                {itemCount}
              </span>
            ) : null}
          </Link>
        </div>
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-12 border-t border-ghost-border bg-ghost-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h2 className="text-base font-extrabold">GHOSTINC</h2>
            <p className="mt-2 text-sm text-ghost-text-soft">
              An online electronics shop built as a portfolio project: a React front end on
              GitHub Pages with a Supabase database behind it.
            </p>
          </div>

          <div>
            <h2 className="text-base font-extrabold">Shop</h2>
            <ul className="mt-2 space-y-1 text-sm text-ghost-text-soft">
              <li>
                <Link to="/shop" className="hover:text-brand">All products</Link>
              </li>
              <li>
                <Link to="/shop?on_sale=1" className="hover:text-brand">On sale</Link>
              </li>
              <li>
                <Link to="/shop?in_stock=1" className="hover:text-brand">In stock</Link>
              </li>
              <li>
                <Link to="/shop?sort=newest" className="hover:text-brand">Newest first</Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-base font-extrabold">Help</h2>
            <ul className="mt-2 space-y-1 text-sm text-ghost-text-soft">
              <li>
                <Link to="/cart" className="hover:text-brand">Your cart</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-brand">About the shop</Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-brand">Contact us</Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-base font-extrabold">Elsewhere</h2>
            <ul className="mt-2 space-y-1 text-sm text-ghost-text-soft">
              <li>
                <Link to="/about#api" className="hover:text-brand">How the API works</Link>
              </li>
              <li>
                <Link to="/confirmation" className="hover:text-brand">Find an order</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-ghost-border py-4 text-center text-xs text-ghost-text-soft">
          Demo store. Brands, prices and stock are invented for the project.
        </div>
      </footer>
    </div>
  )
}

