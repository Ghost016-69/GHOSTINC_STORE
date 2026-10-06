/**
 * The banner a page shows while the catalogue is not ready: loading, missing
 * configuration, or a failed query.
 *
 * Every page that reads useCatalogue() renders this instead of inventing its
 * own wording, so "Supabase is not configured" means the same thing on every
 * route. Returns null when the catalogue is ready.
 */
import { useCatalogue } from '../state/CatalogueContext'

export default function CatalogueNotice() {
  const { status, error, reload } = useCatalogue()

  if (status === 'ready') {
    return null
  }

  if (status === 'loading') {
    return (
      <div className="card animate-pulse p-4">
        <p className="text-sm text-ghost-text-soft">Loading the catalogue…</p>
      </div>
    )
  }

  if (status === 'unconfigured') {
    return (
      <div className="notice border-brand/40" role="status">
        <p className="font-semibold text-ghost-text">Supabase is not configured yet.</p>
        <p className="mt-1">
          Copy <code className="text-brand">.env.example</code> to{' '}
          <code className="text-brand">.env.local</code>, fill in{' '}
          <code className="text-brand">VITE_SUPABASE_URL</code> and{' '}
          <code className="text-brand">VITE_SUPABASE_ANON_KEY</code>, then restart the dev
          server.
        </p>
      </div>
    )
  }

  return (
    <div className="notice border-sale/40" role="alert">
      <p className="font-semibold text-ghost-text">Could not reach Supabase.</p>
      {error ? <p className="mt-1 text-sale">{error}</p> : null}
      <button type="button" className="btn btn-ghost btn-sm mt-3" onClick={reload}>
        Try again
      </button>
    </div>
  )
}
