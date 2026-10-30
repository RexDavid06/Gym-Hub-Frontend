import { useCallback, useEffect, useState } from 'react'

import { apiFetch } from '../api/client'
import type { InviteList } from '../api/types'
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui'
import { formatDate, formatRole } from '../lib/format'

function inviteStatus(invite: InviteList) {
  if (invite.used_at) return { label: 'Used', tone: 'success' as const }
  if (invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now()) {
    return { label: 'Expired', tone: 'danger' as const }
  }
  return { label: 'Pending', tone: 'warning' as const }
}

export function InvitesListPage() {
  const [invites, setInvites] = useState<InviteList[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setInvites(await apiFetch('/api/invites/', 'get'))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load invites.')
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
        title="Invites"
        description="Every invite in your gym, including used and expired codes."
        action={
          <Button variant="secondary" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        }
      />

      {loading ? <LoadingState label="Loading invites…" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error && invites.length === 0 ? (
        <EmptyState
          title="No invites yet"
          description="Invite an admin, trainer, or member to see it listed here."
        />
      ) : null}

      {!loading && !error && invites.length > 0 ? (
        <>
          <Card className="hidden overflow-x-auto p-0 sm:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-brand-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Person</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Created</th>
                  <th className="px-5 py-3 font-semibold">Expires</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invites.map((invite) => {
                  const status = inviteStatus(invite)
                  return (
                    <tr key={invite.id}>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-brand-navy">{invite.name || 'Unnamed'}</p>
                        <p className="text-xs text-brand-muted">{invite.phone}</p>
                      </td>
                      <td className="px-5 py-4 text-brand-text">{formatRole(invite.role)}</td>
                      <td className="px-5 py-4 text-brand-muted">{formatDate(invite.created_at)}</td>
                      <td className="px-5 py-4 text-brand-muted">{formatDate(invite.expires_at)}</td>
                      <td className="px-5 py-4">
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>

          <div className="space-y-3 sm:hidden">
            {invites.map((invite) => {
              const status = inviteStatus(invite)
              return (
                <Card key={invite.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-heading font-semibold text-brand-navy">
                        {invite.name || 'Unnamed'}
                      </p>
                      <p className="text-sm text-brand-muted">{invite.phone}</p>
                    </div>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-brand-muted">Role</dt>
                      <dd className="mt-0.5 text-brand-text">{formatRole(invite.role)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-brand-muted">Expires</dt>
                      <dd className="mt-0.5 text-brand-text">{formatDate(invite.expires_at)}</dd>
                    </div>
                  </dl>
                </Card>
              )
            })}
          </div>
          <p className="text-xs text-brand-muted">
            Invite codes are only shown once when they are created and are never displayed here.
          </p>
        </>
      ) : null}
    </div>
  )
}
