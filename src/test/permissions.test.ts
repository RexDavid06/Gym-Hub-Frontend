import { describe, expect, it } from 'vitest'

import {
  canManagePayments,
  canViewMemberDetail,
  canViewMembers,
  isSuperAdmin,
} from '../lib/permissions'
import type { Me } from '../api/types'

function profile(role: string, permissionCodes: string[] = []): Me {
  return {
    id: 1,
    name: 'Ada',
    phone: '+2347000000001',
    role,
    permission_codes: permissionCodes,
    gym: null,
  }
}

describe('isSuperAdmin', () => {
  it('grants access only to platform staff', () => {
    expect(isSuperAdmin(profile('super_admin'))).toBe(true)
    expect(isSuperAdmin(profile('owner'))).toBe(false)
    expect(isSuperAdmin(profile('admin'))).toBe(false)
    expect(isSuperAdmin(profile('trainer'))).toBe(false)
    expect(isSuperAdmin(profile('member'))).toBe(false)
  })
})

describe('canViewMemberDetail', () => {
  it('allows anyone who can view members plus payment-only admins', () => {
    expect(
      canViewMemberDetail(profile('owner'))
    ).toBe(true)
    expect(canViewMemberDetail(profile('admin', ['manage_members']))).toBe(true)
    expect(canViewMemberDetail(profile('admin', ['assign_trainers']))).toBe(true)
    expect(canViewMemberDetail(profile('admin', ['manage_payments']))).toBe(true)

    expect(canViewMemberDetail(profile('admin'))).toBe(false)
    expect(canViewMemberDetail(profile('trainer'))).toBe(false)
    expect(canViewMemberDetail(profile('member'))).toBe(false)
  })
})

describe('canViewMembers', () => {
  it('keeps the existing member-management rules', () => {
    expect(canViewMembers(profile('owner'))).toBe(true)
    expect(canViewMembers(profile('admin', ['manage_members']))).toBe(true)
    expect(canViewMembers(profile('admin', ['assign_trainers']))).toBe(true)
    expect(canViewMembers(profile('admin'))).toBe(false)
  })
})

describe('canManagePayments', () => {
  it('grants payments to owners and managed-payments staff', () => {
    expect(canManagePayments(profile('owner'))).toBe(true)
    expect(canManagePayments(profile('admin', ['manage_payments']))).toBe(true)
    expect(canManagePayments(profile('admin'))).toBe(false)
  })
})
