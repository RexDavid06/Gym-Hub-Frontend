import { useCallback, useEffect, useState } from 'react'

import { apiFetch, buildApiPath } from '../api/client'
import type { PlatformGymDetail } from '../api/types'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { SuspendGymDialog } from '../components/SuspendGymDialog'
import { Link } from '../components/Link'
import { Badge, Button, Card, ErrorState, LoadingState, PageHeader } from '../components/ui'
import { formatDate, formatDay } from '../lib/format'

export function PlatformGymDetailPage({ gymId }: { gymId: number }) {
  const [gym, setGym] = useState<PlatformGymDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [suspendOpen, setSuspendOpen] = useState(false)
  const [reactivateOpen, setReactivateOpen] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await apiFetch(buildApiPath('/api/platform/gyms/{id}/', { id: gymId }), 'get')
      setGym(result)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load this gym.')
    } finally {
      setLoading(false)
    }
  }, [gymId])

  useEffect(() => {
    void load()
  }, [load])

  const updateActiveState = async (isActive: boolean, reason = '') => {
    setActionBusy(true)
    setActionError('')
    try {
      const result = await apiFetch(
        buildApiPath('/api/platform/gyms/{id}/', { id: gymId }),
        'patch',
        {
          body: isActive
            ? { is_active: true }
            : { is_active: false, suspension_reason: reason },
        },
      )
      setGym(result)
      setSuspendOpen(false)
      setReactivateOpen(false)
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Unable to update this gym.')
    } finally {
      setActionBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={gym ? gym.name : 'Gym'}
        description={gym ? `${gym.plan_tier} plan · joined ${formatDay(gym.created_at)}` : 'Platform gym record.'}
        action={
          <Link
            to="/platform/gyms"
            className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-brand-navy hover:bg-slate-50"
          >
            Back to gyms
          </Link>
        }
      />

      {loading ? <LoadingState label="Loading gym…" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {!loading && !error && gym ? (
        <>
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={gym.is_active ? 'success' : 'danger'}>
                    {gym.is_active ? 'Active' : 'Suspended'}
                  </Badge>
                  <Badge tone="navy">{gym.plan_tier}</Badge>
                </div>
                <h2 className="mt-3 font-heading text-xl font-semibold text-brand-navy">
                  {gym.name}
                </h2>
                <p className="mt-1 text-sm text-brand-muted">
                  {gym.owner
                    ? `Owner: ${gym.owner.name || gym.owner.phone}`
                    : 'No active owner on this gym'}
                </p>
              </div>
              {gym.is_active ? (
                <Button
                  variant="danger"
                  onClick={() => {
                    setActionError('')
                    setSuspendOpen(true)
                  }}
                >
                  Suspend gym
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setActionError('')
                    setReactivateOpen(true)
                  }}
                >
                  Reactivate gym
                </Button>
              )}
            </div>

            {actionError && !suspendOpen && !reactivateOpen ? (
              <p role="alert" className="mt-4 text-sm text-brand-danger">
                {actionError}
              </p>
            ) : null}
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: 'Members', value: gym.member_count },
              { label: 'Trainers', value: gym.trainer_count },
              { label: 'Admins', value: gym.admin_count },
              { label: 'Active memberships', value: gym.active_membership_count },
              { label: 'Expired memberships', value: gym.expired_membership_count },
            ].map((stat) => (
              <Card key={stat.label}>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                  {stat.label}
                </p>
                <p className="mt-2 font-heading text-3xl font-semibold text-brand-navy">
                  {stat.value}
                </p>
              </Card>
            ))}
          </div>

          {gym.is_active ? (
            <Card>
              <h2 className="font-heading text-lg font-semibold text-brand-navy">Suspension</h2>
              <p className="mt-2 text-sm text-brand-muted">
                This gym is active. Suspending it requires a reason and blocks every user in the
                gym immediately.
              </p>
            </Card>
          ) : (
            <Card>
              <h2 className="font-heading text-lg font-semibold text-brand-navy">Suspension</h2>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-brand-muted">Suspended at</dt>
                  <dd className="mt-1 font-semibold text-brand-text">
                    {formatDate(gym.suspended_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-brand-muted">Suspended by</dt>
                  <dd className="mt-1 font-semibold text-brand-text">
                    {gym.suspended_by ? gym.suspended_by.name || gym.suspended_by.phone : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-brand-muted">Reason</dt>
                  <dd className="mt-1 font-semibold text-brand-text">
                    {gym.suspension_reason || '—'}
                  </dd>
                </div>
              </dl>
            </Card>
          )}
        </>
      ) : null}

      {gym ? (
        <>
          <SuspendGymDialog
            open={suspendOpen}
            gymName={gym.name}
            busy={actionBusy}
            error={actionError}
            onCancel={() => {
              if (!actionBusy) {
                setSuspendOpen(false)
                setActionError('')
              }
            }}
            onConfirm={(reason) => void updateActiveState(false, reason)}
          />
          <ConfirmDialog
            open={reactivateOpen}
            title={`Reactivate ${gym.name}?`}
            description="Everyone in this gym can log in and use the API again. Suspension details are cleared."
            confirmLabel="Reactivate gym"
            busy={actionBusy}
            onCancel={() => {
              if (!actionBusy) {
                setReactivateOpen(false)
                setActionError('')
              }
            }}
            onConfirm={() => void updateActiveState(true)}
          />
        </>
      ) : null}
    </div>
  )
}
