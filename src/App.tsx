import { useEffect } from 'react'

import { AuthProvider } from './auth/AuthContext'
import { useAuth } from './auth/useAuth'
import { Layout } from './components/Layout'
import { Button, Card, LoadingState } from './components/ui'
import { Link } from './components/Link'
import { canViewMembers, canViewUsers, inviteRolesFor } from './lib/permissions'
import { HomePage } from './pages/HomePage'
import { InvitePeoplePage } from './pages/InvitePeoplePage'
import { InvitesListPage } from './pages/InvitesListPage'
import { LoginPage } from './pages/LoginPage'
import { MembersPage } from './pages/MembersPage'
import { RegisterGymPage } from './pages/RegisterGymPage'
import { TeamPage } from './pages/TeamPage'
import { UsersPage } from './pages/UsersPage'
import { navigate, useRoute } from './lib/router'

function SplashScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-brand-background p-6">
      <div className="flex flex-col items-center gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-navy font-heading text-sm font-bold text-white">
          GH
        </div>
        <LoadingState label="Restoring your session…" />
      </div>
    </main>
  )
}

function AccessDenied() {
  return (
    <Card className="mx-auto max-w-lg text-center">
      <h1 className="font-heading text-2xl font-semibold text-brand-navy">Access denied</h1>
      <p className="mt-2 text-sm text-brand-muted">
        Your account does not have permission to open this page.
      </p>
      <Link
        to="/"
        className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-brand-orange px-4 text-sm font-semibold text-white hover:bg-brand-orange-dark"
      >
        Back to overview
      </Link>
    </Card>
  )
}

function AppRoutes() {
  const { profile, loading } = useAuth()
  const route = useRoute()

  useEffect(() => {
    if (profile && (route === '/login' || route === '/register')) navigate('/')
  }, [profile, route])

  if (loading) return <SplashScreen />

  if (!profile) {
    if (route === '/register') return <RegisterGymPage />
    return <LoginPage />
  }

  if (route === '/login' || route === '/register') {
    return (
      <Layout>
        <HomePage />
      </Layout>
    )
  }

  let page: React.ReactNode
  if (route === '/') {
    page = <HomePage />
  } else if (route === '/invites/new') {
    page =
      inviteRolesFor(profile).length > 0 ? <InvitePeoplePage /> : <AccessDenied />
  } else if (route === '/invites') {
    page = profile.role === 'owner' ? <InvitesListPage /> : <AccessDenied />
  } else if (route === '/team') {
    page = profile.role === 'owner' ? <TeamPage /> : <AccessDenied />
  } else if (route === '/users') {
    page = canViewUsers(profile) ? <UsersPage /> : <AccessDenied />
  } else if (route === '/members') {
    page = canViewMembers(profile) ? <MembersPage /> : <AccessDenied />
  } else {
    page = (
      <Card className="mx-auto max-w-lg text-center">
        <h1 className="font-heading text-2xl font-semibold text-brand-navy">Page not found</h1>
        <p className="mt-2 text-sm text-brand-muted">That page does not exist.</p>
        <Button className="mt-5" onClick={() => navigate('/')}>
          Back to overview
        </Button>
      </Card>
    )
  }

  return <Layout>{page}</Layout>
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
