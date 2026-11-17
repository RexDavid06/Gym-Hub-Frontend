import { useCallback, useEffect, useState } from 'react'

import { apiFetch } from '../api/client'
import type { Invoice, PlatformBillingSummary } from '../api/types'
import { BillingTabs } from '../components/BillingTabs'
import { Link } from '../components/Link'
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from '../components/ui'
import { formatDay } from '../lib/format'
import { formatNaira } from '../lib/money'

export function PlatformBillingPage() {
  const [summary, setSummary] = useState<PlatformBillingSummary | null>(null)
  const [overdue, setOverdue] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [summaryData, overdueData] = await Promise.all([
        apiFetch('/api/platform/billing/summary/', 'get'),
        apiFetch('/api/platform/billing/invoices/', 'get', {
          query: { status: 'overdue', page_size: 5 },
        }),
      ])
      setSummary(summaryData)
      setOverdue(overdueData.results)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load billing.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform billing"
        description="Plans, subscriptions, invoices, payments, and dunning for every gym on Gym Hub."
        action={
          <Link
            to="/platform/billing/plans"
            className="inline-flex min-h-11 items-center rounded-xl bg-brand-orange px-4 text-sm font-semibold text-white hover:bg-brand-orange-dark"
          >
            Manage plans
          </Link>
        }
      />
      <BillingTabs />

      {loading ? <LoadingState label="Loading billing summary…" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {!loading && !error && summary ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                Active subscriptions
              </p>
              <p className="mt-2 font-heading text-3xl font-semibold text-brand-navy">
                {summary.active_subscriptions}
              </p>
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                Monthly recurring revenue
              </p>
              <p className="mt-2 font-heading text-2xl font-semibold text-brand-navy">
                {formatNaira(summary.monthly_recurring_revenue)}
              </p>
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                Outstanding balance
              </p>
              <p className="mt-2 font-heading text-2xl font-semibold text-brand-navy">
                {formatNaira(summary.outstanding_balance)}
              </p>
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                Collected this month
              </p>
              <p className="mt-2 font-heading text-2xl font-semibold text-brand-navy">
                {formatNaira(summary.collected_this_month)}
              </p>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="font-heading text-lg font-semibold text-brand-navy">
                Subscriptions by tier
              </h2>
              <ul className="mt-4 space-y-3">
                {['small', 'medium', 'big'].map((tier) => (
                  <li key={tier} className="flex items-center justify-between gap-3">
                    <Badge tone="navy">{tier}</Badge>
                    <span className="text-sm font-semibold text-brand-text">
                      {summary.subscriptions_by_tier[tier] ?? 0}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3">
                <span className="text-sm font-semibold text-amber-800">Overdue invoices</span>
                <Badge tone={summary.overdue_invoice_count > 0 ? 'danger' : 'success'}>
                  {summary.overdue_invoice_count}
                </Badge>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-heading text-lg font-semibold text-brand-navy">
                  Overdue invoices
                </h2>
                <Link
                  to="/platform/billing/dunning"
                  className="text-sm font-semibold text-brand-navy-light hover:underline"
                >
                  Open dunning →
                </Link>
              </div>
              {overdue.length === 0 ? (
                <p className="mt-3 text-sm text-brand-muted">
                  No invoices are overdue right now.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-slate-100">
                  {overdue.map((invoice) => (
                    <li key={invoice.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-brand-navy">
                          {invoice.number} · {invoice.gym.name}
                        </p>
                        <p className="text-xs text-brand-muted">
                          Due {formatDay(invoice.due_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-brand-text">
                          {formatNaira(invoice.balance)}
                        </p>
                        <Link
                          to="/platform/billing/invoices"
                          className="text-xs font-semibold text-brand-navy-light hover:underline"
                        >
                          Review
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      ) : null}

      {!loading && !error && summary && overdue.length === 0 && summary.active_subscriptions === 0 ? (
        <EmptyState
          title="No billing activity yet"
          description="Create a plan and subscribe a gym to start billing."
          action={
            <Link
              to="/platform/billing/plans"
              className="inline-flex min-h-11 items-center rounded-xl bg-brand-orange px-4 text-sm font-semibold text-white hover:bg-brand-orange-dark"
            >
              Create a plan
            </Link>
          }
        />
      ) : null}
    </div>
  )
}
