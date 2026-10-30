import { forwardRef, type ReactNode } from 'react'

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-brand-navy sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm text-brand-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-card border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      {children}
    </section>
  )
}

export const Button = forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'button'> & {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    loading?: boolean
  }
>(function Button(
  { children, variant = 'primary', className = '', loading = false, ...props },
  ref,
) {
  const variants = {
    primary:
      'bg-brand-orange text-white hover:bg-brand-orange-dark focus-visible:outline-brand-orange',
    secondary:
      'border border-slate-300 bg-white text-brand-navy hover:bg-slate-50 focus-visible:outline-brand-navy-light',
    ghost:
      'bg-transparent text-brand-navy-light hover:bg-slate-100 focus-visible:outline-brand-navy-light',
    danger: 'bg-brand-danger text-white hover:bg-red-700 focus-visible:outline-brand-danger',
  }

  return (
    <button
      {...props}
      ref={ref}
      disabled={props.disabled || loading}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
    >
      {loading ? <Spinner size="sm" /> : null}
      {children}
    </button>
  )
})

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-4 w-4 border-2', md: 'h-7 w-7 border-2', lg: 'h-10 w-10 border-[3px]' }
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-slate-300 border-t-brand-orange ${sizes[size]}`}
    />
  )
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-card border border-slate-200 bg-white p-8 text-sm text-brand-muted">
      <Spinner />
      <p>{label}</p>
    </div>
  )
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div
      role="alert"
      className="rounded-card border border-red-200 bg-red-50 p-5 text-sm text-red-800"
    >
      <p className="font-semibold">Something went wrong</p>
      <p className="mt-1">{message}</p>
      {onRetry ? (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-card border border-dashed border-slate-300 bg-white p-10 text-center">
      <p className="font-heading text-lg font-semibold text-brand-navy">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-brand-muted">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  )
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'navy'
}) {
  const tones = {
    neutral: 'bg-slate-100 text-slate-700',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-red-100 text-red-800',
    navy: 'bg-blue-50 text-brand-navy-light',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

export function Field({
  label,
  hint,
  ...props
}: React.ComponentProps<'input'> & { label: string; hint?: string }) {
  const id = props.id ?? props.name
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-brand-text">
        {label}
      </label>
      <input
        {...props}
        id={id}
        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-brand-text outline-none transition placeholder:text-brand-muted focus:border-brand-navy-light focus:ring-2 focus:ring-brand-navy-light/20"
      />
      {hint ? <p className="mt-1.5 text-xs text-brand-muted">{hint}</p> : null}
    </div>
  )
}

