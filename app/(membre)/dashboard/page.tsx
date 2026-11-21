import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'
import type { Profile, Match, Pronostic } from '@/types/database'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const [profileRes, matchsRes, derniersPronosRes, topRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('matchs')
      .select('*, phase:phases(nom)')
      .neq('statut', 'annulé')
      .neq('statut', 'terminé')
      .order('heure_coup_envoi', { ascending: true }),
    supabase.from('pronostics')
      .select('*, match:matchs(*, phase:phases(nom))')
      .eq('user_id', user.id)
      .order('soumis_at', { ascending: false })
      .limit(3),
    supabase.from('profiles')
      .select('id, pseudo, total_points, code_promo')
      .eq('is_active', true)
      .order('total_points', { ascending: false })
      .order('pseudo', { ascending: true })
      .limit(5),
  ])

  const profile = profileRes.data as Profile | null
  if (!profile) redirect('/connexion')
  if (!profile.is_active) redirect('/compte-desactive')

  const matchsOuverts = (matchsRes.data ?? []) as (Match & { phase: { nom: string } | null })[]
  const derniersPronostics = (derniersPronosRes.data ?? []) as (Pronostic & { match: (Match & { phase: { nom: string } | null }) | null })[]
  const topClassement = (topRes.data ?? []) as { id: string; pseudo: string; total_points: number; code_promo: string }[]

  const [{ count: rang }, { count: totalPronos }] = await Promise.all([
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .gt('total_points', profile.total_points),
    supabase
      .from('pronostics')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ])

  const monRang = (rang ?? 0) + 1

  const matchIds = matchsOuverts.map(m => m.id)
  const mesPronosRes = matchIds.length > 0
    ? await supabase.from('pronostics').select('match_id').eq('user_id', user.id).in('match_id', matchIds)
    : { data: [] }

  const pronoDoneIds = ((mesPronosRes.data ?? []) as { match_id: string }[]).map(p => p.match_id)

  return (
    <DashboardClient
      profile={profile}
      rang={monRang}
      totalPronostics={totalPronos ?? 0}
      matchsOuverts={matchsOuverts}
      pronoDoneIds={pronoDoneIds}
      derniersPronostics={derniersPronostics}
      topClassement={topClassement}
      userId={user.id}
    />
  )
}
