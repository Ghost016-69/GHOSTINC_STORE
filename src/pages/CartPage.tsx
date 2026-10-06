/**
 * Cart: line items, promo code and the delivery/checkout form.
 *
 * Everything priced here goes through quoteCart() → calculateCartQuote(), so
 * the number on screen is the same integer-cent arithmetic the server will
 * re-run in place_order(). The form does not send prices at all — only SKUs
 * and quantities — because the server prices from the `products` table.
 */
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import CatalogueNotice from '../components/CatalogueNotice'
import TotalsList, { type TotalsRow } from '../components/TotalsList'
import { placeOrder, type DeliveryAddress } from '../lib/orders'
import { usePageTitle } from '../lib/usePageTitle'
import { clampQuantity, quoteCart, resolveLine, type CartLine } from '../state/cart'
import { useCart } from '../state/CartContext'
import { useCatalogue } from '../state/CatalogueContext'
import type { CatalogProduct } from '../types/database'
import { formatCents } from '../utils/format'
import {
  checkPromoCode,
  FREE_SHIPPING_THRESHOLD_CENTS,
  isPromoValid,
  type PromoCode,
} from '../utils/pricing'

interface CheckoutForm {
  first_name: string
  last_name: string
  email: string
  phone: string
  address_line1: string
  address_line2: string
  city: string
  province: string
  postal_code: string
  notes: string
}

const EMPTY_FORM: CheckoutForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  province: '',
  postal_code: '',
  notes: '',
}

