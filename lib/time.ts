import { format, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

export const TIMEZONE = 'Africa/Abidjan'

export function formatMatchTime(isoString: string): string {
  const date = new Date(isoString)
  return format(date, "dd MMM yyyy 'à' HH'h'mm", { locale: fr })
}

export function formatMatchDate(isoString: string): string {
  const date = new Date(isoString)
  return format(date, "EEEE dd MMMM yyyy", { locale: fr })
}

export function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return format(date, "HH'h'mm")
}

export function formatDistanceFromNow(isoString: string): string {
  return formatDistanceToNow(new Date(isoString), { locale: fr, addSuffix: true })
}

export function getMinutesAfterKickoff(kickoffISO: string): number {
  const now = new Date()
  const kickoff = new Date(kickoffISO)
  return Math.floor((now.getTime() - kickoff.getTime()) / 60000)
}

export function isMatchOpen(kickoffISO: string): boolean {
  return getMinutesAfterKickoff(kickoffISO) < 0
}

export function isMatchInLateWindow(kickoffISO: string): boolean {
  const minsAfter = getMinutesAfterKickoff(kickoffISO)
  return minsAfter >= 0 && minsAfter <= 45
}

export function isMatchClosed(kickoffISO: string): boolean {
  return getMinutesAfterKickoff(kickoffISO) > 45
}

export type TimeStatus = {
  status: 'open' | 'late' | 'closed'
  malus: number
  label: string
  color: string
}

export function getTimeStatus(kickoffISO: string): TimeStatus {
  const mins = getMinutesAfterKickoff(kickoffISO)
  if (mins < 0) return { status: 'open', malus: 0, label: 'Ouvert', color: 'green' }
  if (mins <= 10) return { status: 'late', malus: 1, label: `-1 pt (${mins} min)`, color: 'orange' }
  if (mins <= 20) return { status: 'late', malus: 2, label: `-2 pts (${mins} min)`, color: 'orange' }
  if (mins <= 30) return { status: 'late', malus: 3, label: `-3 pts (${mins} min)`, color: 'orange' }
  if (mins <= 45) return { status: 'late', malus: 4, label: `-4 pts (${mins} min)`, color: 'red' }
  return { status: 'closed', malus: 0, label: 'Fermé', color: 'red' }
}

export function getCountdown(kickoffISO: string): string {
  const now = new Date()
  const kickoff = new Date(kickoffISO)
  const diff = kickoff.getTime() - now.getTime()
  if (diff <= 0) return '00:00:00'
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
