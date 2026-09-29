import { createContext } from 'react'
import type { User } from '@supabase/supabase-js'

export type AuthContextValue = {
  user: User | null
  isLoading: boolean
  isConfigured: boolean
  isPreview: boolean
  isAuthenticated: boolean
  signUpWithPassword: (email: string, password: string) => Promise<boolean>
  signInWithPassword: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  updateAccountProfile: (fullName: string, email?: string, phone?: string) => Promise<void>
  enterPreview: () => void
  signOut: () => Promise<void>
}

export const defaultAuthContext: AuthContextValue = {
  user: null,
  isLoading: false,
  isConfigured: false,
  isPreview: false,
  isAuthenticated: false,
  signUpWithPassword: async () => false,
  signInWithPassword: async () => undefined,
  signInWithGoogle: async () => undefined,
  updateAccountProfile: async () => undefined,
  enterPreview: () => undefined,
  signOut: async () => undefined,
}

export const AuthContext = createContext<AuthContextValue>(defaultAuthContext)
