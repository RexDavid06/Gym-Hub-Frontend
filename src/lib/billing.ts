import type {
  BillingInterval,
  BillingPaymentMethod,
  BillingSubscriptionStatus,
  DunningStatus,
  InvoiceStatus,
} from '../api/types'

export const billingIntervals: { value: BillingInterval; label: string; months: number }[] = [
  { value: 'monthly', label: 'Monthly', months: 1 },
  { value: 'quarterly', label: '3 months', months: 3 },
  { value: 'semiannual', label: '6 months', months: 6 },
  { value: 'annual', label: 'Annual', months: 12 },
]

export const billingPaymentMethods: { value: BillingPaymentMethod; label: string }[] = [
  { value: 'card', label: 'Card' },
  { value: 'transfer', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'pos', label: 'POS' },
  { value: 'other', label: 'Other' },
]

export const subscriptionStatuses: BillingSubscriptionStatus[] = [
  'trialing',
  'active',
  'past_due',
  'cancelled',
]

export const invoiceStatuses: InvoiceStatus[] = ['open', 'paid', 'overdue', 'void']

export const dunningStatuses: DunningStatus[] = ['pending', 'sent', 'failed', 'skipped']

export function intervalLabel(interval: string) {
  return billingIntervals.find((item) => item.value === interval)?.label ?? interval
}

export function paymentMethodLabel(method: string) {
  return billingPaymentMethods.find((item) => item.value === method)?.label ?? method
}

export function titleCase(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'navy'

export function invoiceStatusTone(status: InvoiceStatus): BadgeTone {
  if (status === 'paid') return 'success'
  if (status === 'overdue') return 'danger'
  if (status === 'open') return 'warning'
  return 'neutral'
}

export function subscriptionStatusTone(status: BillingSubscriptionStatus): BadgeTone {
  if (status === 'active') return 'success'
  if (status === 'past_due') return 'danger'
  if (status === 'trialing') return 'warning'
  return 'neutral'
}

export function dunningStatusTone(status: DunningStatus): BadgeTone {
  if (status === 'sent') return 'success'
  if (status === 'failed') return 'danger'
  if (status === 'pending') return 'warning'
  return 'neutral'
}
