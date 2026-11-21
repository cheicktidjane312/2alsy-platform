import { createServerSupabaseClient } from '@/lib/supabase-server'
import AdminResultatsClient from './AdminResultatsClient'
import type { Match } from '@/types/database'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminResultatsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [matchsRes, corrigesRes] = await Promise.all([
    supabase.from('matchs')
      .select('*, phase:phases(nom)')
      .eq('corrige', false)
      .neq('statut', 'annulé')
      .order('heure_coup_envoi', { ascending: false }),
    supabase.from('matchs')
      .select('*, phase:phases(nom)')
      .eq('corrige', true)
      .order('corrige_at', { ascending: false })
      .limit(10),
  ])

  const matchs = (matchsRes.data ?? []) as (Match & { phase: { nom: string } | null })[]
  const matchsCorriges = (corrigesRes.data ?? []) as (Match & { phase: { nom: string } | null })[]

  return (
    <AdminResultatsClient
      matchs={matchs}
      matchsCorriges={matchsCorriges}
      adminId={user?.id ?? ''}
    />
  )
}
