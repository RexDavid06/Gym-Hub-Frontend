import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from '../auth/AuthContext'
import App from '../App'
import type { Me } from '../api/types'

const ownerProfile: Me = {
  id: 1,
  name: 'Ada',
  phone: '+2347000000001',
  role: 'owner',
  permission_codes: [],
  gym: { id: 1, name: 'Owner Gym' },
  branch: null,
  whatsapp_opt_in: false,
}

const adminProfile: Me = {
  id: 2,
  name: 'Naomi',
  phone: '+2347000000002',
  role: 'admin',
  permission_codes: ['manage_members'],
  gym: { id: 1, name: 'Admin Gym' },
  branch: null,
  whatsapp_opt_in: false,
}

const trainerProfile: Me = {
  id: 3,
  name: 'Tunde',
  phone: '+2347000000003',
  role: 'trainer',
  permission_codes: [],
  gym: { id: 1, name: 'Owner Gym' },
  branch: null,
  whatsapp_opt_in: false,
}

const member = {
  id: 42,
  name: 'Member Forty Two',
  phone: '+2347000000420',
  role: 'member',
  gym: 1,
  branch: null,
  is_active: true,
  date_joined: '2026-01-01T00:00:00Z',
  permission_codes: [],
  assigned_trainer: null,
  whatsapp_opt_in: false,
}

const notificationSetting = {
  id: 1,
  sms_reminders_enabled: false,
  sms_receipts_enabled: false,
  whatsapp_reminders_enabled: false,
  whatsapp_receipts_enabled: false,
  sms_available: true,
  whatsapp_available: false,
  created_at: '2026-11-05T08:00:00Z',
  updated_at: '2026-11-05T08:00:00Z',
}

const failedNotification = {
  id: 7,
  recipient: { id: 42, name: 'Member Forty Two', phone: '+2347000000420' },
  recipient_phone: '+2347000000420',
  event: 'membership_expiring',
  schedule_key: '7d',
  channel: 'sms',
  status: 'failed',
  payload: { member_id: 42 },
  body: 'Your membership expires soon.',
  template_name: '',
  provider: 'console',
  provider_message_id: '',
  attempts: 3,
  last_error: 'Provider unavailable (HTTP 503).',
  skip_reason: '',
  scheduled_at: '2026-11-05T08:00:00Z',
  sent_at: null,
  created_at: '2026-11-05T08:00:00Z',
  updated_at: '2026-11-05T08:00:00Z',
}

type Handler = (request: Request) => Response | Promise<Response>

type RecordedCall = {
  method: string
  path: string
  search: string
  body?: unknown
}

function renderApp(
  payloads: Record<string, Handler>,
  hash: string,
  profile: Me = ownerProfile,
) {
  sessionStorage.setItem('gym-hub-refresh-token', 'refresh-secret')
  const calls: RecordedCall[] = []
  const handlers: Record<string, Handler> = {
    'POST /api/token/refresh/': () => Response.json({ access: 'access-token' }),
    '/api/me/': () => Response.json(profile),
    ...payloads,
  }
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const href =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url
    const url = new URL(href)
    const method = (init?.method ?? 'GET').toUpperCase()
    let body: unknown
    if (typeof init?.body === 'string') {
      body = JSON.parse(init.body)
    }
    calls.push({ method, path: url.pathname, search: url.search, body })
    const handler = handlers[`${method} ${url.pathname}`] ?? handlers[url.pathname]
    if (handler) return handler(new Request(href, init))
    return new Response('Not found', { status: 404 })
  })
  vi.stubGlobal('fetch', fetchMock)
  window.location.hash = hash
  render(
    <AuthProvider>
      <App />
    </AuthProvider>,
  )
  return calls
}

afterEach(() => {
  vi.unstubAllGlobals()
  window.location.hash = ''
})

