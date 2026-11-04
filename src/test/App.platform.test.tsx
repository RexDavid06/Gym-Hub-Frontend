import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider } from '../auth/AuthContext'
import App from '../App'

const ownerProfile = {
  id: 1,
  name: 'Ada',
  phone: '+2347000000001',
  role: 'owner',
  permission_codes: [],
  gym: { id: 1, name: 'Owner Gym' },
}

const adminProfile = {
  id: 2,
  name: 'Naomi',
  phone: '+2347000000002',
  role: 'admin',
  permission_codes: ['manage_payments'],
  gym: { id: 1, name: 'Admin Gym' },
}

const superAdminProfile = {
  id: 3,
  name: 'Chibueze',
  phone: '+2347000000003',
  role: 'super_admin',
  permission_codes: [],
  gym: null,
}

function mockHandlers(payloads: Record<string, unknown>) {
  const handler = vi.fn(async (request: RequestInfo | URL) => {
    const href =
      typeof request === 'string'
        ? request
        : request instanceof URL
          ? request.href
          : request.url
    const url = new URL(href)
    for (const [pattern, response] of Object.entries(payloads)) {
      // The pattern is a pathname fragment, so match it directly.
      if (!url.pathname.includes(pattern)) continue
      if (typeof response === 'string') {
        return new Response(response, {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return Response.json(response)
    }
    return new Response('Not found', { status: 404 })
  })
  vi.stubGlobal('fetch', handler)
  return handler
}

function renderApp(authHandlers: Record<string, unknown>, hash = '#/platform/gyms') {
  sessionStorage.setItem('gym-hub-refresh-token', 'refresh-secret')
  const payloads: Record<string, unknown> = {
    ...authHandlers,
    '/api/token/refresh/': { access: 'access-token', refresh: 'refresh-secret' },
  }
  if (!payloads['/api/me/']) {
    payloads['/api/me/'] = ownerProfile
  }
  mockHandlers(payloads)
  window.location.hash = hash
  render(
    <AuthProvider>
      <App />
    </AuthProvider>,
  )
}

describe('platform route guards', () => {
  it('denies a payment-only admin from every /platform route', async () => {
    renderApp({
      '/api/me/': adminProfile,
      '/api/platform/gyms/': JSON.stringify({
        count: 0,
        next: null,
        previous: null,
        results: [],
      }),
    })

    await waitFor(() =>
      expect(screen.getByText('Access denied')).toBeInTheDocument(),
    )
  })

  it('lets a super-admin open the platform gym list', async () => {
    renderApp({
      '/api/me/': superAdminProfile,
      '/api/platform/gyms/': JSON.stringify({
        count: 2,
        next: null,
        previous: null,
        results: [
          {
            id: 1,
            name: 'Alpha Fitness',
            plan_tier: 'medium',
            is_active: true,
            created_at: '2026-11-01T09:00:00Z',
            owner: { id: 3, name: 'Chibueze', phone: '+2347000000003' },
            member_count: 12,
            trainer_count: 3,
          },
        ],
      }),
    })

    await waitFor(() => expect(screen.getAllByText('Alpha Fitness').length).toBeGreaterThan(0))
  })
})

describe('super-admin landing', () => {
  it('redirects a super-admin visiting the dashboard to the platform overview', async () => {
    renderApp({ '/api/me/': superAdminProfile }, '#/')

    await waitFor(() => {
      expect(screen.getAllByRole('link', { name: /Gyms/ }).length).toBeGreaterThan(0)
    })
    expect(window.location.hash).toBe('#/platform')
  })
})

describe('payment-only admin member detail', () => {
  it('opens a member detail route from a membership alert', async () => {
    renderApp(
      {
        '/api/me/': adminProfile,
        '/api/users/': [
          {
            id: 42,
            name: 'Member Forty Two',
            phone: '+2347000000420',
            role: 'member',
            gym: 1,
            is_active: true,
            date_joined: '2026-01-01T00:00:00Z',
            permission_codes: [],
            assigned_trainer: null,
          },
        ],
        '/api/memberships/': [],
        '/api/membership-plans/': [],
        '/api/membership-payments/': [],
      },
      '#/members/42',
    )

    await waitFor(() =>
      expect(screen.getAllByText('Member Forty Two').length).toBeGreaterThan(0),
    )
    expect(screen.queryByText('Access denied')).not.toBeInTheDocument()
  })
})
