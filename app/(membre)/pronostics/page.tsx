import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import PronosticsClient from './PronosticsClient'
import type { Match, Pronostic, Phase } from '@/types/database'

export default async function PronosticsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const [matchsRes, mesPronosRes, phasesRes] = await Promise.all([
    supabase.from('matchs')
      .select('*, phase:phases(nom, ordre)')
      .neq('statut', 'annulé')
      .order('heure_coup_envoi', { ascending: true }),
    supabase.from('pronostics')
      .select('*')
      .eq('user_id', user.id),
    supabase.from('phases')
      .select('*')
      .order('ordre', { ascending: true }),
  ])

  const matchs = (matchsRes.data ?? []) as (Match & { phase: { nom: string; ordre: number } | null })[]
  const mesPronostics = (mesPronosRes.data ?? []) as Pronostic[]
  const phases = (phasesRes.data ?? []) as Phase[]

  const pronoMap: Record<string, Pronostic> = {}
  for (const p of mesPronostics) {
    pronoMap[p.match_id] = p
  }

  return (
    <PronosticsClient
      matchs={matchs}
      pronoMap={pronoMap}
      phases={phases}
    />
  )
}
