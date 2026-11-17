import { Link } from './Link'
import { useRoute } from '../lib/router'

const tabs = [
  { to: '/platform/billing', label: 'Summary' },
  { to: '/platform/billing/plans', label: 'Plans' },
  { to: '/platform/billing/subscriptions', label: 'Subscriptions' },
  { to: '/platform/billing/invoices', label: 'Invoices' },
  { to: '/platform/billing/payments', label: 'Payments' },
  { to: '/platform/billing/dunning', label: 'Dunning' },
]

export function BillingTabs() {
  const route = useRoute()
  return (
    <nav
      aria-label="Billing sections"
      className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1"
    >
      {tabs.map((tab) => {
        const active = route === tab.to
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${
              active
                ? 'bg-brand-navy text-white'
                : 'text-brand-muted hover:bg-slate-100 hover:text-brand-navy'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
