import { useCallback, useEffect, useState } from 'react'

import { apiFetch, buildApiPath } from '../api/client'
import type { UserList, UserSummary } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui'
import { canAssignTrainers } from '../lib/permissions'

function MemberCard({
  member,
  trainers,
  editable,
  onUpdated,
}: {
  member: UserList
  trainers: UserSummary[]
  editable: boolean
  onUpdated: (memberId: number, trainer: UserSummary | null) => void
}) {
  const currentTrainerId = member.assigned_trainer?.id
  const [selected, setSelected] = useState(currentTrainerId ? String(currentTrainerId) : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setSelected(currentTrainerId ? String(currentTrainerId) : '')
  }, [currentTrainerId])

  const assign = async (trainerId: number | null) => {
    setBusy(true)
    setError('')
    try {
      const result = await apiFetch(
        buildApiPath('/api/members/{user_id}/trainer/', { user_id: member.id }),
        'put',
        { body: { trainer_id: trainerId } },
      )
      onUpdated(member.id, result.trainer)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update this assignment.')
    } finally {
      setBusy(false)
    }
  }

  const unassign = async () => {
    setBusy(true)
    setError('')
    try {
      await apiFetch(
        buildApiPath('/api/members/{user_id}/trainer/', { user_id: member.id }),
        'delete',
      )
      onUpdated(member.id, null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to remove this assignment.')
    } finally {
      setBusy(false)
    }
  }

  const canAssign = editable && selected !== '' && Number(selected) !== currentTrainerId

  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-lg font-semibold text-brand-navy">
              {member.name || 'Unnamed member'}
            </h2>
            <Badge tone={member.is_active === false ? 'danger' : 'success'}>
              {member.is_active === false ? 'Inactive' : 'Active'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-brand-muted">{member.phone}</p>
          <p className="mt-3 text-sm text-brand-text">
            Trainer:{' '}
            <span className="font-semibold">
              {member.assigned_trainer?.name || 'Not assigned'}
            </span>
            {member.assigned_trainer ? (
              <span className="text-brand-muted"> · {member.assigned_trainer.phone}</span>
            ) : null}
          </p>
        </div>

        {editable ? (
          <div className="w-full sm:max-w-xs">
            <label
              htmlFor={`trainer-${member.id}`}
              className="mb-1.5 block text-sm font-semibold text-brand-text"
            >
              Assign trainer
            </label>
            <select
              id={`trainer-${member.id}`}
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
              disabled={busy}
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-brand-text outline-none focus:border-brand-navy-light focus:ring-2 focus:ring-brand-navy-light/20 disabled:opacity-60"
            >
              <option value="">Select a trainer</option>
              {trainers.map((trainer) => (
                <option key={trainer.id} value={trainer.id}>
                  {trainer.name || trainer.phone}
                </option>
              ))}
            </select>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                onClick={() => void assign(Number(selected))}
                disabled={!canAssign}
                loading={busy}
              >
                Assign
              </Button>
              {member.assigned_trainer ? (
                <Button variant="secondary" onClick={() => void unassign()} disabled={busy}>
                  Unassign
                </Button>
              ) : null}
            </div>
            {error ? (
              <p role="alert" className="mt-3 text-sm text-brand-danger">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  )
}

export function MembersPage() {
  const { profile } = useAuth()
  const editable = profile ? canAssignTrainers(profile) : false
  const [members, setMembers] = useState<UserList[]>([])
  const [trainers, setTrainers] = useState<UserSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [memberRows, trainerRows] = await Promise.all([
        apiFetch('/api/users/', 'get', { query: { role: 'member' } }),
        editable
          ? apiFetch('/api/trainers/', 'get')
          : Promise.resolve<UserSummary[]>([]),
      ])
      setMembers(memberRows)
      setTrainers(trainerRows)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load members.')
    } finally {
      setLoading(false)
    }
  }, [editable])

  useEffect(() => {
    void load()
  }, [load])

  const updateMember = (memberId: number, trainer: UserSummary | null) => {
    setMembers((current) =>
      current.map((member) =>
        member.id === memberId ? { ...member, assigned_trainer: trainer } : member,
      ),
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description="Assign each member to a trainer. Trainers can only work with members assigned to them."
        action={
          <Button variant="secondary" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        }
      />

      {loading ? <LoadingState label="Loading members…" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error && members.length === 0 ? (
        <EmptyState
          title="No members yet"
          description="Invite a member first, then assign them to a trainer here."
        />
      ) : null}

      {!loading && !error && members.length > 0 ? (
        <div className="space-y-4">
          {members.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              trainers={trainers}
              editable={editable}
              onUpdated={updateMember}
            />
          ))}
        </div>
      ) : null}

      {!loading && !error && editable && trainers.length === 0 && members.length > 0 ? (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          There are no active trainers yet. Invite a trainer before assigning members.
        </p>
      ) : null}
    </div>
  )
}
