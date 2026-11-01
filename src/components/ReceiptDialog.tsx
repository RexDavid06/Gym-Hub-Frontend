import type { MembershipPayment } from '../api/types'
import type { Me } from '../api/types'
import { formatDate, formatDay } from '../lib/format'
import { formatNaira } from '../lib/money'
import { Button } from './ui'

/**
 * Printable receipt. The print stylesheet in style.css hides everything except
 * #receipt, so printing produces just the receipt itself.
 */
export function ReceiptDialog({
  payment,
  profile,
  onClose,
}: {
  payment: MembershipPayment
  profile: Me
  onClose: () => void
}) {
  const method = payment.method ?? 'cash'
  const methodLabel =
    method === 'pos' ? 'Card (POS)' : method.charAt(0).toUpperCase() + method.slice(1)

  return (
    <div
      className="receipt-overlay fixed inset-0 z-50 flex items-end justify-center bg-brand-navy/50 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="receipt-panel w-full max-w-md rounded-card bg-white p-6 shadow-2xl">
        <div className="no-print flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">
              Gym Hub
            </p>
            <h2 className="font-heading text-xl font-semibold text-brand-navy">Receipt</h2>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              payment.is_voided ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
            }`}
          >
            {payment.is_voided ? 'Voided' : 'Paid'}
          </span>
        </div>

        <div id="receipt" className="mt-4 rounded-xl border border-slate-200 p-5">
          <p className="font-heading text-lg font-semibold text-brand-navy">
            {profile.gym?.name ?? 'Gym Hub'}
          </p>
          <p className="mt-1 text-xs text-brand-muted">
            Receipt {payment.receipt_number} · {formatDate(payment.created_at)}
          </p>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-brand-muted">Member</dt>
              <dd className="text-right font-semibold text-brand-text">
                {payment.member.name || 'Unnamed member'}
                <span className="block text-xs font-normal text-brand-muted">
                  {payment.member.phone}
                </span>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-brand-muted">Amount</dt>
              <dd className="text-right font-semibold text-brand-navy">
                {formatNaira(payment.amount)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-brand-muted">Method</dt>
              <dd className="text-right text-brand-text">{methodLabel}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-brand-muted">Paid on</dt>
              <dd className="text-right text-brand-text">{formatDay(payment.paid_at)}</dd>
            </div>
            {payment.reference ? (
              <div className="flex justify-between gap-4">
                <dt className="text-brand-muted">Reference</dt>
                <dd className="text-right text-brand-text">{payment.reference}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-brand-muted">Recorded by</dt>
              <dd className="text-right text-brand-text">#{payment.recorded_by}</dd>
            </div>
          </dl>

          {payment.is_voided ? (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-800">
              <p className="font-semibold">Voided {formatDate(payment.voided_at)}</p>
              <p className="mt-1">{payment.void_reason}</p>
            </div>
          ) : null}
        </div>

        <div className="no-print mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => window.print()}>Print</Button>
        </div>
      </div>
    </div>
  )
}
