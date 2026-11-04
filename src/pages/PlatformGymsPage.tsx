import { useCallback, useEffect, useState } from 'react'

import { apiFetch } from '../api/client'
import type { PaginatedPlatformGyms, PlatformPlanTier } from '../api/types'
import { Link } from '../components/Link'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from '../components/ui'
import { formatDay } from '../lib/format'

const PAGE_SIZE = 10

type StatusFilter = 'all' | 'active' | 'suspended'
type TierFilter = 'all' | PlatformPlanTier

export function PlatformGymsPage() {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [tier, setTier] = useState<TierFilter>('all')
  const [page, setPage] = useState(1)

  const [data, setData] = useState<PaginatedPlatformGyms | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const timeout = window.setTimeout(() => setQuery(search.trim()), 300)
    return () => window.clearTimeout(timeout)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await apiFetch('/api/platform/gyms/', 'get', {
        query: {
          page,
          page_size: PAGE_SIZE,
          ...(query ? { search: query } : {}),
          ...(status === 'all' ? {} : { is_active: status === 'active' }),
          ...(tier === 'all' ? {} : { plan_tier: tier }),
        },
      })
      setData(result as PaginatedPlatformGyms)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load gyms.')
    } finally {
      setLoading(false)
    }
  }, [page, query, status, tier])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [query, status, tier])

  const total = data?.count ?? 0
  const pageCount = Math.max(Math.ceil(total / PAGE_SIZE), 1)
  const firstRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const lastRow = Math.min(page * PAGE_SIZE, total)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gyms"
        description="Search every gym, filter by plan or status, and open a gym to suspend or reactivate it."
        action={
          <Link
            to="/platform"
            className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-brand-navy hover:bg-slate-50"
          >
            Back to overview
          </Link>
        }
      />

      <Card>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label
              htmlFor="platform-gym-search"
              className="mb-1.5 block text-sm font-semibold text-brand-text"
            >
              Search
            </label>
            <input
              id="platform-gym-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Gym name"
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-brand-text outline-none focus:border-brand-navy-light focus:ring-2 focus:ring-brand-navy-light/20"
            />
          </div>
          <div>
            <label
              htmlFor="platform-gym-status"
              className="mb-1.5 block text-sm font-semibold text-brand-text"
            >
              Status
            </label>
            <select
              id="platform-gym-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as StatusFilter)}
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-brand-text outline-none focus:border-brand-navy-light focus:ring-2 focus:ring-brand-navy-light/20"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="platform-gym-tier"
              className="mb-1.5 block text-sm font-semibold text-brand-text"
            >
              Plan tier
            </label>
            <select
              id="platform-gym-tier"
              value={tier}
              onChange={(event) => setTier(event.target.value as TierFilter)}
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-brand-text outline-none focus:border-brand-navy-light focus:ring-2 focus:ring-brand-navy-light/20"
            >
              <option value="all">All plans</option>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="big">Big</option>
            </select>
          </div>
        </div>
      </Card>

      {loading ? <LoadingState label="Loading gyms…" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {!loading && !error && data ? (
        data.results.length === 0 ? (
          <EmptyState
            title="No gyms match these filters"
            description="Try a different search term, status, or plan tier."
          />
        ) : (
          <Card>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-brand-muted">
                  <tr>
                    <th className="py-2 pr-4 font-semibold">Gym</th>
                    <th className="py-2 pr-4 font-semibold">Owner</th>
                    <th className="py-2 pr-4 font-semibold">Plan</th>
                    <th className="py-2 pr-4 font-semibold">Members</th>
                    <th className="py-2 pr-4 font-semibold">Trainers</th>
                    <th className="py-2 pr-4 font-semibold">Status</th>
                    <th className="py-2 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.results.map((gym) => (
                    <tr key={gym.id}>
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-brand-navy">{gym.name}</p>
                        <p className="text-xs text-brand-muted">Joined {formatDay(gym.created_at)}</p>
                      </td>
                      <td className="py-3 pr-4 text-brand-muted">
                        {gym.owner ? gym.owner.name || gym.owner.phone : '—'}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge tone="navy">{gym.plan_tier}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-brand-text">{gym.member_count}</td>
                      <td className="py-3 pr-4 text-brand-text">{gym.trainer_count}</td>
                      <td className="py-3 pr-4">
                        <Badge tone={gym.is_active ? 'success' : 'danger'}>
                          {gym.is_active ? 'Active' : 'Suspended'}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          to={`/platform/gyms/${gym.id}`}
                          className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-brand-navy hover:bg-slate-50"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="space-y-3 md:hidden">
              {data.results.map((gym) => (
                <li key={gym.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-brand-navy">{gym.name}</p>
                      <p className="mt-1 text-xs text-brand-muted">
                        {gym.owner ? gym.owner.name || gym.owner.phone : 'No active owner'}
                      </p>
                    </div>
                    <Badge tone={gym.is_active ? 'success' : 'danger'}>
                      {gym.is_active ? 'Active' : 'Suspended'}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-brand-muted">
                    {gym.member_count} members · {gym.trainer_count} trainers · {gym.plan_tier}
                  </p>
                  <Link
                    to={`/platform/gyms/${gym.id}`}
                    className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-brand-navy hover:bg-slate-50"
                  >
                    Open gym
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <p className="text-sm text-brand-muted">
                {firstRow}–{lastRow} of {total} gyms
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setPage((current) => Math.min(current + 1, pageCount))}
                  disabled={page >= pageCount}
                >
                  Next
                </Button>
              </div>
            </div>
          </Card>
        )
      ) : null}
    </div>
  )
}
