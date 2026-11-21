'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Save, AlertTriangle, ArrowLeft } from 'lucide-react'
import { StaggerContainer, StaggerItem } from '@/components/ui/Stagger'
import { createClient } from '@/lib/supabase'
import { formatMatchTime, isMatchClosed } from '@/lib/time'
import { getFlagEmoji } from '@/lib/utils'
import Card, { CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import type { Match } from '@/types/database'

interface Props {
  matchs: (Match & { phase: { nom: string } | null })[]
  matchsCorriges: (Match & { phase: { nom: string } | null })[]
  adminId: string
}

interface MatchResult {
  score_domicile: string
  score_exterieur: string
  equipe_premier_but: 'domicile' | 'exterieur' | 'aucun'
}

export default function AdminResultatsClient({ matchs, matchsCorriges, adminId }: Props) {
  const router = useRouter()
  const [results, setResults] = useState<Record<string, MatchResult>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [correctingId, setCorrectingId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Record<string, { type: 'success' | 'error'; text: string }>>({})

  const setResult = (matchId: string, field: keyof MatchResult, value: string) => {
    setResults(prev => ({
      ...prev,
      [matchId]: { ...{ score_domicile: '', score_exterieur: '', equipe_premier_but: 'domicile' as const }, ...prev[matchId], [field]: value },
    }))
  }

  const handleSaveScore = async (matchId: string) => {
    const r = results[matchId]
    if (!r) return
    if (r.score_domicile === '' || r.score_exterieur === '') {
      setMessages(m => ({ ...m, [matchId]: { type: 'error', text: 'Renseigne les deux scores.' } }))
      return
    }
    setSavingId(matchId)
    const supabase = createClient()
    const { error } = await supabase.from('matchs').update({
      score_domicile: parseInt(r.score_domicile) || 0,
      score_exterieur: parseInt(r.score_exterieur) || 0,
      equipe_premier_but: r.equipe_premier_but,
      statut: 'terminé',
    }).eq('id', matchId)
    setSavingId(null)
    if (error) {
      setMessages(m => ({ ...m, [matchId]: { type: 'error', text: 'Erreur lors de la sauvegarde. Réessaie.' } }))
    } else {
      setMessages(m => ({ ...m, [matchId]: { type: 'success', text: 'Score sauvegardé. Prêt à corriger.' } }))
      router.refresh()
    }
  }

  const handleCorrect = async (match: Match) => {
    if (match.score_domicile === null || match.score_exterieur === null) {
      setMessages(m => ({ ...m, [match.id]: { type: 'error', text: 'Saisir les scores d\'abord.' } }))
      return
    }
    setCorrectingId(match.id)
    const supabase = createClient()
    const { error } = await supabase.rpc('corriger_match', {
      p_match_id: match.id,
      p_admin_id: adminId,
    })
    setCorrectingId(null)
    if (error) {
      setMessages(m => ({ ...m, [match.id]: { type: 'error', text: 'Une erreur est survenue. Contacte l\'administrateur.' } }))
    } else {
      setMessages(m => ({ ...m, [match.id]: { type: 'success', text: 'Match corrigé avec succès ! Points distribués.' } }))
      router.refresh()
    }
  }

  const matchsAvecResultats = matchs.filter(m => m.score_domicile !== null)
  const matchsSansResultats = matchs.filter(m => m.score_domicile === null)
  const matchsClosed = matchsSansResultats.filter(m => isMatchClosed(m.heure_coup_envoi))

  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <Link href="/admin" className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-400 transition-colors mb-4 md:hidden">
          <ArrowLeft className="h-4 w-4" />
          Tableau de bord
        </Link>
        <h1 className="text-2xl font-bold text-blue-400">Saisie des résultats</h1>
        <p className="text-sm text-slate-500 mt-1">Entrez les scores et corrigez les pronostics</p>
      </StaggerItem>

      {matchsAvecResultats.length > 0 && (
        <StaggerItem>
        <Card>
          <CardTitle className="mb-4 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Prêts à être corrigés ({matchsAvecResultats.length})
          </CardTitle>
          <div className="space-y-3">
            {matchsAvecResultats.map(match => (
              <div key={match.id}
                className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-white text-sm">
                      {getFlagEmoji(match.drapeau_domicile)} {match.equipe_domicile} {match.score_domicile} - {match.score_exterieur} {match.equipe_exterieur} {getFlagEmoji(match.drapeau_exterieur)}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{formatMatchTime(match.heure_coup_envoi)} - {match.phase?.nom}</div>
                    <div className="text-xs text-slate-500">1er but : {match.equipe_premier_but === 'domicile' ? match.equipe_domicile : match.equipe_premier_but === 'exterieur' ? match.equipe_exterieur : 'Aucun'}</div>
                  </div>
                  <Button
                    onClick={() => handleCorrect(match)}
                    loading={correctingId === match.id}
                    size="sm"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Corriger les pronostics
                  </Button>
                </div>
                {messages[match.id] && (
                  <div className={`mt-2 text-xs px-3 py-2 rounded-lg ${messages[match.id].type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {messages[match.id].text}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
        </StaggerItem>
      )}

      {matchsClosed.length > 0 && (
        <StaggerItem>
        <Card>
          <CardTitle className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            <span className="text-orange-400">Matchs terminés - scores manquants ({matchsClosed.length})</span>
          </CardTitle>
          <div className="space-y-4">
            {matchsClosed.map(match => {
              const r = results[match.id] ?? { score_domicile: '', score_exterieur: '', equipe_premier_but: 'domicile' as const }
              return (
                <div key={match.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="font-semibold text-white text-sm">
                        {getFlagEmoji(match.drapeau_domicile)} {match.equipe_domicile} vs {match.equipe_exterieur} {getFlagEmoji(match.drapeau_exterieur)}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{formatMatchTime(match.heure_coup_envoi)} - {match.phase?.nom}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-400 flex-shrink-0">{match.equipe_domicile}</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="0"
                        value={r.score_domicile}
                        onChange={e => {
                          const digits = e.target.value.replace(/\D/g, '')
                          setResult(match.id, 'score_domicile', digits === '' ? '' : String(Math.min(20, parseInt(digits))))
                        }}
                        className="input-field w-16 text-center rounded-lg py-2 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-400 flex-shrink-0">{match.equipe_exterieur}</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="0"
                        value={r.score_exterieur}
                        onChange={e => {
                          const digits = e.target.value.replace(/\D/g, '')
                          setResult(match.id, 'score_exterieur', digits === '' ? '' : String(Math.min(20, parseInt(digits))))
                        }}
                        className="input-field w-16 text-center rounded-lg py-2 text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate-400">1er but</label>
                      <select
                        value={r.equipe_premier_but}
                        onChange={e => setResult(match.id, 'equipe_premier_but', e.target.value)}
                        className="input-field rounded-lg py-2 text-sm"
                      >
                        <option value="domicile">{match.equipe_domicile}</option>
                        <option value="exterieur">{match.equipe_exterieur}</option>
                        <option value="aucun">Aucun but</option>
                      </select>
                    </div>
                  </div>

                  {messages[match.id] && (
                    <div className={`mt-3 text-xs px-3 py-2 rounded-lg ${messages[match.id].type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {messages[match.id].text}
                    </div>
                  )}

                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSaveScore(match.id)}
                      loading={savingId === match.id}
                    >
                      <Save className="h-3.5 w-3.5" />
                      Sauvegarder le score
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
        </StaggerItem>
      )}

      {matchs.length === 0 && (
        <StaggerItem>
        <Card className="text-center py-10">
          <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto mb-3" />
          <p className="text-slate-400">Tous les matchs ont été corrigés.</p>
        </Card>
        </StaggerItem>
      )}

      {matchsCorriges.length > 0 && (
        <StaggerItem>
        <Card>
          <CardTitle className="mb-4">Dernières corrections</CardTitle>
          <div className="space-y-2">
            {matchsCorriges.map(match => (
              <div key={match.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <div className="text-sm text-white">{match.equipe_domicile} {match.score_domicile} - {match.score_exterieur} {match.equipe_exterieur}</div>
                  <div className="text-xs text-slate-500">{match.phase?.nom}</div>
                </div>
                <Badge variant="corrected">Corrigé</Badge>
              </div>
            ))}
          </div>
        </Card>
        </StaggerItem>
      )}
    </StaggerContainer>
  )
}
