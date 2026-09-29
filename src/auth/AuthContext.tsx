import { useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured)
  const [isPreview, setIsPreview] = useState(() => sessionStorage.getItem('akibaos-preview-auth') === 'true')

  useEffect(() => {
    if (!isSupabaseConfigured) return

    let active = true
    let unsubscribe: () => void = () => {}
    void (async () => {
      try {
        const client = await getSupabase()
        if (!active || !client) { setIsLoading(false); return }
        const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
          setUser(session?.user ?? null)
          if (session) {
            setIsPreview(false)
            sessionStorage.removeItem('akibaos-preview-auth')
          }
          setIsLoading(false)
        })
        unsubscribe = () => listener.subscription.unsubscribe()
        const { data, error } = await client.auth.getSession()
        if (!active) return
        if (error) console.error('Unable to restore the AkibaOS session.', error)
        setUser(data.session?.user ?? null)
        if (data.session) {
          setIsPreview(false)
          sessionStorage.removeItem('akibaos-preview-auth')
        } else {
          setIsPreview(sessionStorage.getItem('akibaos-preview-auth') === 'true')
        }
        setIsLoading(false)
      } catch (error) {
        if (!active) return
        console.error('Unable to initialize AkibaOS authentication.', error)
        setIsLoading(false)
      }
    })()

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const signUpWithPassword = async (email: string, password: string) => {
    const client = await getSupabase()
    if (!client) throw new Error('Supabase is not configured. Use the local preview or connect your Supabase project.')
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/onboarding/profile` },
    })
    if (error) throw error
    if (data.session) setUser(data.user)
    return Boolean(data.session)
  }

  const signInWithPassword = async (email: string, password: string) => {
    const client = await getSupabase()
    if (!client) throw new Error('Supabase is not configured. Use the local preview or connect your Supabase project.')
    const { data, error } = await client.auth.signInWithPassword({ email, password })
    if (error) throw error
    setUser(data.user)
  }

  const signInWithGoogle = async () => {
    const client = await getSupabase()
    if (!client) throw new Error('Supabase is not configured. Use the local preview or connect your Supabase project.')
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/onboarding/profile` },
    })
    if (error) throw error
  }

  const updateAccountProfile = async (fullName: string, email?: string, phone?: string) => {
    const client = await getSupabase()
    if (!client) return
    const { data, error } = await client.auth.updateUser({ data: { full_name: fullName }, ...(email ? { email } : {}) })
    if (error) throw error
    if (!data.user) throw new Error('Your session expired. Please sign in again.')

    const { error: profileError } = await client.from('profiles').update({
      full_name: fullName,
      email: email || data.user.email || null,
      ...(phone ? { phone } : {}),
    }).eq('id', data.user.id)
    if (profileError) throw profileError
    setUser(data.user)
  }

  const enterPreview = () => {
    sessionStorage.setItem('akibaos-preview-auth', 'true')
    setIsPreview(true)
    setIsLoading(false)
  }

  const signOut = async () => {
    const client = await getSupabase()
    if (client) {
      const { error } = await client.auth.signOut()
      if (error) throw error
    }
    sessionStorage.removeItem('akibaos-preview-auth')
    setUser(null)
    setIsPreview(false)
  }

  const value = {
    user,
    isLoading,
    isConfigured: isSupabaseConfigured,
    isPreview,
    isAuthenticated: Boolean(user) || isPreview,
    signUpWithPassword,
    signInWithPassword,
    signInWithGoogle,
    updateAccountProfile,
    enterPreview,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
