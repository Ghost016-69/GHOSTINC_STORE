/**
 * The money block: a list of labelled rows and a bold total.
 *
 * Both the cart summary and the order confirmation render through this, and
 * both are handed integer-cent strings already formatted by formatCents() —
 * the component does no arithmetic of its own, so there is nowhere for a float
 * to creep in (see .clinerules, "Money").
 */

export interface TotalsRow {
  label: string
  /** Pre-formatted text: "R 2 499.00", "Free", "—" . */
  text: string
  /** Drop the value to a quiet tone (discounts, VAT detail). */
  muted?: boolean
}

interface TotalsListProps {
  rows: TotalsRow[]
  totalText: string
  totalLabel?: string
}

export default function TotalsList({
  rows,
  totalText,
  totalLabel = 'Total',
}: TotalsListProps) {
  return (
    <dl className="space-y-2 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-4">
          <dt className={row.muted ? 'text-ghost-text-soft' : 'text-ghost-text'}>{row.label}</dt>
          <dd className={row.muted ? 'text-ghost-text-soft' : 'text-ghost-text'}>{row.text}</dd>
        </div>
      ))}

      <div className="flex items-baseline justify-between gap-4 border-t border-ghost-border pt-3">
        <dt className="text-base font-bold">{totalLabel}</dt>
        <dd className="text-lg font-extrabold text-brand">{totalText}</dd>
      </div>
    </dl>
  )
}
