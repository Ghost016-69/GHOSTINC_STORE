/**
 * Order confirmation: /confirmation.
 *
 * Two ways in, both rendering the same receipt:
 *   1. Straight after checkout — CartPage passes the order through router
 *      state, so nothing is refetched.
 *   2. Reload or share — ?order=GH-123456 re-reads it through lookup_order()
 *      (orders has no SELECT policy on purpose; see migration 001).
 *
 * With neither, the page offers the reference form rather than a dead end.
 */
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import TotalsList, { type TotalsRow } from '../components/TotalsList'
import { lookupOrder, type DeliveryAddress, type OrderDetails } from '../lib/orders'
import { describeError, isConfigured } from '../lib/supabase'
import { usePageTitle } from '../lib/usePageTitle'
import { formatCents } from '../utils/format'

interface ConfirmationState {
  order?: OrderDetails
  address?: DeliveryAddress
  customer_name?: string
}

type Phase = 'loading' | 'ready' | 'missing' | 'error'

function formatWhen(iso: string | null): string {
  if (!iso) return 'just now'
  const parsed = new Date(iso)
  return Number.isNaN(parsed.getTime()) ? iso : parsed.toLocaleString()
}

export default function ConfirmationPage() {
  usePageTitle('Order confirmed')

  const location = useLocation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const orderParam = params.get('order')

  const carried = (location.state ?? null) as ConfirmationState | null
  const carriedOrder = carried?.order ?? null
  const address = carried?.address ?? null
  const customerName = carried?.customer_name ?? ''

  const [order, setOrder] = useState<OrderDetails | null>(carriedOrder)
  const [phase, setPhase] = useState<Phase>(
    carriedOrder ? 'ready' : orderParam ? 'loading' : 'missing',
  )
  const [error, setError] = useState('')
  const [reference, setReference] = useState('')

  useEffect(() => {
    if (carriedOrder || !orderParam) return

    let cancelled = false
    setError('')

    if (!isConfigured) {
      setPhase('error')
      setError('Supabase is not configured, so the order cannot be looked up.')
      return
    }

    lookupOrder(orderParam)
      .then((found) => {
        if (cancelled) return
        if (found) {
          setOrder(found)
          setPhase('ready')
        } else {
          setPhase('missing')
        }
      })
      .catch((caught: unknown) => {
        if (cancelled) return
        setError(describeError(caught))
        setPhase('error')
      })

    return () => {
      cancelled = true
    }
  }, [carriedOrder, orderParam])

  function lookupReference(event: FormEvent): void {
    event.preventDefault()
    const wanted = reference.trim().toUpperCase()
    if (wanted) {
      navigate(`/confirmation?order=${encodeURIComponent(wanted)}`)
    }
  }

  if (phase === 'loading') {
    return (
      <section className="mx-auto max-w-3xl px-5 py-16 text-center">
        <p className="text-ghost-text-soft">Looking up order {orderParam}…</p>
      </section>
    )
  }

  if (phase !== 'ready' && !order) {
    return (
      <section className="mx-auto max-w-3xl px-5 py-16">
        <div className="empty-state">
          <h1 className="text-xl font-bold">
            {phase === 'error' ? 'We cannot load that order' : 'We cannot find that order'}
          </h1>
          {error ? <p className="text-sm text-sale">{error}</p> : null}
          <p className="text-sm text-ghost-text-soft">
            Order references look like <strong className="text-brand">GH-4A7C21</strong>.
          </p>

          <form className="flex w-full max-w-sm gap-2" onSubmit={lookupReference}>
            <label className="sr-only" htmlFor="order-ref">Order reference</label>
            <input
              id="order-ref"
              className="input"
              placeholder="GH-4A7C21"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            />
            <button type="submit" className="btn btn-ghost btn-sm">Find</button>
          </form>

          <Link to="/shop" className="btn btn-primary">Back to the shop</Link>
        </div>
      </section>
    )
  }

  if (!order) {
    return null
  }

  const rows: TotalsRow[] = [
    { label: 'Subtotal', text: formatCents(order.subtotal_cents) },
    ...(order.discount_cents > 0
      ? [{ label: 'Discount', text: `−${formatCents(order.discount_cents)}`, muted: true }]
      : []),
    {
      label: 'Delivery',
      text: order.shipping_cents === 0 ? 'Free' : formatCents(order.shipping_cents),
    },
    { label: 'VAT (15%)', text: formatCents(order.vat_cents), muted: true },
  ]

  return (
    <section className="mx-auto max-w-4xl px-5 py-12">
      <p className="eyebrow">Order confirmed</p>
      <h1 className="page-title mt-2">
        Thank you — order <span className="text-brand">{order.order_number}</span>
      </h1>
      <p className="section-intro">
        A confirmation is on its way to{' '}
        <strong className="text-ghost-text">{order.customer_email}</strong>. This is a demo
        store: nothing actually ships and no money has changed hands.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="pill">Status: {order.status}</span>
        <span className="pill">Placed: {formatWhen(order.created_at)}</span>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="card p-5">
          <h2 className="text-base font-bold">What you ordered</h2>
          <ul className="mt-3 divide-y divide-ghost-border">
            {order.items.map((item, index) => (
              <li
                key={`${item.product_sku}-${index}`}
                className="flex items-baseline justify-between gap-4 py-3 text-sm"
              >
                <span>
                  <strong>{item.product_name}</strong>
                  <span className="text-ghost-text-soft">
                    {' '}× {item.quantity} at {formatCents(item.unit_price_cents)}
                  </span>
                </span>
                <span className="font-semibold">{formatCents(item.line_total_cents)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="text-base font-bold">Totals</h2>
            <div className="mt-3">
              <TotalsList rows={rows} totalText={formatCents(order.total_cents)} />
            </div>
          </div>

          <div className="card p-5">
            <h2 className="text-base font-bold">Delivering to</h2>
            <p className="mt-2 text-sm font-semibold">
              {customerName || order.customer_name}
            </p>
            {address ? (
              <address className="mt-1 text-sm not-italic text-ghost-text-soft">
                {address.line1}
                {address.line2 ? (
                  <>
                    <br />
                    {address.line2}
                  </>
                ) : null}
                <br />
                {address.city}
                {address.province ? `, ${address.province}` : ''} {address.postal_code}
              </address>
            ) : (
              <p className="mt-1 text-xs text-ghost-text-soft">
                Address held with the order — see your confirmation email.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/shop" className="btn btn-primary">Keep shopping</Link>
        <Link to="/contact" className="btn btn-ghost">Ask about this order</Link>
      </div>
    </section>
  )
}

