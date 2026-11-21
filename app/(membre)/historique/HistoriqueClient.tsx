'use client'

import { useState } from 'react'
import { FileText } from 'lucide-react'
import { StaggerContainer, StaggerItem } from '@/components/ui/Stagger'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { formatMatchTime } from '@/lib/time'
import { getFlagEmoji } from '@/lib/utils'
import { getMalusLabel } from '@/lib/scoring'
import type { Pronostic, Match, Phase } from '@/types/database'

type PronosticWithMatch = Pronostic & {
  match: (Match & { phase: { nom: string; ordre: number } | null }) | null
}

interface Props {
  pronostics: PronosticWithMatch[]
  phases: Phase[]
}

export default function HistoriqueClient({ pronostics, phases }: Props) {
  const [selectedPhase, setSelectedPhase] = useState<string>('all')

  const filtered = pronostics.filter(p => {
    if (selectedPhase === 'all') return true
    return p.match?.phase_id === selectedPhase
  })

  const totalPoints = pronostics.reduce((sum, p) => sum + (p.points_nets ?? 0), 0)
  const matchsCorrigesCount = pronostics.filter(p => p.match?.corrige).length

  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <h1 className="text-2xl font-bold text-blue-400">Mon historique</h1>
      </StaggerItem>

      {/* Stats rapides */}
      <StaggerItem className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pronostics', value: pronostics.length },
          { label: 'Points gagnés', value: totalPoints, accent: true },
          { label: 'Matchs corrigés', value: matchsCorrigesCount },
        ].map(({ label, value, accent }) => (
          <Card key={label} className="text-center">
            <div className={`text-2xl font-black ${accent ? 'text-blue-400' : 'text-white'}`}>{value}</div>
            <div className="text-xs text-slate-500 mt-1">{label}</div>
          </Card>
        ))}
      </StaggerItem>

      {/* Phase filter */}
      <StaggerItem className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedPhase('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedPhase === 'all' ? 'bg-[#1E40AF] text-white shadow-[0_0_0_1px_rgba(30,64,175,0.5)]' : 'glass-card text-slate-400 hover:text-blue-400'}`}
        >
          Toutes les phases
        </button>
        {phases.map(phase => (
          <button
            key={phase.id}
            onClick={() => setSelectedPhase(phase.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedPhase === phase.id ? 'bg-[#1E40AF] text-white shadow-[0_0_0_1px_rgba(30,64,175,0.5)]' : 'glass-card text-slate-400 hover:text-blue-400'}`}
          >
            {phase.nom}
          </button>
        ))}
      </StaggerItem>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <FileText className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Aucun pronostic dans cette phase</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((prono, i) => {
            const m = prono.match
            if (!m) return null
            return (
              <StaggerItem key={prono.id}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Match title */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm">{getFlagEmoji(m.drapeau_domicile)}</span>
                        <span className="text-sm font-semibold text-white">{m.equipe_domicile}</span>
                        <span className="text-slate-600 text-xs">vs</span>
                        <span className="text-sm font-semibold text-white">{m.equipe_exterieur}</span>
                        <span className="text-sm">{getFlagEmoji(m.drapeau_exterieur)}</span>
                      </div>

                      <div className="text-xs text-slate-500 mb-3">{formatMatchTime(m.heure_coup_envoi)} - {m.phase?.nom}</div>

                      {/* Mon pronostic */}
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                        <div>
                          <span className="text-slate-500">Mon prono : </span>
                          <span className="text-white">{prono.score_domicile_prono} - {prono.score_exterieur_prono}</span>
                          <span className="text-slate-500 ml-2">({prono.issue_pronostiquee === 'domicile' ? m.equipe_domicile : prono.issue_pronostiquee === 'exterieur' ? m.equipe_exterieur : 'Nul'})</span>
                        </div>
                        {m.corrige && m.score_domicile !== null && (
                          <div>
                            <span className="text-slate-500">Résultat : </span>
                            <span className="text-blue-400 font-semibold">{m.score_domicile} - {m.score_exterieur}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-500">1er but : </span>
                          <span className="text-white">{prono.equipe_premier_but_prono === 'domicile' ? m.equipe_domicile : prono.equipe_premier_but_prono === 'exterieur' ? m.equipe_exterieur : 'Aucun'}</span>
                        </div>
                        {prono.malus > 0 && (
                          <div>
                            <span className="text-slate-500">Malus : </span>
                            <span className="text-orange-400">{getMalusLabel(prono.malus)}</span>
                          </div>
                        )}
                      </div>

                      {/* Breakdown points si corrigé */}
                      {m.corrige && (
                        <div className="mt-2 pt-2 border-t border-white/5 flex flex-wrap gap-2 text-xs">
                          {prono.points_issue > 0 && <span className="text-emerald-400">+{prono.points_issue} issue</span>}
                          {prono.points_vainqueur > 0 && <span className="text-emerald-400">+{prono.points_vainqueur} vainqueur</span>}
                          {prono.points_score > 0 && <span className="text-emerald-400">+{prono.points_score} score</span>}
                          {prono.points_premier_but > 0 && <span className="text-emerald-400">+{prono.points_premier_but} 1er but</span>}
                          {prono.malus > 0 && <span className="text-orange-400">-{prono.malus} malus</span>}
                        </div>
                      )}
                    </div>

                    {/* Points */}
                    <div className="text-right flex-shrink-0">
                      {m.corrige ? (
                        <>
                          <div className="text-xl font-black text-blue-400">+{prono.points_nets}</div>
                          <div className="text-xs text-slate-500">pts nets</div>
                          <Badge variant="corrected" className="mt-1">Corrigé</Badge>
                        </>
                      ) : (
                        <Badge variant="default">En attente</Badge>
                      )}
                    </div>
                  </div>
                </Card>
              </StaggerItem>
            )
          })}
        </div>
      )}
    </StaggerContainer>
  )
}