describe('notification settings page', () => {
  it('lets an owner enable an available channel and blocks an unavailable one', async () => {
    const calls = renderApp(
      {
        '/api/notification-settings/': async (request) => {
          if (request.method === 'PATCH') {
            const body = (await request.json()) as Record<string, boolean>
            return Response.json({ ...notificationSetting, ...body })
          }
          return Response.json(notificationSetting)
        },
      },
      '#/settings/notifications',
    )

    await screen.findByText('Provider availability')
    expect(screen.getByText('WhatsApp: unavailable')).toBeInTheDocument()

    const whatsappReminders = screen.getByRole('checkbox', { name: /WhatsApp reminders/ })
    expect(whatsappReminders).toBeDisabled()

    const smsReminders = screen.getByRole('checkbox', { name: /SMS reminders/ })
    expect(smsReminders).not.toBeDisabled()
    await userEvent.click(smsReminders)
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }))

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Notification settings saved.'),
    )
    expect(calls).toContainEqual(
      expect.objectContaining({
        method: 'PATCH',
        path: '/api/notification-settings/',
        body: expect.objectContaining({ sms_reminders_enabled: true }),
      }),
    )
  })

  it('denies a non-owner access to notification settings', async () => {
    renderApp({}, '#/settings/notifications', adminProfile)

    await waitFor(() => expect(screen.getByText('Access denied')).toBeInTheDocument())
  })
})

describe('notification history page', () => {
  it('lets an owner filter history and retry a failed notification', async () => {
    const calls = renderApp(
      {
        '/api/notifications/': (request) => {
          const url = new URL(request.url)
          const channel = url.searchParams.get('channel')
          const results = channel === 'whatsapp' ? [] : [failedNotification]
          return Response.json({
            count: results.length,
            next: null,
            previous: null,
            results,
          })
        },
        'POST /api/notifications/7/retry/': () =>
          Response.json(
            { ...failedNotification, status: 'pending', last_error: '' },
            { status: 202 },
          ),
      },
      '#/notifications',
    )

    await screen.findAllByText('Member Forty Two')

    await userEvent.selectOptions(screen.getByLabelText('Channel'), 'whatsapp')
    await waitFor(() =>
      expect(
        calls.some(
          (call) =>
            call.method === 'GET' &&
            call.path === '/api/notifications/' &&
            call.search.includes('channel=whatsapp'),
        ),
      ).toBe(true),
    )
    await screen.findByText('No notifications found')

    await userEvent.selectOptions(screen.getByLabelText('Channel'), '')
    await screen.findAllByText('Member Forty Two')

    const retryButtons = screen.getAllByRole('button', { name: 'Retry' })
    await userEvent.click(retryButtons[0])

    await waitFor(() =>
      expect(calls).toContainEqual(
        expect.objectContaining({
          method: 'POST',
          path: '/api/notifications/7/retry/',
        }),
      ),
    )
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument(),
    )
  })

  it('lets an admin read history but not retry', async () => {
    renderApp(
      {
        '/api/notifications/': () =>
          Response.json({
            count: 1,
            next: null,
            previous: null,
            results: [failedNotification],
          }),
      },
      '#/notifications',
      adminProfile,
    )

    await screen.findAllByText('Member Forty Two')
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
  })

  it('denies a trainer access to notification history', async () => {
    renderApp({}, '#/notifications', trainerProfile)

    await waitFor(() => expect(screen.getByText('Access denied')).toBeInTheDocument())
  })
})

describe('member WhatsApp preference', () => {
  it('lets permitted staff opt a member into WhatsApp messages', async () => {
    const calls = renderApp(
      {
        '/api/users/': () => Response.json([member]),
        'GET /api/users/42/notification-preference/': () =>
          Response.json({ whatsapp_opt_in: false }),
        'PUT /api/users/42/notification-preference/': async (request) => {
          const body = (await request.json()) as { whatsapp_opt_in: boolean }
          return Response.json({ whatsapp_opt_in: body.whatsapp_opt_in })
        },
      },
      '#/members/42',
      adminProfile,
    )

    const checkbox = await screen.findByRole('checkbox', { name: /WhatsApp opt-in/ })
    expect(checkbox).not.toBeChecked()

    await userEvent.click(checkbox)

    await waitFor(() => expect(checkbox).toBeChecked())
    expect(calls).toContainEqual(
      expect.objectContaining({
        method: 'PUT',
        path: '/api/users/42/notification-preference/',
        body: { whatsapp_opt_in: true },
      }),
    )
  })
})
