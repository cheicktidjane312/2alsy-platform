export const POINTS = {
  ISSUE: 2,
  VAINQUEUR: 3,
  SCORE_EXACT: 6,
  PREMIER_BUT: 4,
  MAX_PAR_MATCH: 15,
} as const

export const MALUS = {
  AVANT_MATCH: 0,
  TRANCHE_0_10: 1,
  TRANCHE_10_20: 2,
  TRANCHE_20_30: 3,
  TRANCHE_30_45: 4,
} as const

export function getMalusLabel(malus: number): string {
  if (malus === 0) return 'Aucun malus'
  return `-${malus} pt${malus > 1 ? 's' : ''}`
}

export function getPointsColor(points: number): string {
  if (points >= 10) return 'text-yellow-400'
  if (points >= 6) return 'text-green-400'
  if (points >= 2) return 'text-blue-400'
  return 'text-gray-400'
}
