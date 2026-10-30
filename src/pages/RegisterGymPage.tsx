import { useState } from 'react'

import { useAuth } from '../auth/useAuth'
import { Link } from '../components/Link'
import { Button, Field } from '../components/ui'

const emptyForm = {
  name: '',
  gym_name: '',
  phone: '',
  password: '',
  confirmPassword: '',
}

export function RegisterGymPage() {
  const { registerGym } = useAuth()
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [key]: event.target.value }))
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await registerGym({
        name: form.name.trim(),
        gym_name: form.gym_name.trim(),
        phone: form.phone.trim(),
        password: form.password,
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to register your gym. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-brand-background px-4 py-8 sm:px-6 sm:py-12">
      <section className="mx-auto w-full max-w-2xl rounded-card border border-slate-200 bg-white p-6 shadow-xl sm:p-10">
        <Link to="/login" className="text-sm font-semibold text-brand-navy-light hover:underline">
          ← Back to sign in
        </Link>
        <div className="mt-6 grid h-12 w-12 place-items-center rounded-xl bg-brand-navy font-heading text-sm font-bold text-white">
          GH
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">
          Owner signup
        </p>
        <h1 className="mt-2 font-heading text-3xl font-semibold text-brand-navy">
          Register your gym
        </h1>
        <p className="mt-2 text-sm text-brand-muted">
          Create the owner account for your gym. You can invite admins and staff after signing in.
        </p>
        <form className="mt-8 grid gap-5 sm:grid-cols-2" onSubmit={submit}>
          <Field
            label="Your name"
            name="name"
            autoComplete="name"
            value={form.name}
            onChange={update('name')}
            placeholder="Ada Okafor"
            required
          />
          <Field
            label="Gym name"
            name="gym_name"
            value={form.gym_name}
            onChange={update('gym_name')}
            placeholder="Ada Fitness"
            required
          />
          <Field
            label="Phone number"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={update('phone')}
            placeholder="+234 800 000 0000"
            required
          />
          <div className="hidden sm:block" />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={update('password')}
            required
          />
          <Field
            label="Confirm password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={update('confirmPassword')}
            required
          />
          {error ? (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800 sm:col-span-2">
              {error}
            </p>
          ) : null}
          <div className="sm:col-span-2">
            <Button type="submit" className="w-full sm:w-auto" loading={busy}>
              Create owner account
            </Button>
          </div>
        </form>
      </section>
    </main>
  )
}
