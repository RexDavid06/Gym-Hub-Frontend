import { useCallback, useEffect, useState } from 'react'

import { apiFetch, buildApiPath } from '../api/client'
import type { Branch } from '../api/types'
import { ConfirmDialog } from '../components/ConfirmDialog'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  PageHeader,
} from '../components/ui'

function sortBranches(branches: Branch[]) {
  return [...branches].sort((a, b) => a.name.localeCompare(b.name))
}

export function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Branch | null>(null)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [actionError, setActionError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setBranches(sortBranches(await apiFetch('/api/branches/', 'get')))
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Unable to load branches.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setName('')
    setAddress('')
    setFormError('')
    setFormOpen(true)
  }

  const openEdit = (branch: Branch) => {
    setEditing(branch)
    setName(branch.name)
    setAddress(branch.address ?? '')
    setFormError('')
    setFormOpen(true)
  }

  const closeForm = () => {
    if (saving) return
    setFormOpen(false)
    setEditing(null)
    setFormError('')
  }

  const submit = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setFormError('Enter a branch name.')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const saved = editing
        ? await apiFetch(
            buildApiPath('/api/branches/{id}/', { id: editing.id }),
            'patch',
            {
              body: { name: trimmedName, address: address.trim() },
            },
          )
        : await apiFetch('/api/branches/', 'post', {
            body: { name: trimmedName, address: address.trim() },
          })
      setBranches((current) =>
        sortBranches(
          current.some((branch) => branch.id === saved.id)
            ? current.map((branch) => (branch.id === saved.id ? saved : branch))
            : [...current, saved],
        ),
      )
      setFormOpen(false)
      setEditing(null)
    } catch (caught) {
      setFormError(
        caught instanceof Error
          ? caught.message
          : 'Unable to save this branch.',
      )
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setActionError('')
    try {
      await apiFetch(
        buildApiPath('/api/branches/{id}/', { id: deleteTarget.id }),
        'delete',
      )
      setBranches((current) =>
        current.filter((branch) => branch.id !== deleteTarget.id),
      )
      setDeleteTarget(null)
    } catch (caught) {
      setActionError(
        caught instanceof Error
          ? caught.message
          : 'Unable to delete this branch.',
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branches"
        description="Create the locations your gym operates. Assign people to a branch from the Users page."
        action={
          <Button onClick={openCreate} disabled={saving}>
            Add branch
          </Button>
        }
      />

      {actionError ? (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
        >
          {actionError}
        </p>
      ) : null}
      {loading ? <LoadingState label="Loading branches…" /> : null}
      {!loading && error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : null}
      {!loading && !error && branches.length === 0 && !formOpen ? (
        <EmptyState
          title="No branches yet"
          description="Add your first branch so you can assign staff and members to it."
          action={<Button onClick={openCreate}>Add branch</Button>}
        />
      ) : null}

      {formOpen ? (
        <Card>
          <h2 className="font-heading text-lg font-semibold text-brand-navy">
            {editing ? 'Edit branch' : 'New branch'}
          </h2>
          <form
            className="mt-4 grid gap-4 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault()
              void submit()
            }}
          >
            <Field
              label="Branch name"
              name="branch-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Lekki"
              disabled={saving}
            />
            <div className="sm:col-span-2">
              <label
                htmlFor="branch-address"
                className="mb-1.5 block text-sm font-semibold text-brand-text"
              >
                Address
              </label>
              <textarea
                id="branch-address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Street, area, city"
                rows={3}
                disabled={saving}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-brand-text outline-none transition placeholder:text-brand-muted focus:border-brand-navy-light focus:ring-2 focus:ring-brand-navy-light/20 disabled:opacity-60"
              />
            </div>
            {formError ? (
              <p
                role="alert"
                className="text-sm text-brand-danger sm:col-span-2"
              >
                {formError}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button type="submit" loading={saving}>
                {editing ? 'Save changes' : 'Create branch'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={closeForm}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {!loading && !error && branches.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {branches.map((branch) => (
            <Card key={branch.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-heading text-lg font-semibold text-brand-navy">
                    {branch.name}
                  </h2>
                  <p className="mt-1 text-sm text-brand-muted">
                    {branch.address || 'No address added'}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="secondary" onClick={() => openEdit(branch)}>
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => setDeleteTarget(branch)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete branch"
        description={
          deleteTarget
            ? `${deleteTarget.name} will be removed. Anyone assigned to it will become unassigned, but their account stays in the gym.`
            : ''
        }
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={() => void remove()}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null)
        }}
      />
    </div>
  )
}
