import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ClassementClient from './ClassementClient'
import { computeRanks } from '@/lib/utils'
import type { Profile, Phase, ClassementEntry } from '@/types/database'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ClassementPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const [profilesRes, phasesRes, classPhasesRes] = await Promise.all([
    supabase.from('profiles')
      .select('id, pseudo, nom_complet, code_promo, total_points, is_active')
      .eq('is_active', true)
      .order('total_points', { ascending: false })
      .order('pseudo', { ascending: true }),
    supabase.from('phases')
      .select('*')
      .order('ordre', { ascending: true }),
    supabase.from('classement_phases')
      .select('*'),
  ])

  const profiles = (profilesRes.data ?? []) as Pick<Profile, 'id' | 'pseudo' | 'nom_complet' | 'code_promo' | 'total_points'>[]
  const phases = (phasesRes.data ?? []) as Phase[]
  const classPhases = (classPhasesRes.data ?? []) as { user_id: string; phase_id: string; points_phase: number; matchs_joues: number }[]

  const ranks = computeRanks(profiles.map(p => p.total_points))
  const classementGeneral: ClassementEntry[] = profiles.map((p, i) => ({
    rang: ranks[i],
    user_id: p.id,
    pseudo: p.pseudo,
    nom_complet: p.nom_complet,
    code_promo: p.code_promo,
    total_points: p.total_points,
  }))

  return (
    <ClassementClient
      classementGeneral={classementGeneral}
      phases={phases}
      classPhases={classPhases}
      currentUserId={user.id}
      profiles={profiles}
    />
  )
}
