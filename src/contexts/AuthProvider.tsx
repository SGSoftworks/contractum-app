import { useEffect, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchProfile } from '@/lib/profile'
import { useAuthStore } from '@/store/authStore'
import { useProfileStore } from '@/store/profileStore'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const setLoading = useAuthStore((state) => state.setLoading)
  const setSession = useAuthStore((state) => state.setSession)
  const setUser = useAuthStore((state) => state.setUser)
  const setProfile = useProfileStore((state) => state.setProfile)

  useEffect(() => {
    let mounted = true
    let resolved = false
    let timeout: ReturnType<typeof setTimeout>

    const finish = (session: any) => {
      if (!mounted) return
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id).then(({ data, error }) => {
          if (mounted && !error) setProfile(data)
        })
      } else {
        setProfile(null)
      }
      setLoading(false)
    }

    const initializeAuth = async () => {
      timeout = setTimeout(async () => {
        if (mounted && !resolved) {
          resolved = true
          console.warn('[Auth] Session check timed out, clearing')
          try { await supabase.auth.signOut() } catch (_) {}
          if (mounted) finish(null)
        }
      }, 5000)

      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (!mounted || resolved) return
        resolved = true
        clearTimeout(timeout)

        if (error || !session) {
          if (error) console.warn('[Auth] Session error:', error.message)
          finish(null)
          return
        }

        setSession(session)
        setUser(session.user)

        const { data, error: profileError } = await fetchProfile(session.user.id)
        if (!profileError) setProfile(data)
        else setProfile(null)
      } catch (error) {
        console.error('[Auth] Init error:', error)
        if (mounted) finish(null)
      } finally {
        if (mounted && !resolved) {
          resolved = true
          setLoading(false)
        }
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      finish(session)
    })

    return () => {
      mounted = false
      resolved = true
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [setLoading, setSession, setUser, setProfile])

  return <>{children}</>
}
