import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getFlagEmoji(isoCode: string | null): string {
  if (!isoCode) return '🏴'
  const codePoints = isoCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Rang de compétition (style "1224") : les ex æquo partagent le même rang,
 * et le rang suivant saute (ex: points [10,8,8,5] -> rangs [1,2,2,4]).
 * Cohérent avec le calcul du dashboard `count(points > moi) + 1`.
 * `pointsSortedDesc` doit déjà être trié par points décroissants.
 */
export function computeRanks(pointsSortedDesc: number[]): number[] {
  let prevPoints: number | null = null
  let prevRang = 0
  return pointsSortedDesc.map((pts, i) => {
    const rang = pts === prevPoints ? prevRang : i + 1
    prevPoints = pts
    prevRang = rang
    return rang
  })
}

export function getRankColor(rank: number): string {
  if (rank === 1) return 'text-yellow-400'
  if (rank === 2) return 'text-gray-300'
  if (rank === 3) return 'text-amber-500'
  return 'text-white'
}

export function getRankBg(rank: number): string {
  if (rank === 1) return 'bg-yellow-400/10 border-yellow-400/30'
  if (rank === 2) return 'bg-gray-300/10 border-gray-300/30'
  if (rank === 3) return 'bg-amber-500/10 border-amber-500/30'
  return 'bg-white/5 border-white/10'
}
