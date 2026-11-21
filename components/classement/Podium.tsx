'use client'

import { motion } from 'framer-motion'
import { Trophy, Medal, Award } from 'lucide-react'
import { getInitials } from '@/lib/utils'
import type { ClassementEntry } from '@/types/database'

interface PodiumProps {
  top3: ClassementEntry[]
}

export default function Podium({ top3 }: PodiumProps) {
  const [first, second, third] = top3
  if (!first) return null

  const podiumOrder = [second, first, third].filter(Boolean)
  const heights = second ? ['h-20', 'h-28', 'h-16'] : ['h-28']
  const icons = [
    <Medal key="2" className="h-6 w-6 text-gray-300" />,
    <Trophy key="1" className="h-7 w-7 text-yellow-400" />,
    <Award key="3" className="h-6 w-6 text-amber-500" />,
  ]
  const colors = [
    'border-gray-400/40 bg-gray-400/10',
    'border-yellow-400/50 bg-yellow-400/10',
    'border-amber-600/40 bg-amber-600/10',
  ]

  return (
    <div className="flex items-end justify-center gap-4 py-6">
      {podiumOrder.map((entry, i) => (
        <motion.div
          key={entry.user_id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1, duration: 0.4 }}
          className="flex flex-col items-center gap-2"
        >
          <div className="flex flex-col items-center gap-1">
            {icons[i]}
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold border ${colors[i]}`}>
              {getInitials(entry.pseudo)}
            </div>
            <span className="text-xs font-semibold text-white max-w-[80px] text-center truncate">{entry.pseudo}</span>
            <span className="text-sm font-bold text-blue-400">{entry.total_points} pts</span>
          </div>
          <div className={`${heights[i]} w-24 rounded-t-lg border ${colors[i]} flex items-center justify-center`}>
            <span className="text-lg font-black text-white/20">{entry.rang}</span>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
