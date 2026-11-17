import { useCallback, useEffect, useState } from 'react'

import { apiFetch } from '../api/client'
import type {
  PaginatedPlatformGyms,
  PlatformBillingSummary,
  PlatformGym,
  PlatformSummary,
} from '../api/types'
import { Link } from '../components/Link'
import { Badge, Card, ErrorState, LoadingState, PageHeader } from '../components/ui'
import { formatDay } from '../lib/format'
import { formatNaira } from '../lib/money'

const summaryCards: {
  key: keyof PlatformSummary
  label: string
  tone?: 'navy' | 'success' | 'warning' | 'danger'
}[] = [
  { key: 'gyms_total', label: 'Gyms' },
  { key: 'gyms_active', label: 'Active gyms', tone: 'success' },
  { key: 'gyms_suspended', label: 'Suspended gyms', tone: 'danger' },
  { key: 'members_total', label: 'Members' },
  { key: 'trainers_total', label: 'Trainers' },
  { key: 'active_memberships', label: 'Active memberships' },
  { key: 'memberships_expiring_7_days', label: 'Expiring in 7 days', tone: 'warning' },
]

export function PlatformOverviewPage() {
  const [summary, setSummary] = useState<PlatformSummary | null>(null)
  const [recentGyms, setRecentGyms] = useState<PlatformGym[]>([])
  const [billing, setBilling] = useState<PlatformBillingSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [summaryData, gymsData, billingData] = await Promise.all([
        apiFetch('/api/platform/summary/', 'get'),
        apiFetch('/api/platform/gyms/', 'get', { query: { page_size: 5 } }),
        apiFetch('/api/platform/billing/summary/', 'get').catch(() => null),
      ])
      setSummary(summaryData)
      setRecentGyms((gymsData as PaginatedPlatformGyms).results)
      setBilling(billingData)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load the platform summary.')
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
        title="Platform overview"
        description="Every gym on Gym Hub, with the health signals that matter day to day."
        action={
          <Link
            to="/platform/gyms"
            className="inline-flex min-h-11 items-center rounded-xl bg-brand-orange px-4 text-sm font-semibold text-white hover:bg-brand-orange-dark"
          >
            Manage gyms
          </Link>
        }
      />

      {loading ? <LoadingState label="Loading platform summary…" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {!loading && !error && summary ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map((card) => (
              <Card key={card.key}>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                  {card.label}
                </p>
                <p className="mt-2 font-heading text-3xl font-semibold text-brand-navy">
                  {summary[card.key]}
                </p>
                {card.tone ? (
                  <div className="mt-3">
                    <Badge tone={card.tone}>{card.label}</Badge>
                  </div>
                ) : null}
              </Card>
            ))}
          </div>

          {billing ? (
            <Card>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-heading text-lg font-semibold text-brand-navy">
                  Billing summary
                </h2>
                <Link
                  to="/platform/billing"
                  className="text-sm font-semibold text-brand-navy-light hover:underline"
                >
                  Open billing →
                </Link>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                    MRR
                  </p>
                  <p className="mt-1 font-heading text-xl font-semibold text-brand-navy">
                    {formatNaira(billing.monthly_recurring_revenue)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                    Outstanding
                  </p>
                  <p className="mt-1 font-heading text-xl font-semibold text-brand-navy">
                    {formatNaira(billing.outstanding_balance)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                    Collected this month
                  </p>
                  <p className="mt-1 font-heading text-xl font-semibold text-brand-navy">
                    {formatNaira(billing.collected_this_month)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                    Overdue invoices
                  </p>
                  <p className="mt-1 font-heading text-xl font-semibold text-brand-navy">
                    {billing.overdue_invoice_count}
                  </p>
                </div>
              </div>
            </Card>
          ) : null}

          <Card>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-lg font-semibold text-brand-navy">Recent gyms</h2>
              <Link
                to="/platform/gyms"
                className="text-sm font-semibold text-brand-navy-light hover:underline"
              >
                View all →
              </Link>
            </div>

            {recentGyms.length === 0 ? (
              <p className="mt-3 text-sm text-brand-muted">No gyms have registered yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100">
                {recentGyms.map((gym) => (
                  <li
                    key={gym.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <Link
                        to={`/platform/gyms/${gym.id}`}
                        className="font-semibold text-brand-navy hover:underline"
                      >
                        {gym.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-brand-muted">
                        {gym.owner
                          ? `${gym.owner.name || gym.owner.phone} · Owner`
                          : 'No active owner'}{' '}
                        · Joined {formatDay(gym.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={gym.is_active ? 'success' : 'danger'}>
                        {gym.is_active ? 'Active' : 'Suspended'}
                      </Badge>
                      <Badge tone="navy">{gym.plan_tier}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      ) : null}
    </div>
  )
}
