'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Trophy, Star, Target, TrendingUp, ChevronRight, Award, CheckSquare, Calendar } from 'lucide-react'
import { StaggerContainer, StaggerItem } from '@/components/ui/Stagger'
import Card, { CardTitle } from '@/components/ui/Card'
import MatchCard from '@/components/match/MatchCard'
import { getInitials, getRankColor, computeRanks } from '@/lib/utils'
import type { Profile, Match, Pronostic } from '@/types/database'

interface Props {
  profile: Profile
  rang: number
  totalPronostics: number
  matchsOuverts: (Match & { phase: { nom: string } | null })[]
  pronoDoneIds: string[]
  derniersPronostics: (Pronostic & { match: (Match & { phase: { nom: string } | null }) | null })[]
  topClassement: { id: string; pseudo: string; total_points: number; code_promo: string }[]
  userId: string
}

function CountUp({ target, duration = 1.5 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0)
  const startTime = useRef<number | null>(null)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    const animate = (now: number) => {
      if (startTime.current === null) startTime.current = now
      const elapsed = (now - startTime.current) / 1000
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(target * eased))
      if (progress < 1) frameRef.current = requestAnimationFrame(animate)
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [target, duration])

  return <>{count}</>
}

export default function DashboardClient({ profile, rang, totalPronostics, matchsOuverts, pronoDoneIds, derniersPronostics, topClassement, userId }: Props) {
  const pronoDoneSet = new Set(pronoDoneIds)
  const matchsAFaire = matchsOuverts.filter(m => !pronoDoneSet.has(m.id))
  const topRanks = computeRanks(topClassement.map(e => e.total_points))

  return (
    <StaggerContainer className="space-y-6">
      {/* Bandeau de bienvenue */}
      <StaggerItem>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Bonjour, <span className="text-blue-400">{profile.pseudo}</span>
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">{profile.code_promo} - Rang #{rang} sur le classement</p>
          </div>
          <div className="glass-card rounded-xl px-4 py-2 text-center flex-shrink-0">
            <div className={`text-2xl font-black ${getRankColor(rang)}`}>#{rang}</div>
            <div className="text-xs text-slate-500">Classement</div>
          </div>
        </div>
      </StaggerItem>

      {/* KPI cards */}
      <StaggerItem>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: TrendingUp, label: 'Points totaux', value: profile.total_points, color: 'text-blue-400' },
            { icon: Award, label: 'Rang actuel', value: rang, color: 'text-yellow-400', prefix: '#' },
            { icon: CheckSquare, label: 'Pronostics faits', value: totalPronostics, color: 'text-emerald-400' },
            { icon: Calendar, label: 'Matchs ouverts', value: matchsAFaire.length, color: 'text-purple-400' },
          ].map(({ icon: Icon, label, value, color, prefix = '' }) => (
            <Card key={label} className="text-center">
              <Icon className={`h-5 w-5 mx-auto mb-2 ${color}`} />
              <div className={`text-2xl font-black ${color}`}>
                {prefix}<CountUp target={value} />
              </div>
              <div className="text-xs text-slate-500 mt-1">{label}</div>
            </Card>
          ))}
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Matchs ouverts */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-blue-400">Matchs à pronostiquer</h2>
              <Link href="/pronostics" className="text-xs text-slate-500 hover:text-blue-400 flex items-center gap-1 transition-colors">
                Voir tout <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          {matchsAFaire.length === 0 ? (
            <Card className="text-center py-8">
              <CheckSquare className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Tu as pronostiqué tous les matchs disponibles.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {matchsAFaire.slice(0, 3).map((match, i) => (
                <MatchCard key={match.id} match={match} index={i} />
              ))}
              {matchsAFaire.length > 3 && (
                <Link href="/pronostics" className="block text-center text-sm text-blue-400/60 hover:text-blue-400 py-2 transition-colors">
                  + {matchsAFaire.length - 3} matchs supplémentaires
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Mini classement */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-blue-400">Top 5</h2>
            <Link href="/classement" className="text-xs text-slate-500 hover:text-blue-400 flex items-center gap-1 transition-colors">
              Classement <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <Card className="p-0 overflow-hidden">
            {topClassement.map((entry, i) => {
              const isMe = entry.id === userId
              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 ${isMe ? 'bg-blue-500/5' : ''}`}
                >
                  <span className={`text-sm font-bold w-6 ${getRankColor(topRanks[i])}`}>
                    #{topRanks[i]}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-blue-500/15 flex items-center justify-center text-xs font-bold text-blue-400">
                    {getInitials(entry.pseudo)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${isMe ? 'text-blue-400' : 'text-white'}`}>
                      {entry.pseudo} {isMe && <span className="text-[10px] text-blue-400/60">(moi)</span>}
                    </div>
                  </div>
                  <span className="font-bold text-sm text-blue-400">{entry.total_points}</span>
                </div>
              )
            })}
          </Card>
        </div>
        </div>
      </StaggerItem>
    </StaggerContainer>
  )
}
