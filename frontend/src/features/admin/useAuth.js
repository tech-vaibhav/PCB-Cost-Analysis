import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const signIn = async (email, password) => {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}
const signOut = () => supabase.auth.signOut()

export default function useAuth() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  return { session, user: session?.user ?? null, token: session?.access_token, loading, signIn, signOut }
}
