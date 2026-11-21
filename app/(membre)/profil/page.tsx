import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ProfilClient from './ProfilClient'
import type { Profile } from '@/types/database'

export default async function ProfilPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const profile = data as Profile | null
  if (!profile) redirect('/connexion')

  return <ProfilClient profile={profile} email={user.email ?? ''} />
}
