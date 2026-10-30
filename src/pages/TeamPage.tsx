import { useCallback, useEffect, useState } from 'react'

import { apiFetch, buildApiPath } from '../api/client'
import type { StaffPermissionCode, UserList } from '../api/types'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui'
import { formatDate, formatRole } from '../lib/format'
import { staffPermissions } from '../lib/permissions'

function PermissionSwitch({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  disabled: boolean
  onChange: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-3.5">
      <div>
        <p className="text-sm font-semibold text-brand-text">{label}</p>
        <p className="mt-0.5 text-xs text-brand-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={onChange}
        className={`relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy-light disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? 'bg-brand-orange' : 'bg-slate-300'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

export function TeamPage() {
  const [admins, setAdmins] = useState<UserList[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [target, setTarget] = useState<UserList | null>(null)
  const [deactivating, setDeactivating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setAdmins(await apiFetch('/api/admins/', 'get'))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load the team.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const togglePermission = async (admin: UserList, code: StaffPermissionCode) => {
    setBusyId(admin.id)
    setActionError('')
    const codes = new Set(admin.permission_codes as StaffPermissionCode[])
    if (codes.has(code)) codes.delete(code)
    else codes.add(code)
    try {
      const updated = await apiFetch(
        buildApiPath('/api/admins/{user_id}/permissions/', { user_id: admin.id }),
        'put',
        { body: { codes: [...codes] } },
      )
      setAdmins((current) => current.map((row) => (row.id === updated.id ? updated : row)))
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Unable to update permissions.')
    } finally {
      setBusyId(null)
    }
  }

  const deactivate = async () => {
    if (!target) return
    setDeactivating(true)
    setActionError('')
    try {
      const updated = await apiFetch(
        buildApiPath('/api/users/{user_id}/deactivate/', { user_id: target.id }),
        'post',
      )
      setAdmins((current) => current.map((row) => (row.id === updated.id ? updated : row)))
      setTarget(null)
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Unable to deactivate this admin.')
    } finally {
      setDeactivating(false)
    }
  }

  const activeAdmins = admins.filter((admin) => admin.is_active !== false)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Admins can help run the gym. Choose exactly which areas each admin can access."
        action={
          <Button variant="secondary" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        }
      />

      {loading ? <LoadingState label="Loading admins…" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {actionError ? (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
          {actionError}
        </p>
      ) : null}
      {!loading && !error && admins.length === 0 ? (
        <EmptyState
          title="No admins yet"
          description="Invite an admin to give someone a limited staff account."
        />
      ) : null}

      {!loading && !error && admins.length > 0 ? (
        <div className="space-y-4">
          {admins.map((admin) => {
            const isInactive = admin.is_active === false
            const busy = busyId === admin.id
            return (
              <Card key={admin.id} className={isInactive ? 'opacity-75' : undefined}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-heading text-lg font-semibold text-brand-navy">
                        {admin.name || 'Unnamed admin'}
                      </h2>
                      <Badge tone={isInactive ? 'danger' : 'success'}>
                        {isInactive ? 'Inactive' : 'Active'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-brand-muted">{admin.phone}</p>
                    <p className="mt-1 text-xs text-brand-muted">
                      {formatRole(admin.role)} · joined {formatDate(admin.date_joined)}
                    </p>
                  </div>
                  {!isInactive ? (
                    <Button variant="danger" onClick={() => setTarget(admin)}>
                      Deactivate
                    </Button>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {staffPermissions.map((permission) => (
                    <PermissionSwitch
                      key={permission.code}
                      label={permission.label}
                      description={permission.description}
                      checked={admin.permission_codes.includes(permission.code)}
                      disabled={busy || isInactive}
                      onChange={() => void togglePermission(admin, permission.code)}
                    />
                  ))}
                </div>
              </Card>
            )
          })}
        </div>
      ) : null}

      {!loading && !error && admins.length > 0 && activeAdmins.length === 0 ? (
        <p className="text-sm text-brand-muted">
          All admin accounts are currently inactive. Invite a new admin to continue.
        </p>
      ) : null}

      <ConfirmDialog
        open={target !== null}
        title="Deactivate admin"
        description={
          target
            ? `${target.name || target.phone} will immediately lose access to Gym Hub. Their account stays in the gym, but they will not be able to sign in.`
            : ''
        }
        confirmLabel="Deactivate"
        busy={deactivating}
        onConfirm={() => void deactivate()}
        onCancel={() => {
          if (!deactivating) setTarget(null)
        }}
      />
    </div>
  )
}
