import { createContext } from 'react'

import type { Me, RegisterGym, RegisteredGym, StaffPermissionCode } from '../api/types'

export type AuthContextValue = {
  profile: Me | null
  loading: boolean
  login: (phone: string, password: string) => Promise<void>
  registerGym: (input: RegisterGym) => Promise<RegisteredGym>
  logout: () => void
  hasPermission: (code: StaffPermissionCode) => boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)
