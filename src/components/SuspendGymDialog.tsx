import { useEffect, useRef, useState } from 'react'

import { Button } from './ui'

export function SuspendGymDialog({
  open,
  gymName,
  busy = false,
  error = '',
  onCancel,
  onConfirm,
}: {
  open: boolean
  gymName: string
  busy?: boolean
  error?: string
  onCancel: () => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState('')
  const [validationError, setValidationError] = useState('')
  const reasonRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!open) return
    setReason('')
    setValidationError('')
    reasonRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [busy, onCancel, open])

  if (!open) return null

  const message = validationError || error

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
        aria-labelledby="suspend-title"
        aria-describedby="suspend-description"
        className="w-full max-w-md rounded-card bg-white p-6 shadow-2xl"
      >
        <h2 id="suspend-title" className="font-heading text-xl font-semibold text-brand-navy">
          Suspend {gymName}
        </h2>
        <p id="suspend-description" className="mt-2 text-sm leading-6 text-brand-muted">
          Everyone in this gym is blocked from logging in and from using the API until it is
          reactivated. Platform staff keep access.
        </p>

        <label
          htmlFor="suspension-reason"
          className="mt-5 block text-sm font-semibold text-brand-text"
        >
          Reason
        </label>
        <textarea
          id="suspension-reason"
          ref={reasonRef}
          rows={3}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value)
            if (validationError) setValidationError('')
          }}
          disabled={busy}
          className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-brand-text outline-none focus:border-brand-navy-light focus:ring-2 focus:ring-brand-navy-light/20 disabled:opacity-60"
          placeholder="Why is this gym being suspended?"
        />
        <p className="mt-1.5 text-xs text-brand-muted">
          The reason is stored with the suspension and shown on the gym record.
        </p>

        {message ? (
          <p role="alert" className="mt-3 text-sm text-brand-danger">
            {message}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={busy}
            onClick={() => {
              if (!reason.trim()) {
                setValidationError('Enter a reason before suspending this gym.')
                return
              }
              onConfirm(reason.trim())
            }}
          >
            Suspend gym
          </Button>
        </div>
      </div>
    </div>
  )
}
