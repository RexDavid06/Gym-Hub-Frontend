import type { components } from './schema'

export type Me = components['schemas']['Me']
export type UserList = components['schemas']['UserList']
export type InviteList = components['schemas']['InviteList']
export type InviteCreated = components['schemas']['InviteCreated']
export type InviteCreate = components['schemas']['InviteCreate']
export type RegisterGym = components['schemas']['RegisterGym']
export type RegisteredGym = components['schemas']['RegisteredGym']
export type StaffPermissionSet = components['schemas']['StaffPermissionSet']
export type StaffPermissionCode = components['schemas']['CodesEnum']
export type InviteRole = components['schemas']['InviteCreate']['role']
export type UserRole = components['schemas']['UserListRoleEnum']
