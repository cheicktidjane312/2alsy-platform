import { createServerSupabaseClient } from '@/lib/supabase-server'
import Link from 'next/link'
import Card, { CardTitle } from '@/components/ui/Card'
import { Calendar, CheckSquare, Users, AlertTriangle, Trophy } from 'lucide-react'
import { formatMatchTime } from '@/lib/time'
import type { Match } from '@/types/database'

// Toujours recalculer les compteurs à partir de la base, jamais de cache
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminDashboardPage() {
  const supabase = await createServerSupabaseClient()

  // Un match est "à corriger" dès que la mi-temps est passée (pronostics fermés)
  // et qu'il n'est ni annulé ni déjà corrigé — qu'on ait saisi le score ou non.
  const closedCutoff = new Date(Date.now() - 45 * 60000).toISOString()

  const [
    totalMembresRes,
    totalPronosticsRes,
    matchsNonCoriggesRes,
    prochainMatchsRes,
    matchsCoriggesRes,
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('pronostics').select('*', { count: 'exact', head: true }),
    supabase.from('matchs').select('*', { count: 'exact', head: true })
      .eq('corrige', false)
      .neq('statut', 'annulé')
      .lt('heure_coup_envoi', closedCutoff),
    supabase.from('matchs')
      .select('*, phase:phases(nom)')
      .neq('statut', 'annulé')
      .neq('statut', 'terminé')
      .order('heure_coup_envoi', { ascending: true })
      .limit(5),
    supabase.from('matchs').select('*', { count: 'exact', head: true }).eq('corrige', true),
  ])

  const totalMembres = totalMembresRes.count ?? 0
  const totalPronostics = totalPronosticsRes.count ?? 0
  const matchsNonCorriges = matchsNonCoriggesRes.count ?? 0
  const matchsCorriges = matchsCoriggesRes.count ?? 0
  const prochainMatchs = (prochainMatchsRes.data ?? []) as (Match & { phase: { nom: string } | null })[]

  return (
    <div className="space-y-6 animate-page-enter">
      <div>
        <h1 className="text-2xl font-bold text-blue-400">Tableau de bord</h1>
        <p className="text-sm text-slate-500 mt-1">Administration 2ALSY CUP</p>
      </div>

      {/* Alerte matchs à corriger */}
      {matchsNonCorriges > 0 && (
        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-400 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-semibold text-orange-300">
              {matchsNonCorriges} match{matchsNonCorriges > 1 ? 's' : ''} à corriger
            </div>
            <div className="text-xs text-orange-400/70 mt-0.5">Des matchs terminés attendent la saisie des résultats</div>
          </div>
          <Link href="/admin/resultats" className="btn-primary px-4 py-2 text-sm rounded-lg flex-shrink-0">
            Corriger
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Membres actifs', value: totalMembres, icon: Users, color: 'text-blue-400' },
          { label: 'Pronostics soumis', value: totalPronostics, icon: Trophy, color: 'text-purple-400' },
          { label: 'Matchs corrigés', value: matchsCorriges, icon: CheckSquare, color: 'text-emerald-400' },
          { label: 'À corriger', value: matchsNonCorriges, icon: AlertTriangle, color: 'text-orange-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="text-center">
            <Icon className={`h-5 w-5 mx-auto mb-2 ${color}`} />
            <div className={`text-2xl font-black ${color}`}>{value}</div>
            <div className="text-xs text-slate-500 mt-1">{label}</div>
          </Card>
        ))}
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/matchs" className="glass-card rounded-xl p-5 hover:border-[rgba(59,130,246,0.35)] transition-all group">
          <Calendar className="h-6 w-6 text-blue-400 mb-3" />
          <div className="font-bold text-white group-hover:text-blue-400 transition-colors">Gérer les matchs</div>
          <div className="text-xs text-slate-500 mt-1">Créer et modifier les matchs</div>
        </Link>
        <Link href="/admin/resultats" className="glass-card rounded-xl p-5 hover:border-[rgba(59,130,246,0.35)] transition-all group">
          <CheckSquare className="h-6 w-6 text-blue-400 mb-3" />
          <div className="font-bold text-white group-hover:text-blue-400 transition-colors">Saisir les résultats</div>
          <div className="text-xs text-slate-500 mt-1">Entrer les scores et corriger</div>
        </Link>
        <Link href="/admin/membres" className="glass-card rounded-xl p-5 hover:border-[rgba(59,130,246,0.35)] transition-all group">
          <Users className="h-6 w-6 text-blue-400 mb-3" />
          <div className="font-bold text-white group-hover:text-blue-400 transition-colors">Gérer les membres</div>
          <div className="text-xs text-slate-500 mt-1">Voir et administrer les membres</div>
        </Link>
      </div>

      {/* Prochains matchs */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Prochains matchs</CardTitle>
          <Link href="/admin/matchs" className="text-xs text-blue-400/60 hover:text-blue-400 transition-colors">
            Voir tout
          </Link>
        </div>
        <div className="space-y-2">
          {prochainMatchs.length === 0 ? (
            <p className="text-slate-500 text-sm py-4 text-center">Aucun match programmé</p>
          ) : (
            prochainMatchs.map(match => (
              <div key={match.id} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                <div>
                  <div className="text-sm font-medium text-white">{match.equipe_domicile} vs {match.equipe_exterieur}</div>
                  <div className="text-xs text-slate-500">{formatMatchTime(match.heure_coup_envoi)} - {(match.phase as { nom: string } | null)?.nom}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${match.statut === 'ouvert' ? 'badge-open' : 'bg-white/10 text-slate-400'}`}>
                  {match.statut}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
