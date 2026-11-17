import { useCallback, useEffect, useState } from 'react'

import { apiFetch, buildApiPath } from '../api/client'
import type {
  DunningStatus,
  Invoice,
  PaginatedDunning,
  PaginatedInvoices,
} from '../api/types'
import { BillingTabs } from '../components/BillingTabs'
import { Pagination } from '../components/Pagination'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from '../components/ui'
import { dunningStatuses, dunningStatusTone, titleCase } from '../lib/billing'
import { formatDate, formatDay } from '../lib/format'
import { formatNaira } from '../lib/money'

const PAGE_SIZE = 10

export function PlatformBillingDunningPage() {
  const [overdue, setOverdue] = useState<PaginatedInvoices | null>(null)
  const [attempts, setAttempts] = useState<PaginatedDunning | null>(null)
  const [status, setStatus] = useState<'all' | DunningStatus>('all')
  const [page, setPage] = useState(1)
  const [refresh, setRefresh] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyInvoice, setBusyInvoice] = useState<number | null>(null)
  const [actionError, setActionError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [overdueData, attemptData] = await Promise.all([
        apiFetch('/api/platform/billing/invoices/', 'get', {
          query: { status: 'overdue', page_size: 10 },
        }),
        apiFetch('/api/platform/billing/dunning/', 'get', {
          query: {
            page,
            page_size: PAGE_SIZE,
            ...(status === 'all' ? {} : { status }),
          },
        }),
      ])
      setOverdue(overdueData)
      setAttempts(attemptData)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load dunning.')
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

  const sendReminder = async (invoice: Invoice) => {
    setBusyInvoice(invoice.id)
    setActionError('')
    try {
      await apiFetch(
        buildApiPath('/api/platform/billing/invoices/{id}/dun/', { id: invoice.id }),
        'post',
      )
      setRefresh((value) => value + 1)
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Unable to send the reminder.')
    } finally {
      setBusyInvoice(null)
    }
  }

  const total = attempts?.count ?? 0
  const pageCount = Math.max(Math.ceil(total / PAGE_SIZE), 1)
  const firstRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const lastRow = Math.min(page * PAGE_SIZE, total)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dunning and overdue invoices"
        description="Overdue invoices, reminder history, and a manual reminder action for urgent accounts."
      />
      <BillingTabs />

      {loading ? <LoadingState label="Loading dunning activity…" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {!loading && !error ? (
        <>
          <Card>
            <h2 className="font-heading text-lg font-semibold text-brand-navy">
              Overdue invoices
            </h2>
            {actionError ? (
              <p role="alert" className="mt-3 text-sm text-brand-danger">
                {actionError}
              </p>
            ) : null}
            {!overdue || overdue.results.length === 0 ? (
              <p className="mt-3 text-sm text-brand-muted">No invoices are overdue.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-brand-muted">
                    <tr>
                      <th className="py-2 pr-4 font-semibold">Invoice</th>
                      <th className="py-2 pr-4 font-semibold">Gym</th>
                      <th className="py-2 pr-4 font-semibold">Due</th>
                      <th className="py-2 pr-4 font-semibold">Balance</th>
                      <th className="py-2 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {overdue.results.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="py-3 pr-4 font-semibold text-brand-navy">
                          {invoice.number}
                        </td>
                        <td className="py-3 pr-4 text-brand-text">{invoice.gym.name}</td>
                        <td className="py-3 pr-4 text-brand-muted">{formatDay(invoice.due_at)}</td>
                        <td className="py-3 pr-4 font-semibold text-brand-text">
                          {formatNaira(invoice.balance)}
                        </td>
                        <td className="py-3">
                          <Button
                            variant="secondary"
                            loading={busyInvoice === invoice.id}
                            onClick={() => void sendReminder(invoice)}
                          >
                            Send reminder
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-heading text-lg font-semibold text-brand-navy">
                Reminder history
              </h2>
              <select
                aria-label="Filter reminders by status"
                value={status}
                onChange={(event) => setStatus(event.target.value as typeof status)}
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-brand-text outline-none focus:border-brand-navy-light"
              >
                <option value="all">All statuses</option>
                {dunningStatuses.map((value) => (
                  <option key={value} value={value}>
                    {titleCase(value)}
                  </option>
                ))}
              </select>
            </div>

            {!attempts || attempts.results.length === 0 ? (
              <EmptyState
                title="No reminders sent"
                description="Reminders scheduled by the dunning job will appear here."
              />
            ) : (
              <>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[820px] text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-brand-muted">
                      <tr>
                        <th className="py-2 pr-4 font-semibold">Created</th>
                        <th className="py-2 pr-4 font-semibold">Invoice</th>
                        <th className="py-2 pr-4 font-semibold">Gym</th>
                        <th className="py-2 pr-4 font-semibold">Offset</th>
                        <th className="py-2 pr-4 font-semibold">Channel</th>
                        <th className="py-2 pr-4 font-semibold">Status</th>
                        <th className="py-2 font-semibold">Sent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attempts.results.map((attempt) => (
                        <tr key={attempt.id}>
                          <td className="py-3 pr-4 text-brand-muted">
                            {formatDate(attempt.created_at)}
                          </td>
                          <td className="py-3 pr-4 font-semibold text-brand-navy">
                            {attempt.invoice_number}
                          </td>
                          <td className="py-3 pr-4 text-brand-text">{attempt.gym.name}</td>
                          <td className="py-3 pr-4 text-brand-text">
                            {attempt.offset_days === 0
                              ? 'Due date'
                              : `${attempt.offset_days > 0 ? '+' : ''}${attempt.offset_days} days`}
                          </td>
                          <td className="py-3 pr-4 text-brand-text">
                            {titleCase(attempt.channel)}
                          </td>
                          <td className="py-3 pr-4">
                            <Badge tone={dunningStatusTone(attempt.status)}>
                              {titleCase(attempt.status)}
                            </Badge>
                          </td>
                          <td className="py-3 text-brand-muted">
                            {formatDate(attempt.sent_at)}
                            {attempt.error ? (
                              <p className="mt-1 max-w-[220px] text-xs text-brand-danger">
                                {attempt.error}
                              </p>
                            ) : null}
                          </td>
                        </tr>
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
            )}
          </Card>
        </>
      ) : null}
    </div>
  )
}
