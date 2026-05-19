import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'

const fetchWithTimeout: typeof fetch = (url, init) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timeout))
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    },
    global: {
      fetch: fetchWithTimeout
    }
  }
)
