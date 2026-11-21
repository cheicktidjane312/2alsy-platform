import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import HistoriqueClient from './HistoriqueClient'
import type { Pronostic, Match, Phase } from '@/types/database'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function HistoriquePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const [pronosRes, phasesRes] = await Promise.all([
    supabase.from('pronostics')
      .select('*, match:matchs(*, phase:phases(nom, ordre))')
      .eq('user_id', user.id)
      .order('soumis_at', { ascending: false }),
    supabase.from('phases').select('*').order('ordre', { ascending: true }),
  ])

  const pronostics = (pronosRes.data ?? []) as (Pronostic & {
    match: (Match & { phase: { nom: string; ordre: number } | null }) | null
  })[]
  const phases = (phasesRes.data ?? []) as Phase[]

  return <HistoriqueClient pronostics={pronostics} phases={phases} />
}
