import type { InviteRole, Me, StaffPermissionCode, UserRole } from '../api/types'

export const staffPermissions: {
  code: StaffPermissionCode
  label: string
  description: string
}[] = [
  { code: 'manage_members', label: 'Manage members', description: 'Invite and manage members.' },
  { code: 'manage_trainers', label: 'Manage trainers', description: 'Invite and manage trainers.' },
  {
    code: 'manage_payments',
    label: 'Manage payments',
    description: 'View and record membership payments.',
  },
  {
    code: 'assign_trainers',
    label: 'Assign trainers',
    description: 'Assign members to trainers.',
  },
  { code: 'view_reports', label: 'View reports', description: 'See gym activity and reports.' },
]

export function hasPermission(profile: Me, code: StaffPermissionCode) {
  return profile.role === 'owner' || profile.permission_codes.includes(code)
}

export function canViewUsers(profile: Me) {
  return (
    profile.role === 'owner' ||
    hasPermission(profile, 'manage_members') ||
    hasPermission(profile, 'manage_trainers')
  )
}

export function inviteRolesFor(profile: Me): InviteRole[] {
  if (profile.role === 'owner') return ['admin', 'trainer', 'member']
  const roles: InviteRole[] = []
  if (hasPermission(profile, 'manage_trainers')) roles.push('trainer')
  if (hasPermission(profile, 'manage_members')) roles.push('member')
  return roles
}

export function userRoleFiltersFor(profile: Me): { value: UserRole | 'all'; label: string }[] {
  if (profile.role === 'owner') {
    return [
      { value: 'all', label: 'All roles' },
      { value: 'owner', label: 'Owners' },
      { value: 'admin', label: 'Admins' },
      { value: 'trainer', label: 'Trainers' },
      { value: 'member', label: 'Members' },
    ]
  }
  const options: { value: UserRole | 'all'; label: string }[] = [{ value: 'all', label: 'All roles' }]
  if (hasPermission(profile, 'manage_members')) options.push({ value: 'member', label: 'Members' })
  if (hasPermission(profile, 'manage_trainers')) options.push({ value: 'trainer', label: 'Trainers' })
  return options
}

export function roleLabel(role: string) {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}
