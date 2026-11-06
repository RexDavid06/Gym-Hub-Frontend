import { useCallback, useEffect, useState } from 'react'

import { apiFetch, buildApiPath } from '../api/client'
import type {
  Notification as NotificationRecord,
  NotificationChannel,
  NotificationEvent,
  NotificationScheduleKey,
  NotificationStatus,
  PaginatedNotifications,
} from '../api/types'
import { useAuth } from '../auth/useAuth'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from '../components/ui'
import { formatDate } from '../lib/format'
import { canRetryNotifications } from '../lib/permissions'

type Filters = {
  event: NotificationEvent | ''
  status: NotificationStatus | ''
  channel: NotificationChannel | ''
  schedule_key: NotificationScheduleKey | ''
}

const emptyFilters: Filters = {
  event: '',
  status: '',
  channel: '',
  schedule_key: '',
}

const eventOptions: { value: NotificationEvent; label: string }[] = [
  { value: 'membership_expiring', label: 'Membership expiring' },
  { value: 'membership_expired', label: 'Membership expired' },
  { value: 'payment_receipt', label: 'Payment receipt' },
]

const statusOptions: { value: NotificationStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'sending', label: 'Sending' },
  { value: 'sent', label: 'Sent' },
  { value: 'failed', label: 'Failed' },
  { value: 'skipped', label: 'Skipped' },
]

const channelOptions: { value: NotificationChannel; label: string }[] = [
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
]

const scheduleOptions: { value: NotificationScheduleKey; label: string }[] = [
  { value: '3m', label: '3 months before' },
  { value: '1m', label: '1 month before' },
  { value: '7d', label: '7 days before' },
  { value: '3d', label: '3 days before' },
  { value: 'due', label: 'Due date' },
  { value: '7d_after', label: '7 days after' },
  { value: 'receipt', label: 'Payment receipt' },
]

const eventLabels = Object.fromEntries(
  eventOptions.map((option) => [option.value, option.label]),
) as Record<NotificationEvent, string>

const scheduleLabels = Object.fromEntries(
  scheduleOptions.map((option) => [option.value, option.label]),
) as Record<NotificationScheduleKey, string>

const statusTone: Record<NotificationStatus, 'neutral' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning',
  sending: 'warning',
  sent: 'success',
  failed: 'danger',
  skipped: 'neutral',
}

function recipientLabel(notification: NotificationRecord) {
  return (
    notification.recipient?.name ||
    notification.recipient?.phone ||
    notification.recipient_phone ||
    'Unknown recipient'
  )
}

