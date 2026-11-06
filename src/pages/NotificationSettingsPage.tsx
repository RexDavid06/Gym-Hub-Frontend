import { useCallback, useEffect, useState } from 'react'

import { apiFetch } from '../api/client'
import type { NotificationSetting } from '../api/types'
import { Badge, Button, Card, ErrorState, LoadingState, PageHeader } from '../components/ui'

type ToggleKey =
  | 'sms_reminders_enabled'
  | 'sms_receipts_enabled'
  | 'whatsapp_reminders_enabled'
  | 'whatsapp_receipts_enabled'

const toggles: {
  key: ToggleKey
  label: string
  description: string
  channel: 'sms' | 'whatsapp'
}[] = [
  {
    key: 'sms_reminders_enabled',
    label: 'SMS reminders',
    description: 'Send membership expiry reminders by SMS.',
    channel: 'sms',
  },
  {
    key: 'sms_receipts_enabled',
    label: 'SMS receipts',
    description: 'Send an SMS receipt after a membership payment.',
    channel: 'sms',
  },
  {
    key: 'whatsapp_reminders_enabled',
    label: 'WhatsApp reminders',
    description: 'Send membership expiry reminders on WhatsApp to opted-in members.',
    channel: 'whatsapp',
  },
  {
    key: 'whatsapp_receipts_enabled',
    label: 'WhatsApp receipts',
    description: 'Send a WhatsApp receipt after a payment to opted-in members.',
    channel: 'whatsapp',
  },
]

export function NotificationSettingsPage() {
  const [setting, setSetting] = useState<NotificationSetting | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setSaveError('')
    setSaved(false)
    try {
      setSetting(await apiFetch('/api/notification-settings/', 'get'))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load notification settings.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const updateToggle = (key: ToggleKey, checked: boolean) => {
    setSaved(false)
    setSetting((current) => (current ? { ...current, [key]: checked } : current))
  }

  const save = async () => {
    if (!setting) return
    setSaving(true)
    setSaveError('')
    setSaved(false)
    try {
      const result = await apiFetch('/api/notification-settings/', 'patch', {
        body: {
          sms_reminders_enabled: setting.sms_reminders_enabled,
          sms_receipts_enabled: setting.sms_receipts_enabled,
          whatsapp_reminders_enabled: setting.whatsapp_reminders_enabled,
          whatsapp_receipts_enabled: setting.whatsapp_receipts_enabled,
        },
      })
      setSetting(result)
      setSaved(true)
    } catch (caught) {
      setSaveError(
        caught instanceof Error ? caught.message : 'Unable to save notification settings.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification settings"
        description="Choose which SMS and WhatsApp messages your gym sends. Every channel is off until you enable it."
        action={
          <Button variant="secondary" onClick={() => void load()} disabled={loading || saving}>
            Refresh
          </Button>
        }
      />

      {loading ? <LoadingState label="Loading notification settings…" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {!loading && !error && setting ? (
        <>
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-heading text-lg font-semibold text-brand-navy">
                  Provider availability
                </h2>
                <p className="mt-1 text-sm text-brand-muted">
                  Channels must be configured on the server before they can be enabled.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={setting.sms_available ? 'success' : 'danger'}>
                  SMS: {setting.sms_available ? 'available' : 'unavailable'}
                </Badge>
                <Badge tone={setting.whatsapp_available ? 'success' : 'danger'}>
                  WhatsApp: {setting.whatsapp_available ? 'available' : 'unavailable'}
                </Badge>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="font-heading text-lg font-semibold text-brand-navy">Channels</h2>
            <div className="mt-4 divide-y divide-slate-100">
              {toggles.map((toggle) => {
                const available =
                  toggle.channel === 'sms' ? setting.sms_available : setting.whatsapp_available
                const lockedOff = !available && !setting[toggle.key]
                return (
                  <label
                    key={toggle.key}
                    htmlFor={toggle.key}
                    className="flex cursor-pointer items-start justify-between gap-4 py-4"
                  >
                    <span>
                      <span className="block text-sm font-semibold text-brand-text">
                        {toggle.label}
                      </span>
                      <span className="mt-1 block text-sm text-brand-muted">
                        {toggle.description}
                      </span>
                      {lockedOff ? (
                        <span className="mt-1 block text-xs font-semibold text-brand-danger">
                          This channel is not configured for this environment.
                        </span>
                      ) : null}
                    </span>
                    <input
                      id={toggle.key}
                      name={toggle.key}
                      type="checkbox"
                      checked={setting[toggle.key]}
                      disabled={saving || lockedOff}
                      onChange={(event) => updateToggle(toggle.key, event.target.checked)}
                      className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 text-brand-orange accent-brand-orange disabled:opacity-50"
                    />
                  </label>
                )
              })}
            </div>
          </Card>

          {saveError ? (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
              {saveError}
            </p>
          ) : null}
          {saved ? (
            <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-800">
              Notification settings saved.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void save()} loading={saving}>
              Save settings
            </Button>
          </div>
        </>
      ) : null}
    </div>
  )
}
