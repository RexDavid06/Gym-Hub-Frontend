import { useCallback, useEffect, useState } from 'react'

import { apiFetch, buildApiPath } from '../api/client'
import type { Invoice, InvoiceStatus, PaginatedInvoices } from '../api/types'
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
import {
  intervalLabel,
  invoiceStatuses,
  invoiceStatusTone,
  titleCase,
} from '../lib/billing'
import { formatDay } from '../lib/format'
import { formatNaira } from '../lib/money'

const PAGE_SIZE = 10

export function PlatformBillingInvoicesPage() {
  const [data, setData] = useState<PaginatedInvoices | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<'all' | InvoiceStatus>('all')
  const [page, setPage] = useState(1)
  const [refresh, setRefresh] = useState(0)

  const [gymId, setGymId] = useState('')
  const [subscriptionId, setSubscriptionId] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await apiFetch('/api/platform/billing/invoices/', 'get', {
        query: {
          page,
          page_size: PAGE_SIZE,
          ...(status === 'all' ? {} : { status }),
        },
      })
      setData(result)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load invoices.')
    } finally {
      setLoading(false)
    }
  }, [page, status, refresh])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [status])

  const createInvoice = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      await apiFetch('/api/platform/billing/invoices/', 'post', {
        body: {
          gym_id: Number(gymId),
          ...(subscriptionId ? { subscription_id: Number(subscriptionId) } : {}),
        },
      })
      setGymId('')
      setSubscriptionId('')
      setRefresh((value) => value + 1)
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Unable to create this invoice.')
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
        title="Invoices"
        description="Issue invoices, record offline payment, send reminders, or void a mistaken invoice."
      />
      <BillingTabs />

      <Card>
        <h2 className="font-heading text-lg font-semibold text-brand-navy">Issue an invoice</h2>
        <form
          onSubmit={(event) => void createInvoice(event)}
          className="mt-4 grid gap-4 sm:grid-cols-3"
        >
          <Field
            label="Gym ID"
            name="invoice-gym"
            type="number"
            min={1}
            value={gymId}
            onChange={(event) => setGymId(event.target.value)}
            placeholder="e.g. 12"
          />
          <Field
            label="Subscription ID (optional)"
            name="invoice-subscription"
            type="number"
            min={1}
            value={subscriptionId}
            onChange={(event) => setSubscriptionId(event.target.value)}
            hint="Defaults to the gym's billing subscription."
          />
          <div className="flex items-end">
            <Button type="submit" loading={saving} disabled={!gymId}>
              Create invoice
            </Button>
          </div>
          {formError ? (
            <p role="alert" className="text-sm text-brand-danger sm:col-span-3">
              {formError}
            </p>
          ) : null}
        </form>
      </Card>

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-heading text-lg font-semibold text-brand-navy">All invoices</h2>
          <select
            aria-label="Filter invoices by status"
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-brand-text outline-none focus:border-brand-navy-light"
          >
            <option value="all">All statuses</option>
            {invoiceStatuses.map((value) => (
              <option key={value} value={value}>
                {titleCase(value)}
              </option>
            ))}
          </select>
        </div>

        {loading ? <LoadingState label="Loading invoices…" /> : null}
        {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

        {!loading && !error && data && data.results.length === 0 ? (
          <EmptyState
            title="No invoices"
            description="Issue an invoice for a subscribed gym to start the billing cycle."
          />
        ) : null}

        {!loading && !error && data && data.results.length > 0 ? (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-brand-muted">
                  <tr>
                    <th className="py-2 pr-4 font-semibold">Invoice</th>
                    <th className="py-2 pr-4 font-semibold">Gym</th>
                    <th className="py-2 pr-4 font-semibold">Plan</th>
                    <th className="py-2 pr-4 font-semibold">Due</th>
                    <th className="py-2 pr-4 font-semibold">Amount</th>
                    <th className="py-2 pr-4 font-semibold">Balance</th>
                    <th className="py-2 pr-4 font-semibold">Status</th>
                    <th className="py-2 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.results.map((invoice) => (
                    <InvoiceRow
                      key={invoice.id}
                      invoice={invoice}
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

function InvoiceRow({ invoice, onChanged }: { invoice: Invoice; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [voidOpen, setVoidOpen] = useState(false)
  const [voidBusy, setVoidBusy] = useState(false)
  const [voidError, setVoidError] = useState('')

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setError('')
    try {
      await action()
      onChanged()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update this invoice.')
    } finally {
      setBusy(false)
    }
  }

  const markPaid = () =>
    apiFetch(
      buildApiPath('/api/platform/billing/invoices/{id}/mark-paid/', { id: invoice.id }),
      'post',
    )

  const dun = () =>
    apiFetch(buildApiPath('/api/platform/billing/invoices/{id}/dun/', { id: invoice.id }), 'post')

  const voidInvoice = async (reason: string) => {
    setVoidBusy(true)
    setVoidError('')
    try {
      await apiFetch(
        buildApiPath('/api/platform/billing/invoices/{id}/void/', { id: invoice.id }),
        'post',
        { body: { reason } },
      )
      setVoidOpen(false)
      onChanged()
    } catch (caught) {
      setVoidError(caught instanceof Error ? caught.message : 'Unable to void this invoice.')
    } finally {
      setVoidBusy(false)
    }
  }

  const openBalance = invoice.status !== 'paid' && invoice.status !== 'void'

  return (
    <tr className="align-top">
      <td className="py-3 pr-4">
        <p className="font-semibold text-brand-navy">{invoice.number}</p>
        <p className="text-xs text-brand-muted">Issued {formatDay(invoice.issued_at)}</p>
      </td>
      <td className="py-3 pr-4 text-brand-text">{invoice.gym.name}</td>
      <td className="py-3 pr-4">
        <p className="text-brand-text">{invoice.plan_name}</p>
        <p className="text-xs text-brand-muted">{intervalLabel(invoice.interval)}</p>
      </td>
      <td className="py-3 pr-4 text-brand-muted">{formatDay(invoice.due_at)}</td>
      <td className="py-3 pr-4 font-semibold text-brand-text">{formatNaira(invoice.amount)}</td>
      <td className="py-3 pr-4 font-semibold text-brand-text">
        {formatNaira(invoice.balance)}
        {invoice.is_overpaid ? (
          <p className="mt-1">
            <Badge tone="warning">Overpaid</Badge>
          </p>
        ) : null}
      </td>
      <td className="py-3 pr-4">
        <Badge tone={invoiceStatusTone(invoice.status)}>{titleCase(invoice.status)}</Badge>
      </td>
      <td className="py-3">
        <div className="flex flex-wrap gap-2">
          {openBalance ? (
            <>
              <Button
                variant="secondary"
                loading={busy}
                onClick={() => void run(markPaid)}
              >
                Mark paid
              </Button>
              <Button variant="ghost" loading={busy} onClick={() => void run(dun)}>
                Send reminder
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setVoidError('')
                  setVoidOpen(true)
                }}
              >
                Void
              </Button>
            </>
          ) : null}
        </div>
        {error ? (
          <p role="alert" className="mt-2 text-xs text-brand-danger">
            {error}
          </p>
        ) : null}
      </td>
      <ReasonDialog
        open={voidOpen}
        title="Void invoice"
        description={`Invoice ${invoice.number} will be marked void. Invoices are never edited or deleted; the void reason and actor are kept for the audit trail.`}
        confirmLabel="Void invoice"
        busy={voidBusy}
        error={voidError}
        onCancel={() => setVoidOpen(false)}
        onConfirm={(reason) => void voidInvoice(reason)}
      />
    </tr>
  )
}
