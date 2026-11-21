import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import PronosticFormPage from './PronosticFormPage'
import type { Match, Pronostic } from '@/types/database'

export default async function PronosticMatchPage({ params }: { params: Promise<{ 'match-id': string }> }) {
  const { 'match-id': matchId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const [matchRes, pronoRes] = await Promise.all([
    supabase.from('matchs')
      .select('*, phase:phases(nom, ordre)')
      .eq('id', matchId)
      .single(),
    supabase.from('pronostics')
      .select('*')
      .eq('user_id', user.id)
      .eq('match_id', matchId)
      .maybeSingle(),
  ])

  if (!matchRes.data) notFound()

  const match = matchRes.data as Match & { phase: { nom: string; ordre: number } | null }
  const existingProno = (pronoRes.data ?? null) as Pronostic | null

  return (
    <PronosticFormPage
      match={match}
      existingProno={existingProno}
      userId={user.id}
    />
  )
}
