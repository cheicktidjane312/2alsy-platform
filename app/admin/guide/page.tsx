import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminGuideClient from './AdminGuideClient'
import type { Profile } from '@/types/database'

export default async function AdminGuidePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const profile = data as Pick<Profile, 'role'> | null
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) redirect('/dashboard')

  return <AdminGuideClient />
}