export default function CartPage() {
  usePageTitle('Your cart')

  const { lines, promoCode, setQuantity, remove, clear, setPromoCode } = useCart()
  const { status, products, promos } = useCatalogue()
  const navigate = useNavigate()

  const [promoInput, setPromoInput] = useState('')
  const [promoMessage, setPromoMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [form, setForm] = useState<CheckoutForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')

  /**
   * The stored code only counts if it is still in the catalogue AND still
   * valid — exactly the test place_order() runs server-side.
   */
  const promo: PromoCode | null = useMemo(() => {
    const match = promos.find(
      (candidate) => candidate.code.toUpperCase() === promoCode.toUpperCase(),
    )
    return match && isPromoValid(match) ? match : null
  }, [promos, promoCode])

  const quote = useMemo(() => quoteCart(lines, products, promo), [lines, products, promo])

  /** Lines paired with their catalogue row; `product` null means it vanished. */
  const resolved = useMemo(
    () => lines.map((line) => ({ line, product: resolveLine(line, products) })),
    [lines, products],
  )

  const available = resolved.filter(
    (entry): entry is { line: CartLine; product: CatalogProduct } => entry.product !== null,
  )
  const missing = resolved.filter((entry) => entry.product === null)

  const rows: TotalsRow[] = [
    { label: 'Subtotal', text: formatCents(quote.subtotal_cents) },
    ...(quote.discount_cents > 0
      ? [
          {
            label: promo ? `Discount (${promo.code})` : 'Discount',
            text: `−${formatCents(quote.discount_cents)}`,
            muted: true,
          },
        ]
      : []),
    {
      label: 'Delivery',
      text:
        quote.item_count > 0 && quote.shipping_cents === 0
          ? 'Free'
          : formatCents(quote.shipping_cents),
    },
    { label: 'VAT (15%)', text: formatCents(quote.vat_cents), muted: true },
  ]

  /** Rands still needed for free delivery — judged on the discounted value. */
  const freeShippingGap =
    quote.item_count > 0 && quote.shipping_cents > 0
      ? FREE_SHIPPING_THRESHOLD_CENTS - (quote.subtotal_cents - quote.discount_cents)
      : 0

  function setField(field: keyof CheckoutForm, value: string): void {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function applyPromo(event: FormEvent): void {
    event.preventDefault()
    const check = checkPromoCode(promoInput, promos)
    if (!check.valid) {
      setPromoMessage({ ok: false, text: check.detail ?? 'That promo code is not valid.' })
      return
    }
    setPromoCode(check.code)
    setPromoInput(check.code)
    setPromoMessage({
      ok: true,
      text: `${check.code} applied — ${check.promo?.percent_off ?? 0}% off.`,
    })
  }

  function clearPromo(): void {
    setPromoCode('')
    setPromoInput('')
    setPromoMessage(null)
  }

  /**
   * Place the order. Only SKUs, quantities and delivery details leave the
   * browser: the server re-prices, re-validates the promo and decrements
   * stock, and answers with the canonical order (see lib/orders.ts).
   */
  async function submitOrder(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setCheckoutError('')

    if (available.length === 0) {
      setCheckoutError('Your cart is empty.')
      return
    }

    const email = form.email.trim()
    const name = `${form.first_name.trim()} ${form.last_name.trim()}`.trim()
    if (!name || !email.includes('@')) {
      setCheckoutError('A name and a valid email address are required.')
      return
    }
    if (!form.address_line1.trim() || !form.city.trim() || !form.postal_code.trim()) {
      setCheckoutError('A street address, city and postal code are required.')
      return
    }

    const address: DeliveryAddress = {
      line1: form.address_line1.trim(),
      city: form.city.trim(),
      postal_code: form.postal_code.trim(),
      line2: form.address_line2.trim() || undefined,
      province: form.province.trim() || undefined,
      phone: form.phone.trim() || undefined,
      notes: form.notes.trim() || undefined,
    }

    setSubmitting(true)
    try {
      const order = await placeOrder({
        email,
        name,
        address,
        items: available.map(({ line, product }) => ({
          sku: product.sku,
          quantity: line.quantity,
        })),
        promoCode: promo ? promo.code : null,
      })

      // The order exists now: empty the cart and hand over the receipt.
      clear()
      setPromoCode('')
      setPromoInput('')
      setPromoMessage(null)
      setForm(EMPTY_FORM)

      navigate('/confirmation', { state: { order, address, customer_name: name } })
    } catch (caught) {
      setCheckoutError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="page-title">Your cart</h1>
      <p className="section-intro">
        Prices, delivery and VAT are quoted from the catalogue, so the total you see here is
        the total that gets ordered.
      </p>

      <div className="mt-6">
        <CatalogueNotice />
      </div>

      {promoCode && !promo ? (
        <p className="notice mt-4 text-sale">
          The promo code <strong>{promoCode}</strong> is no longer valid and was not applied.
        </p>
      ) : null}

      {lines.length === 0 ? (
        <div className="empty-state mt-6">
          <h2 className="text-xl font-bold">Your cart is empty</h2>
          <p className="text-sm text-ghost-text-soft">
            Add something worth plugging in and it will appear here.
          </p>
          <Link to="/shop" className="btn btn-primary">Browse the shop</Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_22rem]">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-ghost-text-soft" aria-live="polite">
                {quote.item_count} item{quote.item_count === 1 ? '' : 's'}
              </p>
              <Link to="/shop" className="link-more">Keep shopping</Link>
            </div>

            <ul className="mt-3 space-y-3">
              {resolved.map(({ line, product }) => (
                <li key={line.sku} className="card flex flex-wrap items-center gap-4 p-4">
                  {line.image ? (
                    <img
                      src={line.image}
                      alt=""
                      width={96}
                      height={72}
                      className="h-16 w-24 rounded object-cover"
                    />
                  ) : null}

                  <div className="min-w-0 flex-1">
                    {product ? (
                      <Link
                        to={`/product/${product.slug}`}
                        className="font-semibold hover:text-brand"
                      >
                        {product.name}
                      </Link>
                    ) : (
                      <p className="font-semibold text-ghost-text-soft">{line.name}</p>
                    )}
                    <p className="text-xs text-ghost-text-soft">
                      SKU {line.sku}
                      {product ? ` · ${formatCents(product.price_cents)} each` : ''}
                    </p>
                    {!product ? (
                      <p className="mt-1 text-xs text-sale">
                        No longer available — remove it to continue.
                      </p>
                    ) : null}
                  </div>

                  {product ? (
                    <div className="flex items-center rounded-lg border border-ghost-border">
                      <button
                        type="button"
                        className="px-3 py-1.5"
                        aria-label={`Decrease quantity of ${product.name}`}
                        onClick={() => setQuantity(line.sku, clampQuantity(line.quantity - 1))}
                      >
                        −
                      </button>
                      <input
                        className="w-10 border-x border-ghost-border bg-transparent py-1.5 text-center text-sm"
                        inputMode="numeric"
                        aria-label={`Quantity of ${product.name}`}
                        value={line.quantity}
                        onChange={(event) =>
                          setQuantity(line.sku, Number.parseInt(event.target.value, 10) || 1)
                        }
                      />
                      <button
                        type="button"
                        className="px-3 py-1.5"
                        aria-label={`Increase quantity of ${product.name}`}
                        onClick={() => setQuantity(line.sku, clampQuantity(line.quantity + 1))}
                      >
                        +
                      </button>
                    </div>
                  ) : null}

                  <p className="w-24 text-right font-bold">
                    {product ? formatCents(product.price_cents * line.quantity) : '—'}
                  </p>

                  <button
                    type="button"
                    className="link-more"
                    onClick={() => remove(line.sku)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>

            {missing.length > 0 ? (
              <p className="mt-3 text-xs text-ghost-text-soft">
                {missing.length} line{missing.length === 1 ? '' : 's'} excluded from the total
                because the product is no longer in the catalogue.
              </p>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="card p-4">
              <h2 className="text-base font-bold">Order summary</h2>

              <div className="mt-3">
                <TotalsList rows={rows} totalText={formatCents(quote.total_cents)} />
              </div>

              {freeShippingGap > 0 ? (
                <p className="mt-3 text-xs text-ghost-text-soft">
                  Add {formatCents(freeShippingGap)} more for free delivery.
                </p>
              ) : null}

              <form className="mt-4 flex gap-2" onSubmit={applyPromo}>
                <label className="sr-only" htmlFor="promo">Promo code</label>
                <input
                  id="promo"
                  className="input"
                  placeholder="Promo code, e.g. GHOST10"
                  autoComplete="off"
                  value={promoInput}
                  onChange={(event) => setPromoInput(event.target.value)}
                />
                <button type="submit" className="btn btn-ghost btn-sm">Apply</button>
              </form>

              <p
                className={`form-status mt-1 ${promoMessage?.ok ? 'text-brand' : 'text-sale'}`}
                role="status"
              >
                {promoMessage ? promoMessage.text : ''}
              </p>

              {promo ? (
                <button type="button" className="link-more" onClick={clearPromo}>
                  Remove {promo.code}
                </button>
              ) : null}
            </div>

            <form className="card space-y-3 p-4" onSubmit={submitOrder}>
              <h2 className="text-base font-bold">Delivery details</h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="first_name">First name</label>
                  <input
                    id="first_name"
                    className="input"
                    autoComplete="given-name"
                    required
                    value={form.first_name}
                    onChange={(event) => setField('first_name', event.target.value)}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="last_name">Last name</label>
                  <input
                    id="last_name"
                    className="input"
                    autoComplete="family-name"
                    required
                    value={form.last_name}
                    onChange={(event) => setField('last_name', event.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="email">Email</label>
                  <input
                    id="email"
                    className="input"
                    type="email"
                    autoComplete="email"
                    required
                    value={form.email}
                    onChange={(event) => setField('email', event.target.value)}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="phone">Phone</label>
                  <input
                    id="phone"
                    className="input"
                    type="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(event) => setField('phone', event.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="address_line1">Street address</label>
                <input
                  id="address_line1"
                  className="input"
                  autoComplete="address-line1"
                  required
                  value={form.address_line1}
                  onChange={(event) => setField('address_line1', event.target.value)}
                />
              </div>

              <div>
                <label className="label" htmlFor="address_line2">Address line 2</label>
                <input
                  id="address_line2"
                  className="input"
                  autoComplete="address-line2"
                  value={form.address_line2}
                  onChange={(event) => setField('address_line2', event.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="city">City</label>
                  <input
                    id="city"
                    className="input"
                    autoComplete="address-level2"
                    required
                    value={form.city}
                    onChange={(event) => setField('city', event.target.value)}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="province">Province</label>
                  <input
                    id="province"
                    className="input"
                    autoComplete="address-level1"
                    value={form.province}
                    onChange={(event) => setField('province', event.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="postal_code">Postal code</label>
                <input
                  id="postal_code"
                  className="input"
                  autoComplete="postal-code"
                  required
                  value={form.postal_code}
                  onChange={(event) => setField('postal_code', event.target.value)}
                />
              </div>

              <div>
                <label className="label" htmlFor="notes">Delivery notes</label>
                <textarea
                  id="notes"
                  className="textarea"
                  placeholder="Gate code, best time to deliver…"
                  value={form.notes}
                  onChange={(event) => setField('notes', event.target.value)}
                />
              </div>

              <p className="form-status text-sale" role="alert">{checkoutError}</p>

              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={submitting || status === 'loading'}
              >
                {submitting ? 'Placing order…' : 'Place order'}
              </button>

              <p className="field-hint">
                No payment is taken. The order is written to Supabase and stock is reduced, so
                the demo behaves like the real thing — and the server re-prices the cart before
                it accepts it.
              </p>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}




