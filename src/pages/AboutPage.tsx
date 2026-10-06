/**
 * About: the shop's own explanation of how it is built.
 *
 * Ported from Front-end/Templates/about.html, with the copy updated to
 * describe what actually exists now — the legacy text claimed "no framework,
 * no build step", which stopped being true the moment this app shipped.
 */
import { Link } from 'react-router-dom'

import { usePageTitle } from '../lib/usePageTitle'

export default function AboutPage() {
  usePageTitle('About the shop')

  return (
    <>
      <section className="ink-canvas border-b border-ghost-border bg-ghost-surface">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <p className="eyebrow">About the shop</p>
          <h1 className="page-title mt-3">A store front built to be taken apart.</h1>
          <p className="mt-4 max-w-3xl text-ghost-text-soft">
            GHOSTINC is a portfolio project: a real catalogue, a real database and a real
            checkout flow — a React app on GitHub Pages talking to Supabase, with every price
            computed in integer cents on both sides of the wire.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12">
        <h2 className="section-title">Two halves, cleanly split</h2>
        <p className="section-intro">
          The pages are static files served by GitHub Pages. Everything with a price on it
          comes from Postgres through Supabase's data API.
        </p>

<div className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="card-elevated p-5">
            <h3 className="font-bold">The front end</h3>
            <p className="mt-2 text-sm text-ghost-text-soft">
              React + Vite + TypeScript, built to static files and deployed by GitHub Actions.
              Seven routes — home, shop, product, cart, confirmation, about and contact —
              share one cart and one catalogue.
            </p>
          </article>

          <article className="card-elevated p-5">
            <h3 className="font-bold">The back end</h3>
            <p className="mt-2 text-sm text-ghost-text-soft">
              Supabase: PostgreSQL with Row Level Security on every table. The catalogue is
              readable by anyone; orders are written only through stored functions, and nobody
              can read someone else's order with the public key.
            </p>
          </article>

          <article className="card-elevated p-5">
            <h3 className="font-bold">The prices</h3>
            <p className="mt-2 text-sm text-ghost-text-soft">
              The browser stores what is in your cart, never what it costs. Totals are shown
              from <code className="text-brand">src/utils/pricing.ts</code> and then re-quoted
              by <code className="text-brand">place_order()</code> before the order exists, so
              a stale or edited cart cannot buy anything at the wrong price.
            </p>
          </article>
        </div>
      </section>

      <section className="border-y border-ghost-border bg-ink" id="api">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <h2 className="section-title">How the API works</h2>
          <p className="section-intro">
            The browser talks to two things: plain table reads for the catalogue, and stored
            functions for anything that writes.
          </p>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ghost-border text-ghost-text-soft">
                  <th className="py-2 pr-4 font-semibold">Call</th>
                  <th className="py-2 pr-4 font-semibold">What it does</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ghost-border">
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">from('products')</td>
                  <td className="py-2 pr-4">Active catalogue, with category and brand joined in</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">from('categories') / from('brands')</td>
                  <td className="py-2 pr-4">Filters for the shop page</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">from('promo_codes')</td>
                  <td className="py-2 pr-4">Codes the cart validates against</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">rpc('place_order')</td>
                  <td className="py-2 pr-4">
                    Re-prices the cart, validates stock and promo, writes the order, decrements
                    stock
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">rpc('lookup_order')</td>
                  <td className="py-2 pr-4">Reads one order by reference — the only way to read one</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">insert('contact_messages')</td>
                  <td className="py-2 pr-4">Saves a message; the table is write-only over the public key</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12">
        <h2 className="section-title">Demo data, honest limits</h2>
        <p className="section-intro">
          The catalogue is seeded by a versioned SQL migration, so it is reproducible rather
          than typed in by hand.
        </p>

        <div className="mt-6 flex flex-wrap gap-2 text-xs">
          <span className="pill">55 products</span>
          <span className="pill">8 categories</span>
          <span className="pill">14 brands</span>
          <span className="pill">3 promo codes</span>
          <span className="pill">VAT at 15%</span>
          <span className="pill">Free delivery over R 2 500</span>
        </div>

        <div className="notice mt-6 border-brand/40 bg-ink">
          <p>
            <strong className="text-ghost-text">What is not here.</strong> No payment gateway,
            no customer accounts, no live shipping rates and no real photography. Brands and
            prices are invented for the demo. Placing an order writes it to the database and
            reduces stock so the flow can be demonstrated end to end.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/shop" className="btn btn-primary">Look at the catalogue</Link>
          <Link to="/contact" className="btn btn-ghost">Ask a question</Link>
        </div>
      </section>
    </>
  )
}

