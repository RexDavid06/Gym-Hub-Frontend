import { useState } from 'react'

import { useAuth } from '../auth/useAuth'
import { Link } from '../components/Link'
import { Button, Field } from '../components/ui'

export function LoginPage() {
  const { login } = useAuth()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(phone.trim(), password)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to sign in. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_10%_10%,#e3eaf5,transparent_35%),#F4F6FA] p-4 sm:p-6">
      <section className="w-full max-w-md rounded-card border border-slate-200 bg-white p-6 shadow-xl sm:p-10">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-navy font-heading text-sm font-bold text-white">
          GH
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">Gym Hub</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold text-brand-navy">Welcome back</h1>
        <p className="mt-2 text-sm text-brand-muted">Sign in to manage your gym.</p>
        <form className="mt-7 space-y-4" onSubmit={submit}>
          <Field
            label="Phone number"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+234 800 000 0000"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
          />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error ? (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" loading={busy}>
            Sign in
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-brand-muted">
          New gym?{' '}
          <Link to="/register" className="font-semibold text-brand-navy-light underline-offset-4 hover:underline">
            Register your gym
          </Link>
        </p>
        <p className="mt-4 text-center text-xs text-brand-muted">
          Access for staff and members is provided by your gym administrator.
        </p>
      </section>
    </main>
  )
}
