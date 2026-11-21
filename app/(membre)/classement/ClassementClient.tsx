'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import ClassementTable from '@/components/classement/ClassementTable'
import Podium from '@/components/classement/Podium'
import { StaggerContainer, StaggerItem } from '@/components/ui/Stagger'
import { computeRanks } from '@/lib/utils'
import type { Phase, ClassementEntry } from '@/types/database'

interface Props {
  classementGeneral: ClassementEntry[]
  phases: Phase[]
  classPhases: { user_id: string; phase_id: string; points_phase: number; matchs_joues: number }[]
  currentUserId: string
  profiles: { id: string; pseudo: string; nom_complet: string; code_promo: string; total_points: number }[]
}

export default function ClassementClient({ classementGeneral, phases, classPhases, currentUserId, profiles }: Props) {
  const [selectedPhase, setSelectedPhase] = useState<string>('general')

  const getPhaseClassement = (phaseId: string): ClassementEntry[] => {
    const sorted = classPhases
      .filter(cp => cp.phase_id === phaseId)
      .map(cp => ({ cp, profile: profiles.find(p => p.id === cp.user_id) }))
      .filter((x): x is { cp: typeof classPhases[number]; profile: NonNullable<typeof x.profile> } => !!x.profile)
      .sort((a, b) => b.cp.points_phase - a.cp.points_phase || a.profile.pseudo.localeCompare(b.profile.pseudo))

    const ranks = computeRanks(sorted.map(x => x.cp.points_phase))
    return sorted.map(({ cp, profile }, i) => ({
      rang: ranks[i],
      user_id: cp.user_id,
      pseudo: profile.pseudo,
      nom_complet: profile.nom_complet,
      code_promo: profile.code_promo,
      total_points: cp.points_phase,
      matchs_joues: cp.matchs_joues,
    }))
  }

  const currentClassement = selectedPhase === 'general'
    ? classementGeneral
    : getPhaseClassement(selectedPhase)

  const top3 = currentClassement.slice(0, 3)
  const myEntry = currentClassement.find(e => e.user_id === currentUserId)

  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-blue-400">Classement</h1>
        {myEntry && (
          <div className="glass-card px-3 py-2 rounded-lg text-center">
            <div className="text-lg font-black text-blue-400">#{myEntry.rang}</div>
            <div className="text-xs text-slate-500">{myEntry.total_points} pts</div>
          </div>
        )}
      </StaggerItem>

      {/* Phase selector */}
      <StaggerItem className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedPhase('general')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedPhase === 'general' ? 'bg-[#1E40AF] text-white shadow-[0_0_0_1px_rgba(30,64,175,0.5)]' : 'glass-card text-slate-400 hover:text-blue-400'}`}
        >
          Général
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

      {/* Podium top 3 */}
      {top3.length >= 2 && (
        <StaggerItem>
          <Card>
            <Podium top3={top3} />
          </Card>
        </StaggerItem>
      )}

      {/* Table */}
      <StaggerItem>
        <Card className="p-0 overflow-hidden">
          <ClassementTable
            entries={currentClassement}
            currentUserId={currentUserId}
            showMatchs={selectedPhase !== 'general'}
          />
        </Card>
      </StaggerItem>
    </StaggerContainer>
  )
}
