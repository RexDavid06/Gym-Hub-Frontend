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

export function isSuperAdmin(profile: Me) {
  return profile.role === 'super_admin'
}

export function canViewUsers(profile: Me) {
  return (
    profile.role === 'owner' ||
    hasPermission(profile, 'manage_members') ||
    hasPermission(profile, 'manage_trainers')
  )
}

export function canViewMembers(profile: Me) {
  return (
    profile.role === 'owner' ||
    hasPermission(profile, 'manage_members') ||
    hasPermission(profile, 'assign_trainers')
  )
}

export function canViewMemberDetail(profile: Me) {
  return canViewMembers(profile) || isSuperAdmin(profile) || hasPermission(profile, 'manage_payments')
}

export function canAssignTrainers(profile: Me) {
  return profile.role === 'owner' || hasPermission(profile, 'assign_trainers')
}

export function canManagePayments(profile: Me) {
  return hasPermission(profile, 'manage_payments')
}

export function canViewBranches(profile: Me) {
  return profile.role === 'owner' || profile.role === 'admin'
}

export function canManageBranches(profile: Me) {
  return profile.role === 'owner'
}

export function canViewNotifications(profile: Me) {
  return profile.role === 'owner' || profile.role === 'admin'
}

export function canRetryNotifications(profile: Me) {
  return profile.role === 'owner'
}

export function canManageNotificationSettings(profile: Me) {
  return profile.role === 'owner'
}

export function canManageNotificationPreference(profile: Me) {
  return (
    profile.role === 'owner' ||
    (profile.role === 'admin' && hasPermission(profile, 'manage_members'))
  )
}

export function canAssignBranch(profile: Me, targetRole: UserRole) {
  if (profile.role === 'owner') return true
  if (profile.role !== 'admin') return false
  if (targetRole === 'member') return hasPermission(profile, 'manage_members')
  if (targetRole === 'trainer') return hasPermission(profile, 'manage_trainers')
  return false
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
