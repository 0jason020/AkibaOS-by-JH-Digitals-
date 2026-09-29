import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabasePublishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY)?.trim()

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)

let client: SupabaseClient | null = null
let pendingClient: Promise<SupabaseClient | null> | null = null

export function getSupabase() {
  if (!isSupabaseConfigured) return Promise.resolve(null)
  if (client) return Promise.resolve(client)
  if (!pendingClient) {
    pendingClient = import('@supabase/supabase-js').then(({ createClient }) => {
      client = createClient(supabaseUrl!, supabasePublishableKey!, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
        },
      })
      return client
    }).catch((error: unknown) => {
      pendingClient = null
      throw error
    })
  }
  return pendingClient
}