export function NotificationsPage() {
  const { profile } = useAuth()
  const canRetry = profile ? canRetryNotifications(profile) : false

  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [page, setPage] = useState(1)
  const [data, setData] = useState<PaginatedNotifications | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [retryingId, setRetryingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(
        await apiFetch('/api/notifications/', 'get', {
          query: {
            page,
            ...(filters.event ? { event: filters.event } : {}),
            ...(filters.status ? { status: filters.status } : {}),
            ...(filters.channel ? { channel: filters.channel } : {}),
            ...(filters.schedule_key ? { schedule_key: filters.schedule_key } : {}),
          },
        }),
      )
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load notifications.')
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  useEffect(() => {
    void load()
  }, [load])

  const setFilter = (key: keyof Filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }))
    setPage(1)
  }

  const clearFilters = () => {
    setFilters(emptyFilters)
    setPage(1)
  }

  const retry = async (notification: NotificationRecord) => {
    setRetryingId(notification.id)
    setActionError('')
    try {
      const updated = await apiFetch(
        buildApiPath('/api/notifications/{id}/retry/', { id: notification.id }),
        'post',
      )
      setData((current) =>
        current
          ? {
              ...current,
              results: current.results.map((row) =>
                row.id === updated.id ? updated : row,
              ),
            }
          : current,
      )
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Unable to retry this notification.')
    } finally {
      setRetryingId(null)
    }
  }

  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Delivery history for membership reminders and payment receipts. Messages are sent by SMS or WhatsApp."
        action={
          <Button variant="secondary" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        }
      />

      <Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label
              htmlFor="notification-event"
              className="mb-1.5 block text-sm font-semibold text-brand-text"
            >
              Event
            </label>
            <select
              id="notification-event"
              value={filters.event}
              onChange={(event) => setFilter('event', event.target.value)}
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-brand-text outline-none focus:border-brand-navy-light focus:ring-2 focus:ring-brand-navy-light/20"
            >
              <option value="">All events</option>
              {eventOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="notification-status"
              className="mb-1.5 block text-sm font-semibold text-brand-text"
            >
              Status
            </label>
            <select
              id="notification-status"
              value={filters.status}
              onChange={(event) => setFilter('status', event.target.value)}
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-brand-text outline-none focus:border-brand-navy-light focus:ring-2 focus:ring-brand-navy-light/20"
            >
              <option value="">All statuses</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="notification-channel"
              className="mb-1.5 block text-sm font-semibold text-brand-text"
            >
              Channel
            </label>
            <select
              id="notification-channel"
              value={filters.channel}
              onChange={(event) => setFilter('channel', event.target.value)}
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-brand-text outline-none focus:border-brand-navy-light focus:ring-2 focus:ring-brand-navy-light/20"
            >
              <option value="">All channels</option>
              {channelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="notification-schedule"
              className="mb-1.5 block text-sm font-semibold text-brand-text"
            >
              Schedule
            </label>
            <select
              id="notification-schedule"
              value={filters.schedule_key}
              onChange={(event) => setFilter('schedule_key', event.target.value)}
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-brand-text outline-none focus:border-brand-navy-light focus:ring-2 focus:ring-brand-navy-light/20"
            >
              <option value="">All schedule points</option>
              {scheduleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {hasFilters ? (
          <div className="mt-4">
            <Button variant="ghost" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        ) : null}
      </Card>

      {actionError ? (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
          {actionError}
        </p>
      ) : null}
      {loading ? <LoadingState label="Loading notifications…" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error && data && data.results.length === 0 ? (
        <EmptyState
          title="No notifications found"
          description={
            hasFilters
              ? 'No deliveries match these filters. Clear the filters to see the full history.'
              : 'Notification history appears here after a reminder or receipt is queued.'
          }
        />
      ) : null}

      {!loading && !error && data && data.results.length > 0 ? (
        <>
          <Card className="hidden overflow-x-auto p-0 md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-brand-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Recipient</th>
                  <th className="px-5 py-3 font-semibold">Event</th>
                  <th className="px-5 py-3 font-semibold">Channel</th>
                  <th className="px-5 py-3 font-semibold">Schedule</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Created</th>
                  {canRetry ? (
                    <th className="px-5 py-3 text-right font-semibold">Actions</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.results.map((notification) => (
                  <tr key={notification.id}>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-brand-navy">
                        {recipientLabel(notification)}
                      </p>
                      <p className="mt-0.5 text-xs text-brand-muted">
                        {notification.recipient_phone}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-brand-text">
                      {eventLabels[notification.event]}
                    </td>
                    <td className="px-5 py-4 text-brand-text capitalize">
                      {notification.channel}
                    </td>
                    <td className="px-5 py-4 text-brand-muted">
                      {scheduleLabels[notification.schedule_key]}
                    </td>
                    <td className="px-5 py-4">
                      <Badge tone={statusTone[notification.status]}>{notification.status}</Badge>
                      {notification.last_error ? (
                        <p className="mt-1 max-w-xs break-words text-xs text-brand-danger">
                          {notification.last_error}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-5 py-4 text-brand-muted">
                      {formatDate(notification.created_at)}
                    </td>
                    {canRetry ? (
                      <td className="px-5 py-4 text-right">
                        {notification.status === 'failed' ? (
                          <Button
                            variant="secondary"
                            loading={retryingId === notification.id}
                            onClick={() => void retry(notification)}
                          >
                            Retry
                          </Button>
                        ) : (
                          <span className="text-xs text-brand-muted">—</span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="space-y-3 md:hidden">
            {data.results.map((notification) => (
              <Card key={notification.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-brand-navy">
                      {recipientLabel(notification)}
                    </p>
                    <p className="mt-0.5 text-xs text-brand-muted">
                      {notification.recipient_phone}
                    </p>
                  </div>
                  <Badge tone={statusTone[notification.status]}>{notification.status}</Badge>
                </div>
                <dl className="mt-3 grid gap-2 text-sm">
                  <div>
                    <dt className="text-brand-muted">Event</dt>
                    <dd className="font-semibold text-brand-text">
                      {eventLabels[notification.event]}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-brand-muted">Channel</dt>
                    <dd className="font-semibold capitalize text-brand-text">
                      {notification.channel}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-brand-muted">Schedule</dt>
                    <dd className="font-semibold text-brand-text">
                      {scheduleLabels[notification.schedule_key]}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-brand-muted">Created</dt>
                    <dd className="font-semibold text-brand-text">
                      {formatDate(notification.created_at)}
                    </dd>
                  </div>
                </dl>
                {notification.last_error ? (
                  <p className="mt-2 break-words text-xs text-brand-danger">
                    {notification.last_error}
                  </p>
                ) : null}
                {canRetry && notification.status === 'failed' ? (
                  <Button
                    variant="secondary"
                    className="mt-3"
                    loading={retryingId === notification.id}
                    onClick={() => void retry(notification)}
                  >
                    Retry
                  </Button>
                ) : null}
              </Card>
            ))}
          </div>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-brand-muted">
                {data.count} notification{data.count === 1 ? '' : 's'}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={!data.previous || loading}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  disabled={!data.next || loading}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  )
}
