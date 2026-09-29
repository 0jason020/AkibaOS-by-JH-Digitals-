import { useContext } from 'react'
import { AuthContext, defaultAuthContext } from './auth-context'

export function useAuth() {
  return useContext(AuthContext) ?? defaultAuthContext
}
