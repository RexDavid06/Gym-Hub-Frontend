import { useEffect, useState } from 'react'

import { Button } from './ui'

export function ReasonDialog({
  open,
  title,
  description,
  confirmLabel,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  busy: boolean
  error: string
  onCancel: () => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!open) setReason('')
  }, [open])

  if (!open) return null

  const valid = reason.trim().length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-brand-navy/50 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reason-title"
        aria-describedby="reason-description"
        className="w-full max-w-md rounded-card bg-white p-6 shadow-2xl"
      >
        <h2 id="reason-title" className="font-heading text-xl font-semibold text-brand-navy">
          {title}
        </h2>
        <p id="reason-description" className="mt-2 text-sm leading-6 text-brand-muted">
          {description}
        </p>

        <label
          htmlFor="reason-input"
          className="mb-1.5 mt-4 block text-sm font-semibold text-brand-text"
        >
          Reason
        </label>
        <textarea
          id="reason-input"
          rows={3}
          value={reason}
          disabled={busy}
          onChange={(event) => setReason(event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-brand-text outline-none transition placeholder:text-brand-muted focus:border-brand-navy-light focus:ring-2 focus:ring-brand-navy-light/20 disabled:opacity-60"
        />

        {error ? (
          <p role="alert" className="mt-3 text-sm text-brand-danger">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (valid) onConfirm(reason.trim())
            }}
            loading={busy}
            disabled={!valid}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
