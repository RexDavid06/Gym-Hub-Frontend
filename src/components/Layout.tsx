import { useAuth } from '../auth/useAuth'
import { canViewUsers, inviteRolesFor, roleLabel } from '../lib/permissions'
import { Link } from './Link'
import { navigate, useRoute } from '../lib/router'
import { Badge, Button } from './ui'

export function Layout({ children }: { children: React.ReactNode }) {
  const { profile, logout } = useAuth()
  const route = useRoute()

  if (!profile) return null

  const navItems = [
    { to: '/', label: 'Overview', show: true },
    { to: '/invites/new', label: 'Invite people', show: inviteRolesFor(profile).length > 0 },
    { to: '/invites', label: 'Invites', show: profile.role === 'owner' },
    { to: '/team', label: 'Team', show: profile.role === 'owner' },
    { to: '/users', label: 'Users', show: canViewUsers(profile) },
  ].filter((item) => item.show)

  const signOut = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-brand-background">
      <aside className="hidden border-r border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="border-b border-slate-200 p-6">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-navy font-heading text-xs font-bold text-white">
              GH
            </span>
            <span>
              <span className="block font-heading text-base font-semibold text-brand-navy">
                Gym Hub
              </span>
              <span className="block text-xs text-brand-muted">Gym dashboard</span>
            </span>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-4" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`block rounded-xl px-3.5 py-3 text-sm font-semibold transition ${
                route === item.to
                  ? 'bg-brand-navy text-white'
                  : 'text-brand-muted hover:bg-slate-100 hover:text-brand-navy'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <div className="rounded-xl bg-slate-50 p-3.5">
            <p className="truncate text-sm font-semibold text-brand-navy">
              {profile.gym?.name ?? 'No gym assigned'}
            </p>
            <p className="mt-1 truncate text-xs text-brand-muted">{profile.phone}</p>
            <Badge tone="navy">{roleLabel(profile.role)}</Badge>
          </div>
          <Button variant="ghost" className="mt-2 w-full justify-start" onClick={signOut}>
            Log out
          </Button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <Link to="/" className="flex items-center gap-2 lg:hidden">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-navy font-heading text-xs font-bold text-white">
                GH
              </span>
              <span className="font-heading text-base font-semibold text-brand-navy">Gym Hub</span>
            </Link>
            <div className="hidden min-w-0 lg:block">
              <p className="truncate font-heading text-sm font-semibold text-brand-navy">
                {profile.gym?.name ?? 'Gym Hub'}
              </p>
              <p className="text-xs text-brand-muted">
                Signed in as {profile.phone} · {roleLabel(profile.role)}
              </p>
            </div>
            <Button variant="secondary" className="lg:hidden" onClick={signOut}>
              Log out
            </Button>
          </div>
          <nav
            className="flex gap-2 overflow-x-auto border-t border-slate-100 px-4 py-2 lg:hidden"
            aria-label="Main navigation"
          >
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold ${
                  route === item.to
                    ? 'bg-brand-navy text-white'
                    : 'text-brand-muted hover:bg-slate-100'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
