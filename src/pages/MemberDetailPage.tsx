import { useCallback, useEffect, useState } from 'react'

import { apiFetch, buildApiPath } from '../api/client'
import type {
  MembershipPayment,
  MembershipPlan,
  MembershipSubscription,
  UserList,
} from '../api/types'
import { useAuth } from '../auth/useAuth'
import { Link } from '../components/Link'
import { ReceiptDialog } from '../components/ReceiptDialog'
import { VoidPaymentDialog } from '../components/VoidPaymentDialog'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  PageHeader,
} from '../components/ui'
import { formatDay } from '../lib/format'
import { subscriptionTone, toneBadge, toneLabel } from '../lib/memberships'
import { formatNaira, isPositiveAmount, toDecimalString } from '../lib/money'
import { canManagePayments } from '../lib/permissions'

const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'transfer', label: 'Bank transfer' },
  { value: 'pos', label: 'Card (POS)' },
] as const

type PaymentMethodValue = (typeof paymentMethods)[number]['value']

function methodLabel(method?: string) {
  return paymentMethods.find((option) => option.value === method)?.label ?? 'Other'
}

export function MemberDetailPage({
  memberId,
  openRenew = false,
}: {
  memberId: number
  openRenew?: boolean
}) {
  const { profile } = useAuth()
  const canManage = profile ? canManagePayments(profile) : false

  const [member, setMember] = useState<UserList | null>(null)
  const [subscription, setSubscription] = useState<MembershipSubscription | null>(null)
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [payments, setPayments] = useState<MembershipPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [planFormOpen, setPlanFormOpen] = useState(openRenew)
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [planBusy, setPlanBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodValue>('cash')
  const [paymentReference, setPaymentReference] = useState('')
  const [paymentBusy, setPaymentBusy] = useState(false)
  const [paymentError, setPaymentError] = useState('')

  const [receipt, setReceipt] = useState<MembershipPayment | null>(null)
  const [voidTarget, setVoidTarget] = useState<MembershipPayment | null>(null)
  const [voidBusy, setVoidBusy] = useState(false)
  const [voidError, setVoidError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setMember(null)
    setSubscription(null)
    setPlans([])
    setPayments([])
    setReceipt(null)
    setVoidTarget(null)
    setActionError('')
    setPaymentError('')
    try {
      const members = await apiFetch('/api/users/', 'get', { query: { role: 'member' } })
      const found = members.find((row) => row.id === memberId)
      if (!found) {
        setError('That member could not be found in this gym.')
        return
      }
      setMember(found)

      if (canManage) {
        const [memberships, planRows, paymentRows] = await Promise.all([
          apiFetch('/api/memberships/', 'get', { query: { member: memberId } }),
          apiFetch('/api/membership-plans/', 'get'),
          apiFetch('/api/membership-payments/', 'get', { query: { member: memberId } }),
        ])
        const current = memberships[0] ?? null
        setSubscription(current)
        setPlans(planRows)
        setPayments(paymentRows)
        setPaymentAmount(current?.price ?? '')
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Unable to load this member’s membership.',
      )
    } finally {
      setLoading(false)
    }
  }, [canManage, memberId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setPlanFormOpen(openRenew)
  }, [memberId, openRenew])

  useEffect(() => {
    const activePlans = plans.filter((plan) => plan.is_active !== false)
    if (activePlans.length === 0) {
      setSelectedPlanId('')
      return
    }
    setSelectedPlanId((current) => {
      if (current && activePlans.some((plan) => String(plan.id) === current)) return current
      const currentPlan = subscription
        ? activePlans.find((plan) => plan.id === subscription.plan.id)
        : undefined
      return String((currentPlan ?? activePlans[0]).id)
    })
  }, [plans, subscription])

  const submitPlan = async () => {
    const planId = Number(selectedPlanId)
    if (!planId) {
      setActionError('Choose a plan to continue.')
      return
    }
    setPlanBusy(true)
    setActionError('')
    try {
      const result = subscription
        ? await apiFetch(
            buildApiPath('/api/memberships/{id}/renew/', { id: subscription.id }),
            'post',
            { body: { plan_id: planId } },
          )
        : await apiFetch('/api/memberships/', 'post', {
            body: { member_id: memberId, plan_id: planId },
          })
      setSubscription(result)
      setPlanFormOpen(false)
      setPaymentAmount(result.price)
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Unable to save this membership.')
    } finally {
      setPlanBusy(false)
    }
  }

  const submitPayment = async () => {
    if (!isPositiveAmount(paymentAmount)) {
      setPaymentError('Enter an amount greater than zero.')
      return
    }
    setPaymentBusy(true)
    setPaymentError('')
    try {
      const result = await apiFetch('/api/membership-payments/', 'post', {
        body: {
          member_id: memberId,
          ...(subscription ? { subscription_id: subscription.id } : {}),
          amount: toDecimalString(paymentAmount),
          method: paymentMethod,
          reference: paymentReference.trim(),
        },
      })
      setPayments((current) => [result, ...current])
      setPaymentAmount(subscription?.price ?? '')
      setPaymentReference('')
    } catch (caught) {
      setPaymentError(caught instanceof Error ? caught.message : 'Unable to record this payment.')
    } finally {
      setPaymentBusy(false)
    }
  }

  const voidPayment = async (reason: string) => {
    if (!voidTarget) return
    setVoidBusy(true)
    setVoidError('')
    try {
      const result = await apiFetch(
        buildApiPath('/api/membership-payments/{id}/void/', { id: voidTarget.id }),
        'post',
        { body: { reason } },
      )
      setPayments((current) => current.map((row) => (row.id === result.id ? result : row)))
      setReceipt((current) => (current?.id === result.id ? result : current))
      setVoidTarget(null)
    } catch (caught) {
      setVoidError(caught instanceof Error ? caught.message : 'Unable to void this payment.')
    } finally {
      setVoidBusy(false)
    }
  }

  const tone = subscriptionTone(subscription)
  const activePlans = plans.filter((plan) => plan.is_active !== false)

  return (
    <div className="space-y-6">
      <PageHeader
        title={member ? member.name || member.phone : 'Member'}
        description={member ? member.phone : 'Membership and payments for this member.'}
        action={
          <Link
            to="/members"
            className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-brand-navy hover:bg-slate-50"
          >
            Back to members
          </Link>
        }
      />

      {loading ? <LoadingState label="Loading member…" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {!loading && !error && member ? (
        <>
          <Card>
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="font-heading text-lg font-semibold text-brand-navy">
                  {member.name || 'Unnamed member'}
                </h2>
                <p className="mt-1 text-sm text-brand-muted">{member.phone}</p>
              </div>
              <Badge tone={member.is_active === false ? 'danger' : 'success'}>
                {member.is_active === false ? 'Inactive' : 'Active'}
              </Badge>
            </div>
          </Card>

          {!canManage ? (
            <Card>
              <h2 className="font-heading text-lg font-semibold text-brand-navy">
                Membership and payments
              </h2>
              <p className="mt-2 text-sm text-brand-muted">
                You need the Manage payments permission to view or change this member’s membership
                and payments.
              </p>
            </Card>
          ) : (
            <>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-heading text-lg font-semibold text-brand-navy">Membership</h2>
                    {subscription ? (
                      <>
                        <p className="mt-2 text-xl font-semibold text-brand-navy">
                          {subscription.plan.name}
                        </p>
                        <p className="mt-1 text-sm text-brand-muted">
                          {formatNaira(subscription.price)} · {subscription.plan.duration_days} days
                        </p>
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-brand-muted">
                        No plan is assigned to this member yet.
                      </p>
                    )}
                  </div>
                  <Badge tone={toneBadge[tone]}>{toneLabel[tone]}</Badge>
                </div>

                {subscription ? (
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-brand-muted">Started</dt>
                      <dd className="mt-1 font-semibold text-brand-text">
                        {formatDay(subscription.start_date)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-brand-muted">Expires</dt>
                      <dd className="mt-1 font-semibold text-brand-text">
                        {formatDay(subscription.end_date)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-brand-muted">Days left</dt>
                      <dd className="mt-1 font-semibold text-brand-text">
                        {subscription.status === 'active' ? subscription.days_left : 0}
                      </dd>
                    </div>
                  </dl>
                ) : null}

                {!planFormOpen ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button onClick={() => setPlanFormOpen(true)} disabled={activePlans.length === 0}>
                      {subscription ? 'Renew plan' : 'Assign plan'}
                    </Button>
                    {activePlans.length === 0 ? (
                      <Link
                        to="/plans"
                        className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-brand-navy hover:bg-slate-50"
                      >
                        Manage plans
                      </Link>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <label
                      htmlFor="membership-plan"
                      className="mb-1.5 block text-sm font-semibold text-brand-text"
                    >
                      {subscription ? 'Renew with plan' : 'Assign plan'}
                    </label>
                    <select
                      id="membership-plan"
                      value={selectedPlanId}
                      onChange={(event) => setSelectedPlanId(event.target.value)}
                      disabled={planBusy || activePlans.length === 0}
                      className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-brand-text outline-none focus:border-brand-navy-light focus:ring-2 focus:ring-brand-navy-light/20 disabled:opacity-60 sm:max-w-sm"
                    >
                      {activePlans.length === 0 ? <option value="">No active plans</option> : null}
                      {activePlans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} · {formatNaira(plan.price)} · {plan.duration_days} days
                        </option>
                      ))}
                    </select>
                    {activePlans.length === 0 ? (
                      <p className="mt-2 text-sm text-amber-800">
                        Create or reactivate a plan before assigning a membership.
                      </p>
                    ) : null}
                    {actionError ? (
                      <p role="alert" className="mt-3 text-sm text-brand-danger">
                        {actionError}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        onClick={() => void submitPlan()}
                        loading={planBusy}
                        disabled={activePlans.length === 0 || !selectedPlanId}
                      >
                        {subscription ? 'Renew membership' : 'Assign membership'}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setPlanFormOpen(false)
                          setActionError('')
                        }}
                        disabled={planBusy}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </Card>

              <Card>
                <h2 className="font-heading text-lg font-semibold text-brand-navy">Record payment</h2>
                <form
                  className="mt-4 grid gap-4 sm:grid-cols-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void submitPayment()
                  }}
                >
                  <Field
                    label="Amount (NGN)"
                    name="payment-amount"
                    inputMode="decimal"
                    value={paymentAmount}
                    onChange={(event) => setPaymentAmount(event.target.value)}
                    placeholder="15000.00"
                    hint="Amount in naira, up to two decimal places."
                    disabled={paymentBusy}
                  />
                  <div>
                    <label
                      htmlFor="payment-method"
                      className="mb-1.5 block text-sm font-semibold text-brand-text"
                    >
                      Method
                    </label>
                    <select
                      id="payment-method"
                      value={paymentMethod}
                      onChange={(event) =>
                        setPaymentMethod(event.target.value as PaymentMethodValue)
                      }
                      disabled={paymentBusy}
                      className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-brand-text outline-none focus:border-brand-navy-light focus:ring-2 focus:ring-brand-navy-light/20 disabled:opacity-60"
                    >
                      {paymentMethods.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <Field
                      label="Reference"
                      name="payment-reference"
                      value={paymentReference}
                      onChange={(event) => setPaymentReference(event.target.value)}
                      placeholder="Optional bank or POS reference"
                      disabled={paymentBusy}
                    />
                  </div>
                  {paymentError ? (
                    <p role="alert" className="text-sm text-brand-danger sm:col-span-2">
                      {paymentError}
                    </p>
                  ) : null}
                  <div className="sm:col-span-2">
                    <Button
                      type="submit"
                      loading={paymentBusy}
                      disabled={!isPositiveAmount(paymentAmount)}
                    >
                      Record payment
                    </Button>
                  </div>
                </form>
              </Card>

              <Card>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-heading text-lg font-semibold text-brand-navy">Payments</h2>
                  <span className="text-sm text-brand-muted">{payments.length} total</span>
                </div>

                {payments.length === 0 ? (
                  <div className="mt-4">
                    <EmptyState
                      title="No payments yet"
                      description="Record this member’s first payment using the form above."
                    />
                  </div>
                ) : (
                  <>
                    <div className="mt-4 hidden overflow-x-auto md:block">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-brand-muted">
                          <tr>
                            <th className="py-2 pr-4 font-semibold">Receipt</th>
                            <th className="py-2 pr-4 font-semibold">Amount</th>
                            <th className="py-2 pr-4 font-semibold">Method</th>
                            <th className="py-2 pr-4 font-semibold">Date</th>
                            <th className="py-2 pr-4 font-semibold">Status</th>
                            <th className="py-2 text-right font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {payments.map((payment) => (
                            <tr key={payment.id}>
                              <td className="py-3 pr-4 font-semibold text-brand-navy">
                                {payment.receipt_number}
                              </td>
                              <td className="py-3 pr-4 text-brand-text">
                                {formatNaira(payment.amount)}
                              </td>
                              <td className="py-3 pr-4 text-brand-muted">
                                {methodLabel(payment.method)}
                              </td>
                              <td className="py-3 pr-4 text-brand-muted">
                                {formatDay(payment.paid_at ?? payment.created_at)}
                              </td>
                              <td className="py-3 pr-4">
                                <Badge tone={payment.is_voided ? 'danger' : 'success'}>
                                  {payment.is_voided ? 'Voided' : 'Paid'}
                                </Badge>
                              </td>
                              <td className="py-3 text-right">
                                <div className="flex justify-end gap-2">
                                  <Button variant="secondary" onClick={() => setReceipt(payment)}>
                                    Receipt
                                  </Button>
                                  {!payment.is_voided ? (
                                    <Button
                                      variant="danger"
                                      onClick={() => {
                                        setVoidError('')
                                        setVoidTarget(payment)
                                      }}
                                    >
                                      Void
                                    </Button>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-4 space-y-3 md:hidden">
                      {payments.map((payment) => (
                        <div key={payment.id} className="rounded-xl border border-slate-200 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-brand-navy">
                                {payment.receipt_number}
                              </p>
                              <p className="mt-1 text-lg font-semibold text-brand-navy">
                                {formatNaira(payment.amount)}
                              </p>
                            </div>
                            <Badge tone={payment.is_voided ? 'danger' : 'success'}>
                              {payment.is_voided ? 'Voided' : 'Paid'}
                            </Badge>
                          </div>
                          <p className="mt-2 text-sm text-brand-muted">
                            {methodLabel(payment.method)} ·{' '}
                            {formatDay(payment.paid_at ?? payment.created_at)}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button variant="secondary" onClick={() => setReceipt(payment)}>
                              Receipt
                            </Button>
                            {!payment.is_voided ? (
                              <Button
                                variant="danger"
                                onClick={() => {
                                  setVoidError('')
                                  setVoidTarget(payment)
                                }}
                              >
                                Void
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </Card>
            </>
          )}
        </>
      ) : null}

      {receipt && profile ? (
        <ReceiptDialog payment={receipt} profile={profile} onClose={() => setReceipt(null)} />
      ) : null}

      <VoidPaymentDialog
        key={voidTarget?.id ?? 'none'}
        open={voidTarget !== null}
        receiptNumber={voidTarget?.receipt_number ?? ''}
        busy={voidBusy}
        error={voidError}
        onCancel={() => {
          if (!voidBusy) {
            setVoidTarget(null)
            setVoidError('')
          }
        }}
        onConfirm={(reason) => void voidPayment(reason)}
      />
    </div>
  )
}
