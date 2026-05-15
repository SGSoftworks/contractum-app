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

    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!mounted) return

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          const { data, error } = await fetchProfile(session.user.id)
          if (!error) {
            setProfile(data)
          } else {
            console.error('Profile load error:', error)
            setProfile(null)
          }
        } else {
          setProfile(null)
        }
      } catch (error) {
        console.error('Auth init error:', error)
        if (mounted) {
          setProfile(null)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return

      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        const { data, error } = await fetchProfile(session.user.id)
        if (!error) {
          setProfile(data)
        } else {
          console.error('Profile load error:', error)
          setProfile(null)
        }
      } else {
        setProfile(null)
      }

      if (mounted) {
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [setLoading, setSession, setUser, setProfile])

  return <>{children}</>
}
