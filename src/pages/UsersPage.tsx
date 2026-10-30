import { useCallback, useEffect, useState } from 'react'

import { apiFetch, buildApiPath } from '../api/client'
import type { UserList, UserRole } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui'
import { formatDate, formatRole } from '../lib/format'
import { userRoleFiltersFor } from '../lib/permissions'

const roleTones = {
  owner: 'navy',
  admin: 'warning',
  trainer: 'success',
  member: 'neutral',
  super_admin: 'danger',
} as const

export function UsersPage() {
  const { profile } = useAuth()
  const [filter, setFilter] = useState<UserRole | 'all'>('all')
  const [users, setUsers] = useState<UserList[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [target, setTarget] = useState<UserList | null>(null)
  const [deactivating, setDeactivating] = useState(false)

  const load = useCallback(async (role: UserRole | 'all') => {
    setLoading(true)
    setError('')
    try {
      setUsers(
        await apiFetch('/api/users/', 'get', {
          query: role === 'all' ? undefined : { role },
        }),
      )
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load users.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(filter)
  }, [filter, load])

  const deactivate = async () => {
    if (!target) return
    setDeactivating(true)
    setActionError('')
    try {
      const updated = await apiFetch(
        buildApiPath('/api/users/{user_id}/deactivate/', { user_id: target.id }),
        'post',
      )
      setUsers((current) => current.map((user) => (user.id === updated.id ? updated : user)))
      setTarget(null)
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Unable to deactivate this user.')
    } finally {
      setDeactivating(false)
    }
  }

  if (!profile) return null
  const filters = userRoleFiltersFor(profile)
  const canDeactivate = profile.role === 'owner'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Everyone in your gym, filtered by role. Access is enforced by the API."
        action={
          <Button variant="secondary" onClick={() => void load(filter)} disabled={loading}>
            Refresh
          </Button>
        }
      />

      <Card>
        <label htmlFor="role-filter" className="mb-1.5 block text-sm font-semibold text-brand-text">
          Filter by role
        </label>
        <select
          id="role-filter"
          value={filter}
          onChange={(event) => setFilter(event.target.value as UserRole | 'all')}
          className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-brand-text outline-none focus:border-brand-navy-light focus:ring-2 focus:ring-brand-navy-light/20 sm:max-w-xs"
        >
          {filters.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Card>

      {actionError ? (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
          {actionError}
        </p>
      ) : null}
      {loading ? <LoadingState label="Loading users…" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load(filter)} /> : null}
      {!loading && !error && users.length === 0 ? (
        <EmptyState
          title="No users found"
          description={
            filter === 'all'
              ? 'There are no users to show in this gym yet.'
              : `There are no ${formatRole(filter).toLowerCase()} accounts to show.`
          }
        />
      ) : null}

      {!loading && !error && users.length > 0 ? (
        <>
          <Card className="hidden overflow-x-auto p-0 md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-brand-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Person</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Joined</th>
                  {canDeactivate ? <th className="px-5 py-3 text-right font-semibold">Actions</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => {
                  const isActive = user.is_active !== false
                  const canAct = canDeactivate && isActive && user.role !== 'owner'
                  return (
                    <tr key={user.id}>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-brand-navy">{user.name || 'Unnamed'}</p>
                        <p className="text-xs text-brand-muted">{user.phone}</p>
                      </td>
                      <td className="px-5 py-4">
                        <Badge tone={roleTones[user.role ?? 'member']}>
                          {formatRole(user.role)}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <Badge tone={isActive ? 'success' : 'danger'}>
                          {isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-brand-muted">{formatDate(user.date_joined)}</td>
                      {canDeactivate ? (
                        <td className="px-5 py-4 text-right">
                          {canAct ? (
                            <Button variant="secondary" onClick={() => setTarget(user)}>
                              Deactivate
                            </Button>
                          ) : (
                            <span className="text-xs text-brand-muted">—</span>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>

          <div className="space-y-3 md:hidden">
            {users.map((user) => {
              const isActive = user.is_active !== false
              const canAct = canDeactivate && isActive && user.role !== 'owner'
              return (
                <Card key={user.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-heading font-semibold text-brand-navy">
                        {user.name || 'Unnamed'}
                      </p>
                      <p className="text-sm text-brand-muted">{user.phone}</p>
                    </div>
                    <Badge tone={roleTones[user.role ?? 'member']}>{formatRole(user.role)}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <Badge tone={isActive ? 'success' : 'danger'}>
                      {isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {canAct ? (
                      <Button variant="secondary" onClick={() => setTarget(user)}>
                        Deactivate
                      </Button>
                    ) : null}
                  </div>
                  <p className="mt-3 text-xs text-brand-muted">Joined {formatDate(user.date_joined)}</p>
                </Card>
              )
            })}
          </div>
        </>
      ) : null}

      <ConfirmDialog
        open={target !== null}
        title="Deactivate user"
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
