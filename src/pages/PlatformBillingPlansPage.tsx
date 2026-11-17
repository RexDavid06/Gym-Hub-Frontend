import { useCallback, useEffect, useState } from 'react'

import { apiFetch, buildApiPath } from '../api/client'
import type { BillingInterval, BillingPlan, BillingPlanPrice, BillingPlanTier } from '../api/types'
import { BillingTabs } from '../components/BillingTabs'
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
import { billingIntervals, intervalLabel } from '../lib/billing'
import { formatDay } from '../lib/format'
import { formatNaira, isPositiveAmount, toDecimalString } from '../lib/money'

const tiers: BillingPlanTier[] = ['small', 'medium', 'big']

export function PlatformBillingPlansPage() {
  const [plans, setPlans] = useState<BillingPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [tier, setTier] = useState<BillingPlanTier>('small')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await apiFetch('/api/platform/billing/plans/', 'get')
      setPlans(data)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load billing plans.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const createPlan = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      await apiFetch('/api/platform/billing/plans/', 'post', {
        body: { name: name.trim(), tier, description: description.trim() },
      })
      setName('')
      setDescription('')
      await load()
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Unable to create this plan.')
    } finally {
      setSaving(false)
    }
  }

  const deactivate = async (plan: BillingPlan) => {
    setError('')
    try {
      await apiFetch(buildApiPath('/api/platform/billing/plans/{id}/', { id: plan.id }), 'delete')
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to deactivate this plan.')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing plans"
        description="One plan per tier, with a versioned price for monthly, 3-month, 6-month, and annual billing."
      />
      <BillingTabs />

      <Card>
        <h2 className="font-heading text-lg font-semibold text-brand-navy">Create a plan</h2>
        <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={(event) => void createPlan(event)}>
          <Field
            label="Plan name"
            name="plan-name"
            value={name}
            required
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Small gym"
          />
          <div>
            <label htmlFor="plan-tier" className="mb-1.5 block text-sm font-semibold text-brand-text">
              Tier
            </label>
            <select
              id="plan-tier"
              value={tier}
              onChange={(event) => setTier(event.target.value as BillingPlanTier)}
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-brand-text outline-none focus:border-brand-navy-light focus:ring-2 focus:ring-brand-navy-light/20"
            >
              {tiers.map((value) => (
                <option key={value} value={value}>
                  {value[0].toUpperCase() + value.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Field
              label="Description"
              name="plan-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What this plan includes"
            />
          </div>
          {formError ? (
            <p role="alert" className="text-sm text-brand-danger sm:col-span-2">
              {formError}
            </p>
          ) : null}
          <div className="sm:col-span-2">
            <Button type="submit" loading={saving} disabled={!name.trim()}>
              Create plan
            </Button>
          </div>
        </form>
      </Card>

      {loading ? <LoadingState label="Loading plans…" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {!loading && !error && plans.length === 0 ? (
        <EmptyState
          title="No billing plans yet"
          description="Create a plan, then add a price for each billing interval you want to sell."
        />
      ) : null}

      {!loading && !error
        ? plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} onChanged={load} onDeactivate={() => void deactivate(plan)} />
          ))
        : null}
    </div>
  )
}

function PlanCard({
  plan,
  onChanged,
  onDeactivate,
}: {
  plan: BillingPlan
  onChanged: () => Promise<void>
  onDeactivate: () => void
}) {
  const [interval, setInterval] = useState<BillingInterval>('monthly')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const addPrice = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await apiFetch(
        buildApiPath('/api/platform/billing/plans/{id}/prices/', { id: plan.id }),
        'post',
        { body: { interval, amount: toDecimalString(amount) } },
      )
      setAmount('')
      await onChanged()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to add this price.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-xl font-semibold text-brand-navy">{plan.name}</h2>
            <Badge tone="navy">{plan.tier}</Badge>
            <Badge tone={plan.is_active ? 'success' : 'neutral'}>
              {plan.is_active ? 'Active' : 'Inactive'}
            </Badge>
            <Badge tone={plan.is_public ? 'success' : 'neutral'}>
              {plan.is_public ? 'Public' : 'Private'}
            </Badge>
          </div>
          {plan.description ? (
            <p className="mt-2 max-w-2xl text-sm text-brand-muted">{plan.description}</p>
          ) : null}
        </div>
        {plan.is_active ? (
          <Button variant="secondary" onClick={onDeactivate}>
            Deactivate
          </Button>
        ) : null}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-brand-text">Current prices</h3>
          {plan.prices.length === 0 ? (
            <p className="mt-2 text-sm text-brand-muted">No prices have been added.</p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-brand-muted">
                  <tr>
                    <th className="py-2 pr-3 font-semibold">Interval</th>
                    <th className="py-2 pr-3 font-semibold">Amount</th>
                    <th className="py-2 font-semibold">Effective</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {plan.prices.map((price: BillingPlanPrice) => (
                    <tr key={price.id}>
                      <td className="py-2 pr-3 text-brand-text">{intervalLabel(price.interval)}</td>
                      <td className="py-2 pr-3 font-semibold text-brand-text">
                        {formatNaira(price.amount)}
                      </td>
                      <td className="py-2 text-brand-muted">
                        {formatDay(price.effective_from)}
                        {price.is_active ? '' : ' · inactive'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <form onSubmit={(event) => void addPrice(event)} className="space-y-3">
          <h3 className="text-sm font-semibold text-brand-text">Add a price</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`price-interval-${plan.id}`}
                className="mb-1.5 block text-sm font-semibold text-brand-text"
              >
                Interval
              </label>
              <select
                id={`price-interval-${plan.id}`}
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
            <Field
              label="Amount (NGN)"
              name={`price-amount-${plan.id}`}
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="15000.00"
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-brand-danger">
              {error}
            </p>
          ) : null}
          <Button type="submit" loading={saving} disabled={!isPositiveAmount(amount)}>
            Add price
          </Button>
        </form>
      </div>
    </Card>
  )
}
