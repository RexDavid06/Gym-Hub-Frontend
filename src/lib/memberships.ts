import type { MembershipSubscription } from '../api/types'

export type SubscriptionTone = 'active' | 'expiring' | 'expired' | 'cancelled' | 'none'

/** A subscription expiring within this many days is flagged amber. */
export const EXPIRING_WINDOW_DAYS = 7

export function subscriptionTone(subscription: MembershipSubscription | null): SubscriptionTone {
  if (!subscription) return 'none'
  if (subscription.status === 'expired') return 'expired'
  if (subscription.status === 'cancelled') return 'cancelled'
  if (subscription.status === 'active') {
    return subscription.days_left <= EXPIRING_WINDOW_DAYS ? 'expiring' : 'active'
  }
  return 'none'
}

export const toneLabel: Record<SubscriptionTone, string> = {
  active: 'Active',
  expiring: 'Expiring soon',
  expired: 'Expired',
  cancelled: 'Cancelled',
  none: 'No membership',
}

export const toneBadge: Record<SubscriptionTone, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  expiring: 'warning',
  expired: 'danger',
  cancelled: 'neutral',
  none: 'neutral',
}
