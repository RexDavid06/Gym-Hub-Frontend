import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from '../auth/AuthContext'
import App from '../App'
import type { Me } from '../api/types'

const superAdminProfile: Me = {
  id: 1,
  name: 'Chibueze',
  phone: '+2347000000001',
  role: 'super_admin',
  permission_codes: [],
  gym: null,
  branch: null,
  whatsapp_opt_in: false,
}

const ownerProfile: Me = {
  id: 2,
  name: 'Ada',
  phone: '+2347000000002',
  role: 'owner',
  permission_codes: [],
  gym: { id: 1, name: 'Owner Gym' },
  branch: null,
  whatsapp_opt_in: false,
}

const adminProfile: Me = {
  id: 3,
  name: 'Naomi',
  phone: '+2347000000003',
  role: 'admin',
  permission_codes: ['manage_payments'],
  gym: { id: 1, name: 'Owner Gym' },
  branch: null,
  whatsapp_opt_in: false,
}

const plan = {
  id: 11,
  name: 'Small gym',
  tier: 'small',
  description: 'For small gyms',
  is_active: true,
  is_public: true,
  prices: [
    {
      id: 1,
      interval: 'monthly',
      duration_months: 1,
      currency: 'NGN',
      amount: '15000.00',
      effective_from: '2026-11-01',
      is_active: true,
      created_at: '2026-11-01T00:00:00Z',
    },
  ],
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
}

const invoice = {
  id: 21,
  number: 'INV-2026-00001',
  gym: { id: 1, name: 'Owner Gym' },
  plan: 11,
  plan_name: 'Small gym',
  interval: 'monthly',
  status: 'open',
  issued_at: '2026-11-01',
  due_at: '2026-11-08',
  period_start: '2026-11-01',
  period_end: '2026-11-30',
  description: 'Small gym (monthly)',
  amount: '15000.00',
  amount_paid: '0.00',
  balance: '15000.00',
  is_overpaid: false,
  currency: 'NGN',
  notes: '',
  created_at: '2026-11-01T00:00:00Z',
  voided_at: null,
  void_reason: '',
}

const payment = {
  id: 31,
  gym: { id: 1, name: 'Owner Gym' },
  invoice: { id: 21, number: 'INV-2026-00001' },
  plan_name: 'Small gym',
  amount: '15000.00',
  method: 'transfer',
  provider: 'manual',
  provider_reference: '',
  reference: 'TRF-1',
  paid_at: '2026-11-02',
  recorded_by: null,
  voided_at: null,
  void_reason: '',
  is_voided: false,
  created_at: '2026-11-02T00:00:00Z',
}

const subscription = {
  id: 41,
  gym: { id: 1, name: 'Owner Gym' },
  plan: { id: 11, name: 'Small gym', tier: 'small' },
  price: {
    id: 1,
    interval: 'monthly',
    duration_months: 1,
    currency: 'NGN',
    amount: '15000.00',
  },
  interval: 'monthly',
  status: 'active',
  started_at: '2026-11-01T00:00:00Z',
  current_period_start: '2026-11-01',
  current_period_end: '2026-11-30',
  cancel_at_period_end: false,
  balance: '15000.00',
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
}

const dunningAttempt = {
  id: 51,
  invoice: 21,
  invoice_number: 'INV-2026-00001',
  gym: { id: 1, name: 'Owner Gym' },
  offset_days: 3,
  channel: 'sms',
  status: 'sent',
  sent_at: '2026-11-11T00:00:00Z',
  error: '',
  created_at: '2026-11-11T00:00:00Z',
}

const summary = {
  active_subscriptions: 1,
  subscriptions_by_tier: { small: 1, medium: 0, big: 0 },
  monthly_recurring_revenue: '15000.00',
  outstanding_balance: '15000.00',
  overdue_invoice_count: 1,
  collected_this_month: '0.00',
}

const paginated = <T,>(results: T[]) => ({
  count: results.length,
  next: null,
  previous: null,
  results,
})

afterEach(() => {
  vi.unstubAllGlobals()
})

type Handler = (
  request: Request,
  init?: RequestInit,
) => Response | Promise<Response>

function mockApi(handlers: Record<string, Handler>) {
  const callBodies: { method: string; path: string; body: unknown }[] = []
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
      let body: unknown = null
      if (init?.body) {
        try {
          body = JSON.parse(String(init.body))
        } catch {
          body = init.body
        }
      }
      callBodies.push({ method, path: url.pathname, body })
      const handler = handlers[`${method} ${url.pathname}`] ?? handlers[url.pathname]
      if (handler) return handler(new Request(href, init), init)
      return new Response('Not found', { status: 404 })
    },
  )
  vi.stubGlobal('fetch', fetchMock)
  return callBodies
}

