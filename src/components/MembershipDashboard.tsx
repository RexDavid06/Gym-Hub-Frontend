import { useCallback, useEffect, useState } from 'react'

import { apiFetch } from '../api/client'
import type { MembershipSubscription } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { formatDay } from '../lib/format'
import { canManagePayments } from '../lib/permissions'
import { Link } from './Link'
import { Badge, Card, ErrorState, LoadingState } from './ui'

function MembershipAlertRow({
  subscription,
  tone,
  detail,
}: {
  subscription: MembershipSubscription
  tone: 'warning' | 'danger'
  detail: string
}) {
  return (
    <li className="flex flex-col gap-3 border-t border-slate-100 py-3 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <Link
          to={`/members/${subscription.member.id}`}
          className="font-semibold text-brand-navy hover:underline"
        >
          {subscription.member.name || subscription.member.phone}
        </Link>
        <p className="mt-1 text-sm text-brand-muted">
          {subscription.plan.name} · expires {formatDay(subscription.end_date)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={tone}>{detail}</Badge>
        <Link
          to={`/members/${subscription.member.id}?renew=1`}
          className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-brand-navy hover:bg-slate-50"
        >
          Renew
        </Link>
      </div>
    </li>
  )
}

function MembershipAlertList({
  title,
  description,
  subscriptions,
  tone,
  emptyText,
  detail,
}: {
  title: string
  description: string
  subscriptions: MembershipSubscription[]
  tone: 'warning' | 'danger'
  emptyText: string
  detail: (subscription: MembershipSubscription) => string
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold text-brand-navy">{title}</h2>
          <p className="mt-1 text-sm text-brand-muted">{description}</p>
        </div>
        <Badge tone={tone}>{subscriptions.length}</Badge>
      </div>
      {subscriptions.length === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-brand-muted">{emptyText}</p>
      ) : (
        <ul className="mt-4">
          {subscriptions.map((subscription) => (
            <MembershipAlertRow
              key={subscription.id}
              subscription={subscription}
              tone={tone}
              detail={detail(subscription)}
            />
          ))}
        </ul>
      )}
    </Card>
  )
}

export function MembershipDashboard() {
  const { profile } = useAuth()
  const canManage = profile ? canManagePayments(profile) : false
  const [expiring, setExpiring] = useState<MembershipSubscription[]>([])
  const [expired, setExpired] = useState<MembershipSubscription[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!canManage) return
    setLoading(true)
    setError('')
    try {
      const [expiringRows, expiredRows] = await Promise.all([
        apiFetch('/api/memberships/', 'get', { query: { expiring_within: 7 } }),
        apiFetch('/api/memberships/', 'get', { query: { status: 'expired' } }),
      ])
      setExpiring(expiringRows)
      setExpired(expiredRows)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load membership alerts.')
    } finally {
      setLoading(false)
    }
  }, [canManage])

  useEffect(() => {
    void load()
  }, [load])

  if (!canManage) return null
  if (loading) return <LoadingState label="Loading membership alerts…" />
  if (error) return <ErrorState message={error} onRetry={() => void load()} />

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <MembershipAlertList
        title="Expiring in 7 days"
        description="Active memberships that end this week."
        subscriptions={expiring}
        tone="warning"
        emptyText="Nothing expires in the next 7 days."
        detail={(subscription) =>
          `${subscription.days_left} day${subscription.days_left === 1 ? '' : 's'} left`
        }
      />
      <MembershipAlertList
        title="Expired"
        description="Members whose membership has lapsed."
        subscriptions={expired}
        tone="danger"
        emptyText="No expired memberships."
        detail={() => 'Expired'}
      />
    </div>
  )
}
