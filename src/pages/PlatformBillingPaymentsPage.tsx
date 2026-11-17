import { useCallback, useEffect, useState } from 'react'

import { apiFetch, buildApiPath } from '../api/client'
import type {
  BillingPayment,
  BillingPaymentMethod,
  PaginatedPayments,
} from '../api/types'
import { BillingTabs } from '../components/BillingTabs'
import { Pagination } from '../components/Pagination'
import { ReasonDialog } from '../components/ReasonDialog'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  PageHeader,
} from '../components/ui'
import { billingPaymentMethods, paymentMethodLabel, titleCase } from '../lib/billing'
import { formatDate } from '../lib/format'
import { formatNaira, isPositiveAmount, toDecimalString } from '../lib/money'

const PAGE_SIZE = 10

export function PlatformBillingPaymentsPage() {
  const [data, setData] = useState<PaginatedPayments | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [refresh, setRefresh] = useState(0)

  const [invoiceId, setInvoiceId] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<BillingPaymentMethod>('transfer')
  const [reference, setReference] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await apiFetch('/api/platform/billing/payments/', 'get', {
        query: { page, page_size: PAGE_SIZE },
      })
      setData(result)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load payments.')
    } finally {
      setLoading(false)
    }
  }, [page, refresh])

  useEffect(() => {
    void load()
  }, [load])

  const recordPayment = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      await apiFetch('/api/platform/billing/payments/', 'post', {
        body: {
          invoice_id: Number(invoiceId),
          ...(amount ? { amount: toDecimalString(amount) } : {}),
          method,
          reference: reference.trim(),
        },
      })
      setInvoiceId('')
      setAmount('')
      setReference('')
      setRefresh((value) => value + 1)
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Unable to record this payment.')
    } finally {
      setSaving(false)
    }
  }

  const total = data?.count ?? 0
  const pageCount = Math.max(Math.ceil(total / PAGE_SIZE), 1)
  const firstRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const lastRow = Math.min(page * PAGE_SIZE, total)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing payments"
        description="Record offline payments, review provider payments, and void mistakes with a reason."
      />
      <BillingTabs />

      <Card>
        <h2 className="font-heading text-lg font-semibold text-brand-navy">
          Record an offline payment
        </h2>
        <form
          onSubmit={(event) => void recordPayment(event)}
          className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          <Field
            label="Invoice ID"
            name="payment-invoice"
            type="number"
            min={1}
            value={invoiceId}
            onChange={(event) => setInvoiceId(event.target.value)}
            placeholder="e.g. 18"
          />
          <Field
            label="Amount (NGN, optional)"
            name="payment-amount"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            hint="Defaults to the invoice balance."
          />
          <div>
            <label
              htmlFor="payment-method"
              className="mb-1.5 block text-sm font-semibold text-brand-text"
            >
              Method
            </label>
            <select
              id="payment-method"
              value={method}
              onChange={(event) => setMethod(event.target.value as BillingPaymentMethod)}
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-brand-text outline-none focus:border-brand-navy-light focus:ring-2 focus:ring-brand-navy-light/20"
            >
              {billingPaymentMethods.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <Field
            label="Reference (optional)"
            name="payment-reference"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="Transfer reference"
          />
          <div className="flex items-end">
            <Button
              type="submit"
              loading={saving}
              className="w-full"
              disabled={!invoiceId || (amount !== '' && !isPositiveAmount(amount))}
            >
              Record payment
            </Button>
          </div>
          {formError ? (
            <p role="alert" className="text-sm text-brand-danger lg:col-span-5">
              {formError}
            </p>
          ) : null}
        </form>
      </Card>

      <Card>
        <h2 className="font-heading text-lg font-semibold text-brand-navy">Payment history</h2>

        {loading ? <LoadingState label="Loading payments…" /> : null}
        {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

        {!loading && !error && data && data.results.length === 0 ? (
          <EmptyState
            title="No payments yet"
            description="Provider payments appear automatically; offline payments can be recorded above."
          />
        ) : null}

        {!loading && !error && data && data.results.length > 0 ? (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-brand-muted">
                  <tr>
                    <th className="py-2 pr-4 font-semibold">Paid at</th>
                    <th className="py-2 pr-4 font-semibold">Gym</th>
                    <th className="py-2 pr-4 font-semibold">Invoice</th>
                    <th className="py-2 pr-4 font-semibold">Plan</th>
                    <th className="py-2 pr-4 font-semibold">Amount</th>
                    <th className="py-2 pr-4 font-semibold">Method</th>
                    <th className="py-2 pr-4 font-semibold">Status</th>
                    <th className="py-2 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.results.map((payment) => (
                    <PaymentRow
                      key={payment.id}
                      payment={payment}
                      onChanged={() => setRefresh((value) => value + 1)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              pageCount={pageCount}
              total={total}
              firstRow={firstRow}
              lastRow={lastRow}
              onPage={setPage}
            />
          </>
        ) : null}
      </Card>
    </div>
  )
}

function PaymentRow({ payment, onChanged }: { payment: BillingPayment; onChanged: () => void }) {
  const [voidOpen, setVoidOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const voidPayment = async (reason: string) => {
    setBusy(true)
    setError('')
    try {
      await apiFetch(
        buildApiPath('/api/platform/billing/payments/{id}/void/', { id: payment.id }),
        'post',
        { body: { reason } },
      )
      setVoidOpen(false)
      onChanged()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to void this payment.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <tr className="align-top">
      <td className="py-3 pr-4 text-brand-muted">{formatDate(payment.paid_at)}</td>
      <td className="py-3 pr-4 font-semibold text-brand-navy">{payment.gym.name}</td>
      <td className="py-3 pr-4 text-brand-text">{payment.invoice?.number ?? '—'}</td>
      <td className="py-3 pr-4 text-brand-text">{payment.plan_name || '—'}</td>
      <td className="py-3 pr-4 font-semibold text-brand-text">{formatNaira(payment.amount)}</td>
      <td className="py-3 pr-4 text-brand-text">
        {paymentMethodLabel(payment.method)}
        <p className="text-xs text-brand-muted">{titleCase(payment.provider)}</p>
      </td>
      <td className="py-3 pr-4">
        <Badge tone={payment.is_voided ? 'danger' : 'success'}>
          {payment.is_voided ? 'Void' : 'Recorded'}
        </Badge>
        {payment.is_voided && payment.void_reason ? (
          <p className="mt-1 max-w-[180px] text-xs text-brand-muted">{payment.void_reason}</p>
        ) : null}
      </td>
      <td className="py-3">
        {payment.is_voided ? null : (
          <Button
            variant="danger"
            onClick={() => {
              setError('')
              setVoidOpen(true)
            }}
          >
            Void
          </Button>
        )}
        {error ? (
          <p role="alert" className="mt-2 text-xs text-brand-danger">
            {error}
          </p>
        ) : null}
      </td>
      <ReasonDialog
        open={voidOpen}
        title="Void payment"
        description={`This payment of ${formatNaira(payment.amount)} will be reversed from the invoice balance. Payments are never edited or deleted.`}
        confirmLabel="Void payment"
        busy={busy}
        error={error}
        onCancel={() => setVoidOpen(false)}
        onConfirm={(reason) => void voidPayment(reason)}
      />
    </tr>
  )
}
