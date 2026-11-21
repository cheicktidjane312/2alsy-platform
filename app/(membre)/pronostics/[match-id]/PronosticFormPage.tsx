'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, AlertTriangle, CheckCircle, Lock } from 'lucide-react'
import { StaggerContainer, StaggerItem } from '@/components/ui/Stagger'
import { createClient } from '@/lib/supabase'
import { formatMatchTime, getTimeStatus } from '@/lib/time'
import { getFlagEmoji } from '@/lib/utils'
import MatchTimer from '@/components/match/MatchTimer'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import type { Match, Pronostic } from '@/types/database'

interface Props {
  match: Match & { phase: { nom: string; ordre: number } | null }
  existingProno: Pronostic | null
  userId: string
}

export default function PronosticFormPage({ match, existingProno, userId }: Props) {
  const router = useRouter()
  const [issue, setIssue] = useState<'domicile' | 'exterieur' | 'nul'>(
    existingProno?.issue_pronostiquee ?? 'domicile'
  )
  const [scoreDom, setScoreDom] = useState<string>(existingProno?.score_domicile_prono?.toString() ?? '')
  const [scoreExt, setScoreExt] = useState<string>(existingProno?.score_exterieur_prono?.toString() ?? '')
  const [premierBut, setPremierBut] = useState<'domicile' | 'exterieur' | 'aucun'>(
    existingProno?.equipe_premier_but_prono ?? 'domicile'
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [timeStatus, setTimeStatus] = useState(() => getTimeStatus(match.heure_coup_envoi))

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeStatus(getTimeStatus(match.heure_coup_envoi))
    }, 1000)
    return () => clearInterval(interval)
  }, [match.heure_coup_envoi])

  const isClosed = timeStatus.status === 'closed'
  const isReadOnly = !!existingProno || match.corrige

  const handleSubmit = async () => {
    if (isClosed) return
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const vainqueur = issue === 'nul' ? null : issue

      const { error: err } = await supabase.from('pronostics').insert({
        user_id: userId,
        match_id: match.id,
        issue_pronostiquee: issue,
        vainqueur_pronostique: vainqueur,
        score_domicile_prono: parseInt(scoreDom) || 0,
        score_exterieur_prono: parseInt(scoreExt) || 0,
        equipe_premier_but_prono: premierBut,
      })

      if (err) {
        if (err.code === '23505') {
          setError('Tu as déjà soumis un pronostic pour ce match.')
        } else if (err.message.includes('mi-temps') || err.message.includes('ferme')) {
          setError('Pronostic fermé - la mi-temps est passée.')
        } else {
          setError('Une erreur est survenue. Contacte l\'administrateur.')
        }
        return
      }

      setSuccess(true)
      setTimeout(() => router.push('/pronostics'), 2000)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card rounded-2xl p-10 text-center"
        >
          <CheckCircle className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-blue-400 mb-2">Pronostic soumis !</h2>
          <p className="text-slate-400 text-sm">Redirection vers tes pronostics...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <StaggerContainer className="max-w-lg mx-auto space-y-4">
      {/* Back */}
      <StaggerItem>
      <Link href="/pronostics" className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-400 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Retour aux pronostics
      </Link>
      </StaggerItem>

      {/* Match header */}
      <StaggerItem>
      <Card>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-blue-400/60 font-medium">{match.phase?.nom}</span>
          {!isReadOnly && <MatchTimer kickoffISO={match.heure_coup_envoi} showCountdown />}
        </div>

        <div className="flex items-center justify-around py-4">
          <div className="text-center">
            <div className="text-4xl mb-2">{getFlagEmoji(match.drapeau_domicile)}</div>
            <div className="font-bold text-white text-sm">{match.equipe_domicile}</div>
          </div>
          <div className="text-center">
            {match.corrige && match.score_domicile !== null ? (
              <div className="text-2xl font-black text-blue-400">{match.score_domicile} - {match.score_exterieur}</div>
            ) : (
              <div className="text-slate-600 font-bold">VS</div>
            )}
            <div className="text-xs text-slate-500 mt-1">{formatMatchTime(match.heure_coup_envoi)}</div>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-2">{getFlagEmoji(match.drapeau_exterieur)}</div>
            <div className="font-bold text-white text-sm">{match.equipe_exterieur}</div>
          </div>
        </div>
      </Card>
      </StaggerItem>

      {/* Alert malus */}
      {!isReadOnly && timeStatus.status === 'late' && (
        <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-orange-300">
            Match commencé - malus de <strong>-{timeStatus.malus} pt{timeStatus.malus > 1 ? 's' : ''}</strong> appliqué sur ce pronostic.
          </div>
        </div>
      )}

      {/* Fermé */}
      {isClosed && !isReadOnly && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3">
          <Lock className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-red-400 text-sm">Pronostic fermé</div>
            <div className="text-xs text-red-400/70 mt-0.5">La mi-temps est passée. Impossible de soumettre un pronostic.</div>
          </div>
        </div>
      )}

      {/* Déjà soumis - lecture seule */}
      {isReadOnly && existingProno && (
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-400">
          {match.corrige
            ? `Résultat : tu as obtenu ${existingProno.points_nets} pts (${existingProno.points_bruts} bruts${existingProno.malus > 0 ? ` - ${existingProno.malus} malus` : ''})`
            : 'Pronostic soumis - en attente du résultat du match'
          }
        </div>
      )}

      {/* Form */}
      <StaggerItem>
      <Card>
        <div className="space-y-6">
          {/* Issue */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">
              1. Résultat du match <span className="text-blue-400">(2 pts)</span>
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'domicile' as const, label: match.equipe_domicile },
                { value: 'nul' as const, label: 'Nul' },
                { value: 'exterieur' as const, label: match.equipe_exterieur },
              ]).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={isReadOnly || isClosed}
                  onClick={() => setIssue(opt.value)}
                  className={`py-2.5 px-2 rounded-lg text-xs font-semibold transition-all text-center ${
                    issue === opt.value
                      ? 'bg-[#1E40AF] text-white'
                      : 'glass-card text-slate-400 hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Score exact */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">
              2. Score exact <span className="text-blue-400">(6 pts)</span>
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex-1 text-right text-xs text-slate-500 truncate">{match.equipe_domicile}</div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                  value={scoreDom}
                  disabled={isReadOnly || isClosed}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '')
                    if (digits === '') return setScoreDom('')
                    setScoreDom(String(Math.min(20, parseInt(digits))))
                  }}
                  className="input-field w-16 text-center text-xl font-black rounded-lg py-2 px-2 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="text-slate-600 font-bold text-lg">-</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                  value={scoreExt}
                  disabled={isReadOnly || isClosed}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '')
                    if (digits === '') return setScoreExt('')
                    setScoreExt(String(Math.min(20, parseInt(digits))))
                  }}
                  className="input-field w-16 text-center text-xl font-black rounded-lg py-2 px-2 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div className="flex-1 text-xs text-slate-500 truncate">{match.equipe_exterieur}</div>
            </div>
          </div>

          {/* Vainqueur */}
          {issue !== 'nul' && (
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3">
                3. Vainqueur <span className="text-blue-400">(3 pts)</span>
              </h3>
              <div className="glass-card rounded-lg p-3 text-sm text-blue-400/70">
                {issue === 'domicile' ? match.equipe_domicile : match.equipe_exterieur} (déjà sélectionné)
              </div>
            </div>
          )}

          {/* Premier but */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">
              {issue !== 'nul' ? '4' : '3'}. Équipe 1er but <span className="text-blue-400">(4 pts)</span>
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'domicile' as const, label: match.equipe_domicile },
                { value: 'aucun' as const, label: 'Aucun but' },
                { value: 'exterieur' as const, label: match.equipe_exterieur },
              ]).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={isReadOnly || isClosed}
                  onClick={() => setPremierBut(opt.value)}
                  className={`py-2.5 px-2 rounded-lg text-xs font-semibold transition-all text-center ${
                    premierBut === opt.value
                      ? 'bg-[#1E40AF] text-white'
                      : 'glass-card text-slate-400 hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Points preview */}
          <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Points possibles :</span>
              <span className="text-blue-400 font-bold">
                15 pts max{timeStatus.malus > 0 ? ` (malus -${timeStatus.malus})` : ''}
              </span>
            </div>
          </div>
        </div>
      </Card>
      </StaggerItem>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Submit */}
      {!isReadOnly && !isClosed && (
        <StaggerItem>
        <Button
          onClick={handleSubmit}
          loading={loading}
          size="lg"
          className="w-full"
        >
          Soumettre mon pronostic
        </Button>
        </StaggerItem>
      )}
    </StaggerContainer>
  )
}
