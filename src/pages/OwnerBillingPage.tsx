import { useCallback, useEffect, useState } from 'react'

import { ApiError, apiFetch, buildApiPath } from '../api/client'
import type {
  BillingPayment,
  GymBillingSubscription,
  Invoice,
  PaginatedInvoices,
  PaginatedPayments,
} from '../api/types'
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui'
import {
  intervalLabel,
  invoiceStatusTone,
  paymentMethodLabel,
  subscriptionStatusTone,
  titleCase,
} from '../lib/billing'
import { formatDate, formatDay } from '../lib/format'
import { formatNaira } from '../lib/money'

export function OwnerBillingPage() {
  const [subscription, setSubscription] = useState<GymBillingSubscription | null>(null)
  const [invoices, setInvoices] = useState<PaginatedInvoices | null>(null)
  const [payments, setPayments] = useState<PaginatedPayments | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [payingId, setPayingId] = useState<number | null>(null)
  const [paymentError, setPaymentError] = useState('')
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null)

  const returnedFromPaystack =
    /trk_reference|reference=/.test(window.location.hash) ||
    new URLSearchParams(window.location.search).has('trk_reference')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [subscriptionResult, invoiceResult, paymentResult] = await Promise.all([
        apiFetch('/api/billing/subscription/', 'get').catch((caught: unknown) => {
          if (caught instanceof ApiError && caught.status === 404) return null
          throw caught
        }),
        apiFetch('/api/billing/invoices/', 'get', { query: { page_size: 20 } }),
        apiFetch('/api/billing/payments/', 'get', { query: { page_size: 20 } }),
      ])
      setSubscription(subscriptionResult)
      setInvoices(invoiceResult)
      setPayments(paymentResult)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load billing.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const startCheckout = async (invoice: Invoice) => {
    setPayingId(invoice.id)
    setPaymentError('')
    try {
      const checkout = await apiFetch(
        buildApiPath('/api/billing/invoices/{id}/checkout/', { id: invoice.id }),
        'post',
      )
      window.location.assign(checkout.authorization_url)
    } catch (caught) {
      setPaymentError(caught instanceof Error ? caught.message : 'Unable to start payment.')
    } finally {
      setPayingId(null)
    }
  }

  const print = (invoice: Invoice) => {
    setPrintInvoice(invoice)
    window.requestAnimationFrame(() => window.print())
  }

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          title="Billing"
          description="Your Gym Hub plan, invoices, payment history, and balance."
        />
      </div>

      {returnedFromPaystack ? (
        <div
          role="status"
          className="rounded-card border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 print:hidden"
        >
          Payment received. Paystack is confirming the transaction; your invoice and balance update
          automatically when the webhook arrives.
        </div>
      ) : null}

      {loading ? <LoadingState label="Loading billing…" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {!loading && !error ? (
        <>
          {subscription ? (
            <Card className="print:hidden">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-heading text-xl font-semibold text-brand-navy">
                      {subscription.plan.name}
                    </h2>
                    <Badge tone={subscriptionStatusTone(subscription.status)}>
                      {titleCase(subscription.status)}
                    </Badge>
                    <Badge tone="navy">{subscription.plan.tier}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-brand-muted">
                    {intervalLabel(subscription.interval)} billing ·{' '}
                    {formatNaira(subscription.price.amount)} per period
                  </p>
                  <p className="mt-1 text-sm text-brand-muted">
                    Current period {formatDay(subscription.current_period_start)} –{' '}
                    {formatDay(subscription.current_period_end)}
                  </p>
                  {subscription.cancel_at_period_end ? (
                    <p className="mt-2 text-sm font-semibold text-amber-700">
                      This subscription is set to cancel at the end of the current period.
                    </p>
                  ) : null}
                </div>
                <div className="rounded-xl bg-slate-50 p-4 text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                    Outstanding balance
                  </p>
                  <p className="mt-1 font-heading text-2xl font-semibold text-brand-navy">
                    {formatNaira(subscription.balance)}
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <EmptyState
              title="No billing plan yet"
              description="Your gym does not have a billing subscription. Contact Gym Hub support to get set up."
            />
          )}

          <Card className="print:hidden">
            <h2 className="font-heading text-lg font-semibold text-brand-navy">Invoices</h2>
            {paymentError ? (
              <p role="alert" className="mt-3 text-sm text-brand-danger">
                {paymentError}
              </p>
            ) : null}
            {!invoices || invoices.results.length === 0 ? (
              <p className="mt-3 text-sm text-brand-muted">No invoices have been issued yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-brand-muted">
                    <tr>
                      <th className="py-2 pr-4 font-semibold">Invoice</th>
                      <th className="py-2 pr-4 font-semibold">Period</th>
                      <th className="py-2 pr-4 font-semibold">Due</th>
                      <th className="py-2 pr-4 font-semibold">Amount</th>
                      <th className="py-2 pr-4 font-semibold">Balance</th>
                      <th className="py-2 pr-4 font-semibold">Status</th>
                      <th className="py-2 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.results.map((invoice) => {
                      const payable = invoice.status !== 'paid' && invoice.status !== 'void'
                      return (
                        <tr key={invoice.id}>
                          <td className="py-3 pr-4">
                            <p className="font-semibold text-brand-navy">{invoice.number}</p>
                            <p className="text-xs text-brand-muted">{invoice.plan_name}</p>
                          </td>
                          <td className="py-3 pr-4 text-brand-muted">
                            {formatDay(invoice.period_start)} – {formatDay(invoice.period_end)}
                          </td>
                          <td className="py-3 pr-4 text-brand-muted">{formatDay(invoice.due_at)}</td>
                          <td className="py-3 pr-4 font-semibold text-brand-text">
                            {formatNaira(invoice.amount)}
                          </td>
                          <td className="py-3 pr-4 font-semibold text-brand-text">
                            {formatNaira(invoice.balance)}
                            {invoice.is_overpaid ? (
                              <p className="mt-1">
                                <Badge tone="warning">Overpaid</Badge>
                              </p>
                            ) : null}
                          </td>
                          <td className="py-3 pr-4">
                            <Badge tone={invoiceStatusTone(invoice.status)}>
                              {titleCase(invoice.status)}
                            </Badge>
                          </td>
                          <td className="py-3">
                            <div className="flex flex-wrap gap-2">
                              <Button variant="secondary" onClick={() => print(invoice)}>
                                Print
                              </Button>
                              {payable ? (
                                <Button
                                  loading={payingId === invoice.id}
                                  onClick={() => void startCheckout(invoice)}
                                >
                                  Pay now
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="print:hidden">
            <h2 className="font-heading text-lg font-semibold text-brand-navy">Payment history</h2>
            {!payments || payments.results.length === 0 ? (
              <p className="mt-3 text-sm text-brand-muted">No payments recorded yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100">
                {payments.results.map((payment: BillingPayment) => (
                  <li
                    key={payment.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-brand-navy">
                        {formatNaira(payment.amount)} · {paymentMethodLabel(payment.method)}
                      </p>
                      <p className="text-xs text-brand-muted">
                        {payment.invoice?.number ? `${payment.invoice.number} · ` : ''}
                        {formatDate(payment.paid_at)}
                      </p>
                    </div>
                    <Badge tone={payment.is_voided ? 'danger' : 'success'}>
                      {payment.is_voided ? 'Void' : 'Paid'}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      ) : null}

      {printInvoice ? (
        <section className="hidden print:block" aria-hidden="true">
          <h1 className="font-heading text-2xl font-semibold">Gym Hub invoice</h1>
          <p className="mt-1 text-sm">{printInvoice.number}</p>
          <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <dt>Gym</dt>
            <dd>{printInvoice.gym.name}</dd>
            <dt>Plan</dt>
            <dd>{printInvoice.plan_name}</dd>
            <dt>Period</dt>
            <dd>
              {formatDay(printInvoice.period_start)} – {formatDay(printInvoice.period_end)}
            </dd>
            <dt>Issued</dt>
            <dd>{formatDay(printInvoice.issued_at)}</dd>
            <dt>Due</dt>
            <dd>{formatDay(printInvoice.due_at)}</dd>
            <dt>Amount</dt>
            <dd>{formatNaira(printInvoice.amount)}</dd>
            <dt>Paid</dt>
            <dd>{formatNaira(printInvoice.amount_paid)}</dd>
            <dt>Balance</dt>
            <dd>{formatNaira(printInvoice.balance)}</dd>
            <dt>Status</dt>
            <dd>{titleCase(printInvoice.status)}</dd>
          </dl>
          {printInvoice.notes ? <p className="mt-4 text-sm">{printInvoice.notes}</p> : null}
        </section>
      ) : null}
    </div>
  )
}