function renderApp(
  payloads: Record<string, Handler>,
  hash: string,
  profile: Me = superAdminProfile,
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

describe('platform billing summary and access', () => {
  it('shows the platform billing summary and overdue invoices', async () => {
    renderApp(
      {
        '/api/platform/billing/summary/': () => Response.json(summary),
        '/api/platform/billing/invoices/': () =>
          Response.json(paginated([{ ...invoice, status: 'overdue' }])),
      },
      '#/platform/billing',
    )

    await waitFor(() =>
      expect(screen.getByText('Monthly recurring revenue')).toBeInTheDocument(),
    )
    expect(screen.getByText('INV-2026-00001 · Owner Gym')).toBeInTheDocument()
    expect(screen.getAllByText('₦15,000.00').length).toBeGreaterThan(0)
  })

  it('denies a non-super-admin every platform billing route', async () => {
    for (const route of [
      'billing',
      'billing/plans',
      'billing/subscriptions',
      'billing/invoices',
      'billing/payments',
      'billing/dunning',
    ]) {
      sessionStorage.setItem('gym-hub-refresh-token', 'refresh-secret')
      mockApi({
        'POST /api/token/refresh/': () => Response.json({ access: 'access-token' }),
        '/api/me/': () => Response.json(adminProfile),
      })
      window.location.hash = `#/platform/${route}`
      const view = render(
        <AuthProvider>
          <App />
        </AuthProvider>,
      )
      await waitFor(() => expect(screen.getByText('Access denied')).toBeInTheDocument())
      view.unmount()
    }
  })
})

describe('platform billing plans', () => {
  it('lists plans with all four interval labels and adds a versioned price', async () => {
    const calls = renderApp(
      {
        '/api/platform/billing/plans/': (request) =>
          request.method === 'POST'
            ? Response.json(plan, { status: 201 })
            : Response.json([plan]),
      },
      '#/platform/billing/plans',
    )

    await waitFor(() => expect(screen.getByText('Small gym')).toBeInTheDocument())
    expect(screen.getAllByText('Monthly').length).toBeGreaterThan(0)
    expect(screen.getByRole('option', { name: '3 months' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '6 months' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Annual' })).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Plan name'), 'Medium gym')
    await userEvent.click(screen.getByRole('button', { name: 'Create plan' }))
    await waitFor(() =>
      expect(
        calls.some(
          (call) =>
            call.method === 'POST' &&
            call.path === '/api/platform/billing/plans/' &&
            (call.body as { name?: string }).name === 'Medium gym',
        ),
      ).toBe(true),
    )

    await userEvent.selectOptions(screen.getByLabelText('Interval'), 'annual')
    await userEvent.type(screen.getByLabelText('Amount (NGN)'), '120000')
    await userEvent.click(screen.getByRole('button', { name: 'Add price' }))
    await waitFor(() =>
      expect(
        calls.some(
          (call) =>
            call.method === 'POST' &&
            call.path === '/api/platform/billing/plans/11/prices/' &&
            (call.body as { interval?: string }).interval === 'annual',
        ),
      ).toBe(true),
    )
  })
})

describe('platform billing invoices and payments', () => {
  it('marks an invoice paid and voids one with a reason', async () => {
    const calls = renderApp(
      {
        '/api/platform/billing/invoices/': () => Response.json(paginated([invoice])),
        'POST /api/platform/billing/invoices/21/mark-paid/': () => Response.json(invoice),
        'POST /api/platform/billing/invoices/21/void/': () =>
          Response.json({ ...invoice, status: 'void' }),
      },
      '#/platform/billing/invoices',
    )

    await waitFor(() => expect(screen.getByText('INV-2026-00001')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Mark paid' }))
    await waitFor(() =>
      expect(
        calls.some(
          (call) => call.method === 'POST' && call.path.endsWith('/invoices/21/mark-paid/'),
        ),
      ).toBe(true),
    )

    await userEvent.click(screen.getByRole('button', { name: 'Void' }))
    await userEvent.type(screen.getByLabelText('Reason'), 'Issued in error')
    await userEvent.click(screen.getByRole('button', { name: 'Void invoice' }))
    await waitFor(() =>
      expect(
        calls.some(
          (call) =>
            call.path.endsWith('/invoices/21/void/') &&
            (call.body as { reason?: string }).reason === 'Issued in error',
        ),
      ).toBe(true),
    )
  })

  it('records an offline payment and voids it with a reason', async () => {
    const calls = renderApp(
      {
        '/api/platform/billing/payments/': () => Response.json(paginated([payment])),
        'POST /api/platform/billing/payments/': () => Response.json(payment, { status: 201 }),
        'POST /api/platform/billing/payments/31/void/': () =>
          Response.json({ ...payment, is_voided: true }),
      },
      '#/platform/billing/payments',
    )

    await waitFor(() => expect(screen.getByText('Small gym')).toBeInTheDocument())

    await userEvent.type(screen.getByLabelText('Invoice ID'), '21')
    await userEvent.type(screen.getByLabelText('Amount (NGN, optional)'), '15000')
    await userEvent.selectOptions(screen.getByLabelText('Method'), 'cash')
    await userEvent.type(screen.getByLabelText('Reference (optional)'), 'CASH-1')
    await userEvent.click(screen.getByRole('button', { name: 'Record payment' }))
    await waitFor(() =>
      expect(
        calls.some(
          (call) =>
            call.method === 'POST' &&
            call.path === '/api/platform/billing/payments/' &&
            (call.body as { method?: string }).method === 'cash',
        ),
      ).toBe(true),
    )

    await userEvent.click(screen.getByRole('button', { name: 'Void' }))
    await userEvent.type(screen.getByLabelText('Reason'), 'Duplicate deposit')
    await userEvent.click(screen.getByRole('button', { name: 'Void payment' }))
    await waitFor(() =>
      expect(
        calls.some(
          (call) =>
            call.path.endsWith('/payments/31/void/') &&
            (call.body as { reason?: string }).reason === 'Duplicate deposit',
        ),
      ).toBe(true),
    )
  })
})

describe('platform billing subscriptions and dunning', () => {
  it('subscribes a gym and cancels at period end', async () => {
    const calls = renderApp(
      {
        '/api/platform/billing/subscriptions/': () => Response.json(paginated([subscription])),
        '/api/platform/billing/plans/': () => Response.json([plan]),
        'POST /api/platform/billing/subscriptions/': () => Response.json(subscription, { status: 201 }),
        'POST /api/platform/billing/subscriptions/41/cancel/': () =>
          Response.json({ ...subscription, cancel_at_period_end: true }),
      },
      '#/platform/billing/subscriptions',
    )

    await waitFor(() => expect(screen.getByText('Owner Gym')).toBeInTheDocument())
    await userEvent.type(screen.getByLabelText('Gym ID'), '1')
    await userEvent.selectOptions(screen.getAllByLabelText('Plan')[0], '11')
    await userEvent.selectOptions(screen.getByLabelText('Billing interval'), 'quarterly')
    await userEvent.click(screen.getByRole('button', { name: 'Create subscription' }))
    await waitFor(() =>
      expect(
        calls.some(
          (call) =>
            call.method === 'POST' &&
            call.path === '/api/platform/billing/subscriptions/' &&
            (call.body as { interval?: string }).interval === 'quarterly',
        ),
      ).toBe(true),
    )

    await userEvent.click(screen.getByRole('button', { name: 'Cancel at period end' }))
    await waitFor(() =>
      expect(
        calls.some(
          (call) => call.path.endsWith('/subscriptions/41/cancel/'),
        ),
      ).toBe(true),
    )
  })

  it('lists overdue invoices with reminder history and sends a manual reminder', async () => {
    const calls = renderApp(
      {
        '/api/platform/billing/invoices/': () =>
          Response.json(paginated([{ ...invoice, status: 'overdue' }])),
        '/api/platform/billing/dunning/': () => Response.json(paginated([dunningAttempt])),
        'POST /api/platform/billing/invoices/21/dun/': () => Response.json(invoice),
      },
      '#/platform/billing/dunning',
    )

    await waitFor(() =>
      expect(screen.getAllByText('INV-2026-00001').length).toBeGreaterThan(0),
    )
    expect(screen.getByText('Reminder history')).toBeInTheDocument()
    expect(screen.getAllByText('Sent').length).toBeGreaterThan(0)

    const sendReminder = screen.getAllByRole('button', { name: 'Send reminder' })[0]
    await userEvent.click(sendReminder)
    await waitFor(() =>
      expect(
        calls.some((call) => call.path.endsWith('/invoices/21/dun/')),
      ).toBe(true),
    )
  })
})

describe('owner billing', () => {
  it('shows only the owner gym billing data and starts Paystack checkout', async () => {
    const calls = renderApp(
      {
        '/api/billing/subscription/': () => Response.json(subscription),
        '/api/billing/invoices/': () => Response.json(paginated([invoice])),
        '/api/billing/payments/': () => Response.json(paginated([payment])),
        'POST /api/billing/invoices/21/checkout/': () =>
          Response.json({
            authorization_url: 'https://checkout.paystack.test/test-ref',
            reference: 'test-ref',
            amount: '15000.00',
          }),
      },
      '#/billing',
      ownerProfile,
    )

    await waitFor(() => expect(screen.getAllByText('Small gym').length).toBeGreaterThan(0))
    expect(screen.getByText('Outstanding balance')).toBeInTheDocument()
    expect(screen.getByText('INV-2026-00001')).toBeInTheDocument()
    expect(screen.getByText('Payment history')).toBeInTheDocument()

    const assign = vi.fn()
    vi.stubGlobal('location', { hash: '#/billing', search: '', assign })
    await userEvent.click(screen.getByRole('button', { name: 'Pay now' }))
    await waitFor(() =>
      expect(
        calls.some(
          (call) =>
            call.method === 'POST' && call.path === '/api/billing/invoices/21/checkout/',
        ),
      ).toBe(true),
    )
    expect(assign).toHaveBeenCalledWith('https://checkout.paystack.test/test-ref')
  })

  it('denies an admin the owner billing route', async () => {
    renderApp({}, '#/billing', adminProfile)
    await waitFor(() => expect(screen.getByText('Access denied')).toBeInTheDocument())
  })
})
