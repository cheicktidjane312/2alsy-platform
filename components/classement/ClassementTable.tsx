'use client'

import { motion } from 'framer-motion'
import { getRankColor, getInitials } from '@/lib/utils'
import type { ClassementEntry } from '@/types/database'

interface ClassementTableProps {
  entries: ClassementEntry[]
  currentUserId?: string
  showMatchs?: boolean
}

export default function ClassementTable({ entries, currentUserId, showMatchs = false }: ClassementTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-blue-500/12">
            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-12">#</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Joueur</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Promo</th>
            {showMatchs && <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Matchs</th>}
            <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Points</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => {
            const isMe = entry.user_id === currentUserId
            return (
              <motion.tr
                key={entry.user_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`table-row-hover border-b border-white/5 transition-colors ${isMe ? 'bg-blue-500/5 border-l-2 border-l-blue-500' : ''}`}
              >
                <td className="py-3 px-4">
                  <span className={`font-bold text-sm ${getRankColor(entry.rang)}`}>
                    {entry.rang}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        entry.rang === 1 ? 'bg-yellow-400/20 text-yellow-400' :
                        entry.rang === 2 ? 'bg-gray-300/20 text-gray-300' :
                        entry.rang === 3 ? 'bg-amber-500/20 text-amber-500' :
                        'bg-blue-500/10 text-blue-400'
                      }`}
                    >
                      {getInitials(entry.pseudo)}
                    </div>
                    <div>
                      <div className={`text-sm font-medium ${isMe ? 'text-blue-400' : 'text-white'}`}>
                        {entry.pseudo}
                        {isMe && <span className="ml-1 text-xs text-blue-400/60">(moi)</span>}
                      </div>
                      <div className="text-xs text-slate-500 sm:hidden">{entry.code_promo}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 hidden sm:table-cell">
                  <span className="text-xs text-blue-400/60 font-medium">{entry.code_promo}</span>
                </td>
                {showMatchs && (
                  <td className="py-3 px-4 text-right hidden md:table-cell">
                    <span className="text-sm text-slate-400">{entry.matchs_joues ?? '-'}</span>
                  </td>
                )}
                <td className="py-3 px-4 text-right">
                  <span className={`font-bold text-base ${getRankColor(entry.rang)}`}>
                    {entry.total_points}
                  </span>
                </td>
              </motion.tr>
            )
          })}
        </tbody>
      </table>
      {entries.length === 0 && (
        <div className="py-12 text-center text-slate-500 text-sm">
          Aucun résultat pour cette phase
        </div>
      )}
    </div>
  )
}
