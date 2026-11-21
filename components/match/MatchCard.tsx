'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { formatMatchTime, getTimeStatus } from '@/lib/time'
import { getFlagEmoji } from '@/lib/utils'
import MatchTimer from './MatchTimer'
import Badge from '@/components/ui/Badge'
import type { Match, Pronostic } from '@/types/database'

interface MatchCardProps {
  match: Match
  pronostic?: Pronostic
  index?: number
  showPhase?: boolean
}

export default function MatchCard({ match, pronostic, index = 0, showPhase }: MatchCardProps) {
  const status = getTimeStatus(match.heure_coup_envoi)
  const canPronostic = status.status !== 'closed' && !pronostic && !match.corrige
  const hasPronostic = !!pronostic

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        href={`/pronostics/${match.id}`}
        className="block glass-card rounded-xl p-4 hover:border-[rgba(59,130,246,0.35)] transition-all group"
      >
        <div className="flex items-center justify-between gap-4">
          {/* Teams */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center text-center min-w-0 flex-1">
                <span className="text-2xl">{getFlagEmoji(match.drapeau_domicile)}</span>
                <span className="text-xs font-semibold text-white mt-1 truncate max-w-[80px]">{match.equipe_domicile}</span>
              </div>

              <div className="flex flex-col items-center flex-shrink-0">
                {match.corrige && match.score_domicile !== null ? (
                  <div className="text-lg font-bold text-blue-400">
                    {match.score_domicile} - {match.score_exterieur}
                  </div>
                ) : (
                  <span className="text-slate-600 font-bold text-sm">VS</span>
                )}
                <span className="text-[10px] text-slate-500 mt-0.5">{formatMatchTime(match.heure_coup_envoi)}</span>
              </div>

              <div className="flex flex-col items-center text-center min-w-0 flex-1">
                <span className="text-2xl">{getFlagEmoji(match.drapeau_exterieur)}</span>
                <span className="text-xs font-semibold text-white mt-1 truncate max-w-[80px]">{match.equipe_exterieur}</span>
              </div>
            </div>
          </div>

          {/* Status & action */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {match.corrige ? (
              <div className="flex flex-col items-end gap-1">
                <Badge variant="corrected">Corrigé</Badge>
                {hasPronostic && (
                  <span className="text-xs font-bold text-blue-400">+{pronostic!.points_nets} pts</span>
                )}
              </div>
            ) : (
              <>
                <MatchTimer kickoffISO={match.heure_coup_envoi} />
                {hasPronostic && (
                  <Badge variant="default">Soumis</Badge>
                )}
              </>
            )}
            <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-blue-400 transition-colors" />
          </div>
        </div>

        {/* My pronostic summary */}
        {hasPronostic && (
          <div className="mt-3 pt-3 border-t border-blue-500/10">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Mon prono : {pronostic!.score_domicile_prono} - {pronostic!.score_exterieur_prono}</span>
              {pronostic!.malus > 0 && (
                <span className="text-orange-400">malus -{pronostic!.malus} pt{pronostic!.malus > 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
        )}
      </Link>
    </motion.div>
  )
}
