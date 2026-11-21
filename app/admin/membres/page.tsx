import { createServerSupabaseClient } from '@/lib/supabase-server'
import AdminMembresClient from './AdminMembresClient'
import type { Profile } from '@/types/database'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminMembresPage() {
  const supabase = await createServerSupabaseClient()

  const [membresRes, pronoRes] = await Promise.all([
    supabase.from('profiles').select('*').order('total_points', { ascending: false }),
    supabase.from('pronostics').select('user_id'),
  ])

  const membres = (membresRes.data ?? []) as Profile[]
  const pronoCounts = (pronoRes.data ?? []) as { user_id: string }[]

  const pronoByUser: Record<string, number> = {}
  for (const p of pronoCounts) {
    pronoByUser[p.user_id] = (pronoByUser[p.user_id] ?? 0) + 1
  }

  return <AdminMembresClient membres={membres} pronoByUser={pronoByUser} />
}
