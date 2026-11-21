'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { StaggerContainer, StaggerItem } from '@/components/ui/Stagger'
import MatchCard from '@/components/match/MatchCard'
import { getTimeStatus } from '@/lib/time'
import type { Match, Pronostic, Phase } from '@/types/database'

type Filter = 'tous' | 'a-faire' | 'soumis' | 'termines'

interface Props {
  matchs: (Match & { phase: { nom: string; ordre: number } | null })[]
  pronoMap: Record<string, Pronostic>
  phases: Phase[]
}

export default function PronosticsClient({ matchs, pronoMap, phases }: Props) {
  const [filter, setFilter] = useState<Filter>('a-faire')
  const [selectedPhase, setSelectedPhase] = useState<string>('all')

  const filteredMatchs = matchs.filter(m => {
    const hasPrno = !!pronoMap[m.id]
    const status = getTimeStatus(m.heure_coup_envoi)

    if (selectedPhase !== 'all' && m.phase_id !== selectedPhase) return false

    switch (filter) {
      case 'a-faire':
        return !hasPrno && status.status !== 'closed' && !m.corrige
      case 'soumis':
        return hasPrno && !m.corrige
      case 'termines':
        return m.corrige
      default:
        return true
    }
  })

  const byPhase: Record<string, typeof filteredMatchs> = {}
  for (const m of filteredMatchs) {
    const phaseKey = m.phase?.nom ?? 'Autre'
    if (!byPhase[phaseKey]) byPhase[phaseKey] = []
    byPhase[phaseKey].push(m)
  }

  const aFaireCount = matchs.filter(m => !pronoMap[m.id] && getTimeStatus(m.heure_coup_envoi).status !== 'closed' && !m.corrige).length
  const soumisCount = matchs.filter(m => !!pronoMap[m.id] && !m.corrige).length
  const terminesCount = matchs.filter(m => m.corrige).length

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'a-faire', label: 'À faire', count: aFaireCount },
    { key: 'soumis', label: 'Soumis', count: soumisCount },
    { key: 'termines', label: 'Terminés', count: terminesCount },
    { key: 'tous', label: 'Tous', count: matchs.length },
  ]

  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <h1 className="text-2xl font-bold text-blue-400">Pronostics</h1>
      </StaggerItem>

      {/* Filters */}
      <StaggerItem className="flex flex-wrap gap-2">
        {filters.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === key
                ? 'bg-[#1E40AF] text-white shadow-[0_0_0_1px_rgba(30,64,175,0.5)]'
                : 'glass-card text-slate-400 hover:text-blue-400'
            }`}
          >
            {label}
            {count > 0 && (
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${filter === key ? 'bg-white/20' : 'bg-white/10'}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </StaggerItem>

      {/* Phase filter */}
      {phases.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedPhase('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedPhase === 'all' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'glass-card text-slate-500 hover:text-blue-400'}`}
          >
            Toutes les phases
          </button>
          {phases.map(phase => (
            <button
              key={phase.id}
              onClick={() => setSelectedPhase(phase.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedPhase === phase.id ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'glass-card text-slate-500 hover:text-blue-400'}`}
            >
              {phase.nom}
            </button>
          ))}
        </div>
      )}

      {/* Matchs */}
      {Object.keys(byPhase).length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Search className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Aucun match dans cette catégorie</p>
        </div>
      ) : (
        Object.entries(byPhase).map(([phaseName, phaseMatchs]) => (
          <StaggerItem key={phaseName}>
            <h3 className="text-sm font-semibold text-blue-400/60 uppercase tracking-widest mb-3">{phaseName}</h3>
            <div className="space-y-3">
              {phaseMatchs.map((match, i) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  pronostic={pronoMap[match.id]}
                  index={i}
                />
              ))}
            </div>
          </StaggerItem>
        ))
      )}
    </StaggerContainer>
  )
}
