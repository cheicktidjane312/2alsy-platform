import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminAdminsClient from './AdminAdminsClient'
import type { Profile } from '@/types/database'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminAdminsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: myProfileData } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const myProfile = myProfileData as Pick<Profile, 'role'> | null

  if (myProfile?.role !== 'super_admin') redirect('/admin')

  const { data: adminsData } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['admin', 'super_admin'])
    .order('created_at', { ascending: true })

  const admins = (adminsData ?? []) as Profile[]

  return <AdminAdminsClient admins={admins} currentUserId={user.id} />
}
