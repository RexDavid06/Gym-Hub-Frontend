import { useEffect, useState } from 'react'

import { AuthProvider } from './auth/AuthContext'
import { useAuth } from './auth/useAuth'
import { Layout } from './components/Layout'
import { Button, Card, LoadingState } from './components/ui'
import { Link } from './components/Link'
import {
  canManageBranches,
  canManageNotificationSettings,
  canManagePayments,
  canViewMemberDetail,
  canViewMembers,
  canViewNotifications,
  canViewUsers,
  isSuperAdmin,
  inviteRolesFor,
} from './lib/permissions'
import { BranchesPage } from './pages/BranchesPage'
import { HomePage } from './pages/HomePage'
import { InvitePeoplePage } from './pages/InvitePeoplePage'
import { InvitesListPage } from './pages/InvitesListPage'
import { LoginPage } from './pages/LoginPage'
import { MemberDetailPage } from './pages/MemberDetailPage'
import { MembersPage } from './pages/MembersPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { NotificationSettingsPage } from './pages/NotificationSettingsPage'
import { PlansPage } from './pages/PlansPage'
import { RegisterGymPage } from './pages/RegisterGymPage'
import { TeamPage } from './pages/TeamPage'
import { UsersPage } from './pages/UsersPage'
import { navigate, useRoute } from './lib/router'
import { PlatformGymDetailPage } from './pages/PlatformGymDetailPage'
import { PlatformGymsPage } from './pages/PlatformGymsPage'
import { PlatformOverviewPage } from './pages/PlatformOverviewPage'

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

const platformRoutes = {
  overview: '/platform',
  gyms: '/platform/gyms',
  gymDetail: (id: number) => `/platform/gyms/${id}`,
}

const isPlatformRouteLocal = (route: string) => {
  const path = route.split('?')[0]
  return path === platformRoutes.overview || path.startsWith(`${platformRoutes.overview}/`)
}

const platformGymId = (route: string) => {
  const match = /^\/platform\/gyms\/(\d+)$/.exec(route.split('?')[0])
  return match ? Number(match[1]) : null
}

const memberMatch = (route: string) => {
  const match = /^\/members\/(\d+)$/.exec(route.split('?')[0])
  return match ? Number(match[1]) : null
}

function AppRoutes() {
  const { profile, loading } = useAuth()
  const route = useRoute()
  const [page, setPage] = useState<React.ReactNode>(null)
  const [routePath, setRoutePath] = useState<string>('')

  useEffect(() => {
    if (profile && (route === '/login' || route === '/register')) navigate('/')
  }, [profile, route])

  // Platform staff land on the platform overview, never the gym dashboard.
  useEffect(() => {
    if (profile && isSuperAdmin(profile) && !isPlatformRouteLocal(route)) {
      navigate(platformRoutes.overview)
    }
  }, [profile, route])

  useEffect(() => {
    const path = route.split('?')[0]
    setRoutePath(path)
  }, [route])

  useEffect(() => {
    if (!profile) {
      return
    }
    if (routePath === platformRoutes.overview) {
      setPage(isSuperAdmin(profile) ? <PlatformOverviewPage /> : <AccessDenied />)
    } else if (routePath === platformRoutes.gyms) {
      setPage(isSuperAdmin(profile) ? <PlatformGymsPage /> : <AccessDenied />)
    } else if (platformGymId(routePath) !== null) {
      setPage(
        isSuperAdmin(profile) ? (
          <PlatformGymDetailPage gymId={Number(platformGymId(routePath))} />
        ) : (
          <AccessDenied />
        ),
      )
    } else if (routePath === '/') {
      setPage(isSuperAdmin(profile) ? <PlatformOverviewPage /> : <HomePage />)
    } else if (routePath === '/invites/new') {
      setPage(inviteRolesFor(profile).length > 0 ? <InvitePeoplePage /> : <AccessDenied />)
    } else if (routePath === '/invites') {
      setPage(profile.role === 'owner' ? <InvitesListPage /> : <AccessDenied />)
    } else if (routePath === '/team') {
      setPage(profile.role === 'owner' ? <TeamPage /> : <AccessDenied />)
    } else if (routePath === '/users') {
      setPage(canViewUsers(profile) ? <UsersPage /> : <AccessDenied />)
    } else if (routePath === '/branches') {
      setPage(canManageBranches(profile) ? <BranchesPage /> : <AccessDenied />)
    } else if (routePath === '/members') {
      setPage(canViewMembers(profile) ? <MembersPage /> : <AccessDenied />)
    } else if (memberMatch(routePath)) {
      setPage(
        canViewMemberDetail(profile) ? (
          <MemberDetailPage
            memberId={Number(memberMatch(routePath))}
            openRenew={new URLSearchParams(route.split('?')[1] ?? '').get('renew') === '1'}
          />
        ) : (
          <AccessDenied />
        ),
      )
    } else if (routePath === '/plans') {
      setPage(canManagePayments(profile) ? <PlansPage /> : <AccessDenied />)
    } else if (routePath === '/notifications') {
      setPage(canViewNotifications(profile) ? <NotificationsPage /> : <AccessDenied />)
    } else if (routePath === '/settings/notifications') {
      setPage(
        canManageNotificationSettings(profile) ? <NotificationSettingsPage /> : <AccessDenied />,
      )
    } else {
      setPage(
        <Card className="mx-auto max-w-lg text-center">
          <h1 className="font-heading text-2xl font-semibold text-brand-navy">
            Page not found
          </h1>
          <p className="mt-2 text-sm text-brand-muted">That page does not exist.</p>
          <Button className="mt-5" onClick={() => navigate('/')}>
            Back to overview
          </Button>
        </Card>,
      )
    }
  }, [profile, route, routePath])

  if (loading) return <SplashScreen />

  if (!profile) {
    if (routePath === '/register') return <RegisterGymPage />
    return <LoginPage />
  }

  if (routePath === '/login' || routePath === '/register') {
    return (
      <Layout>
        <HomePage />
      </Layout>
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
