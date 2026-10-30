import { useAuth } from '../auth/useAuth'
import { canViewUsers, inviteRolesFor, roleLabel, staffPermissions } from '../lib/permissions'
import { Link } from '../components/Link'
import { Badge, Card, PageHeader } from '../components/ui'

export function HomePage() {
  const { profile } = useAuth()
  if (!profile) return null

  const isOwner = profile.role === 'owner'
  const isAdmin = profile.role === 'admin'
  const isStaff = isOwner || isAdmin
  const links = [
    {
      to: '/invites/new',
      title: 'Invite people',
      description: 'Create a one-time invite for an admin, trainer, or member.',
      show: inviteRolesFor(profile).length > 0,
    },
    {
      to: '/invites',
      title: 'Invites',
      description: 'Review invite status, expiry, and who has joined.',
      show: isOwner,
    },
    {
      to: '/team',
      title: 'Team',
      description: 'Manage admin permissions and deactivate team accounts.',
      show: isOwner,
    },
    {
      to: '/users',
      title: 'Users',
      description: 'Filter the people in your gym by role.',
      show: canViewUsers(profile),
    },
  ].filter((link) => link.show)

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome${profile.role === 'owner' || profile.role === 'admin' ? '' : ' to Gym Hub'}`}
        description={
          isStaff
            ? 'Manage your gym team, invites, and people from one place.'
            : 'Your gym account is connected to the Gym Hub mobile app.'
        }
      />

      <Card className="bg-gradient-to-br from-brand-navy to-brand-navy-light text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">
              {profile.gym?.name ?? 'No gym assigned'}
            </p>
            <h2 className="mt-2 font-heading text-2xl font-semibold">{profile.phone}</h2>
            <p className="mt-1 text-sm text-blue-100">
              Signed in as {roleLabel(profile.role)}
            </p>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-3 text-sm">
            {isOwner
              ? 'As owner, you have full access to every gym feature.'
              : isAdmin
                ? `${profile.permission_codes.length} staff permission${profile.permission_codes.length === 1 ? '' : 's'} assigned.`
                : 'Please use the mobile app for your trainer or member experience.'}
          </div>
        </div>
      </Card>

      {isStaff ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="group rounded-card border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-navy-light hover:shadow-md"
            >
              <p className="font-heading text-lg font-semibold text-brand-navy">{link.title}</p>
              <p className="mt-2 text-sm leading-6 text-brand-muted">{link.description}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-brand-navy-light group-hover:underline">
                Open →
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <h2 className="font-heading text-lg font-semibold text-brand-navy">Use the mobile app</h2>
          <p className="mt-2 text-sm text-brand-muted">
            Trainers and members manage their work from the Gym Hub mobile app. The web dashboard is
            for gym owners and admins.
          </p>
        </Card>
      )}

      {isAdmin ? (
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="mr-2 font-heading text-lg font-semibold text-brand-navy">
              Your permissions
            </h2>
            {staffPermissions
              .filter((permission) => profile.permission_codes.includes(permission.code))
              .map((permission) => (
                <Badge key={permission.code} tone="navy">
                  {permission.label}
                </Badge>
              ))}
            {profile.permission_codes.length === 0 ? (
              <p className="text-sm text-brand-muted">
                No staff permissions have been assigned yet.
              </p>
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  )
}
