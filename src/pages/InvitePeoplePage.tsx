import { useState } from 'react'

import { apiFetch } from '../api/client'
import type { InviteCreated, InviteRole } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { copyText } from '../lib/clipboard'
import { inviteRolesFor, roleLabel } from '../lib/permissions'
import { Link } from '../components/Link'
import { Badge, Button, Card, Field, PageHeader } from '../components/ui'
import { formatDate } from '../lib/format'

export function InvitePeoplePage() {
  const { profile } = useAuth()
  const roles = profile ? inviteRolesFor(profile) : []
  const [role, setRole] = useState<InviteRole>(roles[0] ?? 'member')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState<InviteCreated | null>(null)
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState('')

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setCopyError('')
    setCopied(false)
    try {
      const invite = await apiFetch('/api/invites/', 'post', {
        body: { role, name: name.trim(), phone: phone.trim() },
      })
      setCreated(invite)
      setName('')
      setPhone('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create the invite.')
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!created) return
    setCopyError('')
    try {
      await copyText(created.code)
      setCopied(true)
    } catch (caught) {
      setCopyError(caught instanceof Error ? caught.message : 'Unable to copy the code.')
    }
  }

  if (!profile || roles.length === 0) return null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invite people"
        description="Create a one-time invite for someone joining your gym. Each invite expires after seven days."
        action={
          profile.role === 'owner' ? (
            <Link
              to="/invites"
              className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-brand-navy hover:bg-slate-50"
            >
              View invite history
            </Link>
          ) : undefined
        }
      />

      {created ? (
        <Card className="border-amber-300 bg-amber-50">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Badge tone="warning">One-time code</Badge>
              <h2 className="mt-3 font-heading text-xl font-semibold text-brand-navy">
                Invite ready for {created.name}
              </h2>
              <p className="mt-1 text-sm text-amber-900">
                {roleLabel(created.role)} · {created.phone} · expires {formatDate(created.expires_at)}
              </p>
            </div>
            <Button variant="secondary" onClick={() => setCreated(null)}>
              Done
            </Button>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <code className="min-w-0 flex-1 break-all rounded-xl border border-amber-300 bg-white px-4 py-3 font-mono text-sm text-brand-text">
              {created.code}
            </code>
            <Button onClick={() => void copy()}>{copied ? 'Copied' : 'Copy code'}</Button>
          </div>
          {copyError ? (
            <p role="alert" className="mt-2 text-sm text-red-700">
              {copyError} Select the code above and copy it manually.
            </p>
          ) : null}
          <p role="alert" className="mt-4 rounded-xl bg-amber-100 p-3 text-sm font-semibold text-amber-900">
            Copy this code now. For security, it cannot be shown again after you leave this page.
          </p>
        </Card>
      ) : null}

      <Card>
        <form className="space-y-5" onSubmit={submit}>
          <div>
            <label htmlFor="invite-role" className="mb-1.5 block text-sm font-semibold text-brand-text">
              Role
            </label>
            <select
              id="invite-role"
              value={role}
              onChange={(event) => setRole(event.target.value as InviteRole)}
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-brand-text outline-none focus:border-brand-navy-light focus:ring-2 focus:ring-brand-navy-light/20"
            >
              {roles.map((option) => (
                <option key={option} value={option}>
                  {roleLabel(option)}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-brand-muted">
              {profile.role === 'owner'
                ? 'Admins can be limited later from the Team page.'
                : 'You can invite the roles covered by your staff permissions.'}
            </p>
          </div>
          <Field
            label="Full name"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="New team member"
            required
          />
          <Field
            label="Phone number"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+234 800 000 0000"
            hint="They will use this number to sign in after redeeming the code."
            required
          />
          {error ? (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
              {error}
            </p>
          ) : null}
          <Button type="submit" loading={busy}>
            Create invite
          </Button>
        </form>
      </Card>
    </div>
  )
}
