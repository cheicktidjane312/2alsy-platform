'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/store/useAuth'

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setSession, setProfile, setLoading, reset } = useAuth()

  useEffect(() => {
    const supabase = createClient()

    const loadProfile = async (userId: string) => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      setProfile(data)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        reset()
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser, setSession, setProfile, setLoading, reset])

  return <>{children}</>
}
