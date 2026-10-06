/**
 * Catch-all for any path that is not a route: the SPA equivalent of a 404.
 * The server-side bounce (public/404.html) hands unknown URLs to the app, so
 * this is what people actually see when they mistype a link.
 */
import { Link } from 'react-router-dom'

import { usePageTitle } from '../lib/usePageTitle'

export default function NotFoundPage() {
  usePageTitle('Page not found')

  return (
    <section className="mx-auto max-w-3xl px-5 py-16">
      <div className="empty-state">
        <p className="eyebrow">404</p>
        <h1 className="text-2xl font-extrabold">We cannot find that page</h1>
        <p className="text-sm text-ghost-text-soft">
          The link may be old, or the product behind it may have been removed.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn btn-ghost">Back to home</Link>
          <Link to="/shop" className="btn btn-primary">Browse the shop</Link>
        </div>
      </div>
    </section>
  )
}
