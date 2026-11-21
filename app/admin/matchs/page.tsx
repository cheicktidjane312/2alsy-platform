import { createServerSupabaseClient } from '@/lib/supabase-server'
import AdminMatchsClient from './AdminMatchsClient'
import type { Match, Phase } from '@/types/database'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminMatchsPage() {
  const supabase = await createServerSupabaseClient()

  const [matchsRes, phasesRes] = await Promise.all([
    supabase.from('matchs')
      .select('*, phase:phases(nom, ordre)')
      .neq('statut', 'annulé')
      .order('heure_coup_envoi', { ascending: true }),
    supabase.from('phases')
      .select('*')
      .order('ordre', { ascending: true }),
  ])

  const matchs = (matchsRes.data ?? []) as (Match & { phase: { nom: string; ordre: number } | null })[]
  const phases = (phasesRes.data ?? []) as Phase[]

  return <AdminMatchsClient matchs={matchs} phases={phases} />
}
