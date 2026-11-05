import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
}

const adminProfile: Me = {
  id: 2,
  name: 'Naomi',
  phone: '+2347000000002',
  role: 'admin',
  permission_codes: ['manage_payments'],
  gym: { id: 1, name: 'Admin Gym' },
  branch: null,
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
}

const mainBranch = {
  id: 5,
  name: 'Main Branch',
  address: '12 Adeola Odeku Street',
}

type Handler = (
  request: Request,
  init?: RequestInit,
) => Response | Promise<Response>

function mockApi(handlers: Record<string, Handler>) {
  const calls: { method: string; path: string }[] = []
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const href =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url
      const url = new URL(href)
      const method = (init?.method ?? 'GET').toUpperCase()
      calls.push({ method, path: url.pathname })
      const handler =
        handlers[`${method} ${url.pathname}`] ?? handlers[url.pathname]
      if (handler) return handler(new Request(href, init), init)
      return new Response('Not found', { status: 404 })
    },
  )
  vi.stubGlobal('fetch', fetchMock)
  return calls
}

function renderApp(
  payloads: Record<string, Handler>,
  hash: string,
  profile = ownerProfile,
) {
  sessionStorage.setItem('gym-hub-refresh-token', 'refresh-secret')
  const calls = mockApi({
    'POST /api/token/refresh/': () => Response.json({ access: 'access-token' }),
    '/api/me/': () => Response.json(profile),
    ...payloads,
  })
  window.location.hash = hash
  render(
    <AuthProvider>
      <App />
    </AuthProvider>,
  )
  return calls
}

describe('branches page', () => {
  it('lets an owner list and create branches', async () => {
    const calls = renderApp(
      {
        '/api/branches/': (request) =>
          request.method === 'POST'
            ? Response.json(
                { id: 6, name: 'Lekki', address: 'Admiralty Way' },
                { status: 201 },
              )
            : Response.json([mainBranch]),
      },
      '#/branches',
    )

    await waitFor(() =>
      expect(screen.getAllByText('Main Branch').length).toBeGreaterThan(0),
    )

    await userEvent.click(screen.getByRole('button', { name: 'Add branch' }))
    await userEvent.type(screen.getByLabelText('Branch name'), 'Lekki')
    await userEvent.type(screen.getByLabelText('Address'), 'Admiralty Way')
    await userEvent.click(screen.getByRole('button', { name: 'Create branch' }))

    await waitFor(() =>
      expect(screen.getAllByText('Lekki').length).toBeGreaterThan(0),
    )
    expect(calls).toContainEqual({ method: 'POST', path: '/api/branches/' })
  })

  it('denies a non-owner access to branch management', async () => {
    renderApp({}, '#/branches', adminProfile)

    await waitFor(() =>
      expect(screen.getByText('Access denied')).toBeInTheDocument(),
    )
  })
})

describe('user branch assignment', () => {
  it('assigns a member to a branch from the users page', async () => {
    const calls = renderApp(
      {
        '/api/users/': () => Response.json([member]),
        '/api/branches/': () => Response.json([mainBranch]),
        'PUT /api/users/42/branch/': () =>
          Response.json({ ...member, branch: { id: 5, name: 'Main Branch' } }),
      },
      '#/users',
    )

    const select = await screen.findByLabelText('Branch for Member Forty Two')
    fireEvent.change(select, { target: { value: '5' } })

    await waitFor(() =>
      expect((select as HTMLSelectElement).value).toBe('5'),
    )
    expect(calls).toContainEqual({
      method: 'PUT',
      path: '/api/users/42/branch/',
    })
  })
})
