import { useCallback, useEffect, useState } from 'react'

import { apiFetch, buildApiPath } from '../api/client'
import type { MembershipPlan } from '../api/types'
import { ConfirmDialog } from '../components/ConfirmDialog'
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
import { formatDate } from '../lib/format'
import { formatNaira, isPositiveAmount, toDecimalString } from '../lib/money'

type Draft = {
  name: string
  price: string
  duration_days: string
  description: string
}

const emptyDraft: Draft = { name: '', price: '', duration_days: '30', description: '' }

function PlanForm({
  plan,
  busy,
  error,
  onCancel,
  onSubmit,
}: {
  plan: MembershipPlan | null
  busy: boolean
  error: string
  onCancel: () => void
  onSubmit: (draft: Draft) => void
}) {
  const [draft, setDraft] = useState<Draft>(
    plan
      ? {
          name: plan.name,
          price: plan.price,
          duration_days: String(plan.duration_days),
          description: plan.description ?? '',
        }
      : emptyDraft,
  )

  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }))

  const valid =
    draft.name.trim() !== '' &&
    isPositiveAmount(draft.price) &&
    /^\d+$/.test(draft.duration_days) &&
    Number(draft.duration_days) >= 1

  return (
    <Card>
      <h2 className="font-heading text-lg font-semibold text-brand-navy">
        {plan ? 'Edit plan' : 'New membership plan'}
      </h2>
      <form
        className="mt-4 grid gap-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (valid && !busy) onSubmit(draft)
        }}
      >
        <Field
          label="Plan name"
          name="plan-name"
          value={draft.name}
          onChange={(event) => update({ name: event.target.value })}
          placeholder="e.g. Monthly"
          disabled={busy}
        />
        <Field
          label="Price (NGN)"
          name="plan-price"
          inputMode="decimal"
          value={draft.price}
          onChange={(event) => update({ price: event.target.value })}
          placeholder="15000.00"
          hint="Amount in naira, up to two decimal places."
          disabled={busy}
        />
        <Field
          label="Duration (days)"
          name="plan-duration"
          inputMode="numeric"
          value={draft.duration_days}
          onChange={(event) => update({ duration_days: event.target.value })}
          placeholder="30"
          hint="How long a membership on this plan lasts."
          disabled={busy}
        />
        <div className="sm:col-span-2">
          <Field
            label="Description"
            name="plan-description"
            value={draft.description}
            onChange={(event) => update({ description: event.target.value })}
            placeholder="Optional note shown to staff"
            disabled={busy}
          />
        </div>

        {error ? (
          <p role="alert" className="text-sm text-brand-danger sm:col-span-2">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="submit" loading={busy} disabled={!valid}>
            {plan ? 'Save changes' : 'Create plan'}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  )
}

export function PlansPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<MembershipPlan | null>(null)
  const [creating, setCreating] = useState(false)
  const [deactivating, setDeactivating] = useState<MembershipPlan | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setPlans(await apiFetch('/api/membership-plans/', 'get'))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load membership plans.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const submit = async (draft: Draft) => {
    setBusy(true)
    setActionError('')
    const body = {
      name: draft.name.trim(),
      price: toDecimalString(draft.price),
      duration_days: Number(draft.duration_days),
      description: draft.description.trim(),
    }
    try {
      if (editing) {
        const updated = await apiFetch(
          buildApiPath('/api/membership-plans/{id}/', { id: editing.id }),
          'patch',
          { body },
        )
        setPlans((current) => current.map((row) => (row.id === updated.id ? updated : row)))
      } else {
        const created = await apiFetch('/api/membership-plans/', 'post', { body })
        setPlans((current) => [created, ...current])
      }
      setEditing(null)
      setCreating(false)
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Unable to save this plan.')
    } finally {
      setBusy(false)
    }
  }

  const toggleActive = async () => {
    if (!deactivating) return
    setBusy(true)
    setActionError('')
    try {
      const updated = await apiFetch(
        buildApiPath('/api/membership-plans/{id}/', { id: deactivating.id }),
        'patch',
        { body: { is_active: !deactivating.is_active } },
      )
      setPlans((current) => current.map((row) => (row.id === updated.id ? updated : row)))
      setDeactivating(null)
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Unable to update this plan.')
    } finally {
      setBusy(false)
    }
  }

  const showForm = creating || editing !== null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Membership plans"
        description="Plans set the price and length of a membership. Members can only be assigned to active plans."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void load()} disabled={loading}>
              Refresh
            </Button>
            <Button onClick={() => setCreating(true)} disabled={showForm}>
              New plan
            </Button>
          </div>
        }
      />

      {showForm ? (
        <PlanForm
          plan={editing}
          busy={busy}
          error={actionError}
          onCancel={() => {
            setCreating(false)
            setEditing(null)
            setActionError('')
          }}
          onSubmit={(draft) => void submit(draft)}
        />
      ) : null}

      {loading ? <LoadingState label="Loading plans…" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error && plans.length === 0 ? (
        <EmptyState
          title="No membership plans yet"
          description="Create your first plan so you can start signing members up."
          action={
            <Button onClick={() => setCreating(true)} disabled={showForm}>
              New plan
            </Button>
          }
        />
      ) : null}

      {!loading && !error && plans.length > 0 ? (
        <div className="space-y-4">
          {plans.map((plan) => (
            <Card key={plan.id}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-heading text-lg font-semibold text-brand-navy">
                      {plan.name}
                    </h2>
                    <Badge tone={plan.is_active ? 'success' : 'neutral'}>
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-2xl font-semibold text-brand-navy">
                    {formatNaira(plan.price)}
                    <span className="text-sm font-normal text-brand-muted">
                      {' '}
                      · {plan.duration_days} days
                    </span>
                  </p>
                  {plan.description ? (
                    <p className="mt-2 text-sm text-brand-muted">{plan.description}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-brand-muted">Updated {formatDate(plan.updated_at)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setCreating(false)
                      setEditing(plan)
                      setActionError('')
                    }}
                    disabled={showForm}
                  >
                    Edit
                  </Button>
                  <Button variant={plan.is_active ? 'danger' : 'secondary'} onClick={() => setDeactivating(plan)}>
                    {plan.is_active ? 'Deactivate' : 'Reactivate'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {!loading && !error && plans.some((plan) => plan.is_active === false) && plans.every(
        (plan) => !plan.is_active,
      ) ? (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          Every plan is deactivated, so new memberships cannot be created until you reactivate one.
        </p>
      ) : null}

      <ConfirmDialog
        open={deactivating !== null}
        title={deactivating?.is_active ? 'Deactivate plan' : 'Reactivate plan'}
        description={
          deactivating?.is_active
            ? `"${deactivating.name}" will no longer be offered for new or renewed memberships. Existing memberships keep their price and end date.`
            : `"${deactivating?.name ?? ''}" will be available for new and renewed memberships again.`
        }
        confirmLabel={deactivating?.is_active ? 'Deactivate' : 'Reactivate'}
        busy={busy}
        onConfirm={() => void toggleActive()}
        onCancel={() => {
          if (!busy) setDeactivating(null)
        }}
      />
    </div>
  )
}
