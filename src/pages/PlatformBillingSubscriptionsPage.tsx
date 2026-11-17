import { useCallback, useEffect, useState } from 'react'

import { apiFetch, buildApiPath } from '../api/client'
import type {
  BillingInterval,
  BillingPlan,
  BillingSubscriptionStatus,
  GymBillingSubscription,
  PaginatedSubscriptions,
} from '../api/types'
import { BillingTabs } from '../components/BillingTabs'
import { Pagination } from '../components/Pagination'
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
  billingIntervals,
  intervalLabel,
  subscriptionStatuses,
  subscriptionStatusTone,
  titleCase,
} from '../lib/billing'
import { formatDay, formatRole } from '../lib/format'
import { formatNaira } from '../lib/money'

const PAGE_SIZE = 10

export function PlatformBillingSubscriptionsPage() {
  const [data, setData] = useState<PaginatedSubscriptions | null>(null)
  const [plans, setPlans] = useState<BillingPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<'all' | BillingSubscriptionStatus>('all')
  const [page, setPage] = useState(1)
  const [refresh, setRefresh] = useState(0)

  const [gymId, setGymId] = useState('')
  const [planId, setPlanId] = useState('')
  const [interval, setInterval] = useState<BillingInterval>('monthly')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [subscriptions, planData] = await Promise.all([
        apiFetch('/api/platform/billing/subscriptions/', 'get', {
          query: {
            page,
            page_size: PAGE_SIZE,
            ...(status === 'all' ? {} : { status }),
          },
        }),
        apiFetch('/api/platform/billing/plans/', 'get'),
      ])
      setData(subscriptions)
      setPlans(planData)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load subscriptions.')
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

  const createSubscription = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      await apiFetch('/api/platform/billing/subscriptions/', 'post', {
        body: {
          gym_id: Number(gymId),
          plan_id: Number(planId),
          interval,
          status: 'active',
        },
      })
      setGymId('')
      setRefresh((value) => value + 1)
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Unable to create this subscription.')
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
        title="Billing subscriptions"
        description="One subscription per gym. Cancel at period end, reactivate, or move a gym to another plan."
      />
      <BillingTabs />

      <Card>
        <h2 className="font-heading text-lg font-semibold text-brand-navy">Subscribe a gym</h2>
        <form
          onSubmit={(event) => void createSubscription(event)}
          className="mt-4 grid gap-4 sm:grid-cols-4"
        >
          <Field
            label="Gym ID"
            name="subscription-gym"
            type="number"
            min={1}
            value={gymId}
            onChange={(event) => setGymId(event.target.value)}
            placeholder="e.g. 12"
          />
          <div>
            <label
              htmlFor="subscription-plan"
              className="mb-1.5 block text-sm font-semibold text-brand-text"
            >
              Plan
            </label>
            <select
              id="subscription-plan"
              value={planId}
              onChange={(event) => setPlanId(event.target.value)}
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-brand-text outline-none focus:border-brand-navy-light focus:ring-2 focus:ring-brand-navy-light/20"
            >
              <option value="">Select a plan</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} ({plan.tier})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="subscription-interval"
              className="mb-1.5 block text-sm font-semibold text-brand-text"
            >
              Billing interval
            </label>
            <select
              id="subscription-interval"
              value={interval}
              onChange={(event) => setInterval(event.target.value as BillingInterval)}
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-brand-text outline-none focus:border-brand-navy-light focus:ring-2 focus:ring-brand-navy-light/20"
            >
              {billingIntervals.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button
              type="submit"
              className="w-full"
              loading={saving}
              disabled={!gymId || !planId}
            >
              Create subscription
            </Button>
          </div>
          {formError ? (
            <p role="alert" className="text-sm text-brand-danger sm:col-span-4">
              {formError}
            </p>
          ) : null}
        </form>
      </Card>

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-heading text-lg font-semibold text-brand-navy">All subscriptions</h2>
          <select
            aria-label="Filter subscriptions by status"
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-brand-text outline-none focus:border-brand-navy-light"
          >
            <option value="all">All statuses</option>
            {subscriptionStatuses.map((value) => (
              <option key={value} value={value}>
                {titleCase(value)}
              </option>
            ))}
          </select>
        </div>

        {loading ? <LoadingState label="Loading subscriptions…" /> : null}
        {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

        {!loading && !error && data && data.results.length === 0 ? (
          <EmptyState
            title="No subscriptions"
            description="Create a subscription above to start billing a gym."
          />
        ) : null}

        {!loading && !error && data && data.results.length > 0 ? (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-brand-muted">
                  <tr>
                    <th className="py-2 pr-4 font-semibold">Gym</th>
                    <th className="py-2 pr-4 font-semibold">Plan</th>
                    <th className="py-2 pr-4 font-semibold">Period</th>
                    <th className="py-2 pr-4 font-semibold">Price</th>
                    <th className="py-2 pr-4 font-semibold">Balance</th>
                    <th className="py-2 pr-4 font-semibold">Status</th>
                    <th className="py-2 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.results.map((subscription) => (
                    <SubscriptionRow
                      key={subscription.id}
                      subscription={subscription}
                      plans={plans}
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

function SubscriptionRow({
  subscription,
  plans,
  onChanged,
}: {
  subscription: GymBillingSubscription
  plans: BillingPlan[]
  onChanged: () => void
}) {
  const [planId, setPlanId] = useState(String(subscription.plan.id))
  const [interval, setInterval] = useState<BillingInterval>(
    subscription.interval as BillingInterval,
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setError('')
    try {
      await action()
      onChanged()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update this subscription.')
    } finally {
      setBusy(false)
    }
  }

  const changePlan = () =>
    apiFetch(
      buildApiPath('/api/platform/billing/subscriptions/{id}/change-plan/', {
        id: subscription.id,
      }),
      'post',
      { body: { plan_id: Number(planId), interval } },
    )

  const cancel = () =>
    apiFetch(
      buildApiPath('/api/platform/billing/subscriptions/{id}/cancel/', { id: subscription.id }),
      'post',
    )

  const reactivate = () =>
    apiFetch(
      buildApiPath('/api/platform/billing/subscriptions/{id}/reactivate/', {
        id: subscription.id,
      }),
      'post',
    )

  return (
    <tr className="align-top">
      <td className="py-3 pr-4">
        <p className="font-semibold text-brand-navy">{subscription.gym.name}</p>
        <p className="text-xs text-brand-muted">Gym #{subscription.gym.id}</p>
      </td>
      <td className="py-3 pr-4">
        <p className="font-semibold text-brand-text">{subscription.plan.name}</p>
        <p className="text-xs text-brand-muted">
          {subscription.plan.tier} · {intervalLabel(subscription.interval)}
        </p>
      </td>
      <td className="py-3 pr-4 text-brand-muted">
        {formatDay(subscription.current_period_start)} –{' '}
        {formatDay(subscription.current_period_end)}
        {subscription.cancel_at_period_end ? (
          <p className="mt-1 text-xs font-semibold text-amber-700">Cancels at period end</p>
        ) : null}
      </td>
      <td className="py-3 pr-4 font-semibold text-brand-text">
        {formatNaira(subscription.price.amount)}
      </td>
      <td className="py-3 pr-4 font-semibold text-brand-text">
        {formatNaira(subscription.balance)}
      </td>
      <td className="py-3 pr-4">
        <Badge tone={subscriptionStatusTone(subscription.status)}>
          {titleCase(subscription.status)}
        </Badge>
      </td>
      <td className="py-3">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label
                htmlFor={`subscription-plan-${subscription.id}`}
                className="mb-1 block text-xs font-semibold text-brand-muted"
              >
                Plan
              </label>
              <select
                id={`subscription-plan-${subscription.id}`}
                value={planId}
                onChange={(event) => setPlanId(event.target.value)}
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-2 text-xs text-brand-text outline-none focus:border-brand-navy-light"
              >
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor={`subscription-interval-${subscription.id}`}
                className="mb-1 block text-xs font-semibold text-brand-muted"
              >
                Interval
              </label>
              <select
                id={`subscription-interval-${subscription.id}`}
                value={interval}
                onChange={(event) => setInterval(event.target.value as BillingInterval)}
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-2 text-xs text-brand-text outline-none focus:border-brand-navy-light"
              >
                {billingIntervals.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="secondary"
              loading={busy}
              onClick={() => void run(changePlan)}
            >
              Change
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {subscription.cancel_at_period_end || subscription.status === 'cancelled' ? (
              <Button
                variant="secondary"
                loading={busy}
                onClick={() => void run(reactivate)}
              >
                Reactivate
              </Button>
            ) : (
              <Button
                variant="ghost"
                loading={busy}
                onClick={() => void run(cancel)}
              >
                Cancel at period end
              </Button>
            )}
            <span className="text-xs text-brand-muted">{formatRole(subscription.status)}</span>
          </div>
          {error ? (
            <p role="alert" className="text-xs text-brand-danger">
              {error}
            </p>
          ) : null}
        </div>
      </td>
    </tr>
  )
}
