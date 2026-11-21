'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock } from 'lucide-react'
import { getTimeStatus, getCountdown, type TimeStatus } from '@/lib/time'
import Badge from '@/components/ui/Badge'

interface MatchTimerProps {
  kickoffISO: string
  showCountdown?: boolean
}

export default function MatchTimer({ kickoffISO, showCountdown = false }: MatchTimerProps) {
  const [status, setStatus] = useState<TimeStatus>(() => getTimeStatus(kickoffISO))
  const [countdown, setCountdown] = useState(() => getCountdown(kickoffISO))

  const update = useCallback(() => {
    setStatus(getTimeStatus(kickoffISO))
    setCountdown(getCountdown(kickoffISO))
  }, [kickoffISO])

  useEffect(() => {
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [update])

  const badgeVariant = status.status === 'open' ? 'open' : status.status === 'late' ? 'late' : 'closed'

  return (
    <div className="flex flex-col items-end gap-1">
      <Badge variant={badgeVariant}>
        <Clock className="h-3 w-3 mr-1" />
        {status.label}
      </Badge>
      {showCountdown && status.status === 'open' && (
        <span className="text-xs text-slate-400">
          dans {countdown}
        </span>
      )}
      {status.status === 'late' && (
        <span className="text-xs text-orange-400/70">
          Malus : -{status.malus} pt{status.malus > 1 ? 's' : ''}
        </span>
      )}
    </div>
  )
}
