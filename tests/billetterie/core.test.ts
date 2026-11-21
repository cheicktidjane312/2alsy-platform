import { describe, expect, it } from 'vitest'
import {
  computeTotal, extractToken, formatFCFA, generateToken, hashPin, isValidToken,
  registrationSchema, ticketNumber, ticketUrl, toCsv, registrationDeadlinePassed,
} from '@/lib/billetterie/core'

const CATS = [
  { code: 'adulte', label: 'Adulte', prix: 8000 },
  { code: 'etudiant', label: 'Étudiant ou enfant', prix: 5000 },
]

describe('computeTotal', () => {
  it('additionne les places par catégorie', () => {
    expect(computeTotal(CATS, { adulte: 2, etudiant: 1 })).toEqual({ montant: 21000, nb: 3 })
  })
  it('refuse une catégorie inconnue ou une quantité négative', () => {
    expect(() => computeTotal(CATS, { vip: 1 })).toThrow()
    expect(() => computeTotal(CATS, { adulte: -1 })).toThrow()
    expect(() => computeTotal(CATS, { adulte: 1.5 })).toThrow()
  })
})

describe('formatage', () => {
  it('formate les montants avec des espaces simples', () => {
    expect(formatFCFA(8000)).toBe('8 000 FCFA')
    expect(formatFCFA(1250000)).toBe('1 250 000 FCFA')
    expect(formatFCFA(500)).toBe('500 FCFA')
  })
  it('numérote les billets', () => {
    expect(ticketNumber('OR26', 7)).toBe('OR26-0007')
    expect(ticketNumber('OR26', 12345)).toBe('OR26-12345')
  })
})

describe('jeton du code QR', () => {
  it('génère des jetons uniques de 32 caractères', () => {
    const a = generateToken()
    const b = generateToken()
    expect(isValidToken(a)).toBe(true)
    expect(a).not.toBe(b)
  })
  it('extrait le jeton d\'une URL de billet ou d\'un jeton brut', () => {
    const t = generateToken()
    expect(extractToken(ticketUrl('https://exemple.com/', t))).toBe(t)
    expect(extractToken(`  ${t} `)).toBe(t)
    expect(extractToken('https://exemple.com/billet/court')).toBeNull()
    expect(extractToken('n\'importe quoi')).toBeNull()
    expect(extractToken(`https://exemple.com/billet/${t}?x=1`)).toBe(t)
  })
})

describe('code des agents', () => {
  it('hache le code avec le secret', async () => {
    const h1 = await hashPin('123456', 'secret-a')
    expect(h1).toMatch(/^[0-9a-f]{64}$/)
    expect(await hashPin('123456', 'secret-a')).toBe(h1)
    expect(await hashPin('123456', 'secret-b')).not.toBe(h1)
  })
})

describe('formulaire', () => {
  it('normalise e-mail et téléphone', () => {
    const r = registrationSchema.parse({
      nom_complet: '  Aya Konan ', email: ' Aya@Gmail.COM ', telephone: '07 13-65.32 54',
      quantites: { adulte: 1 }, moyen_paiement: 'wave', reference_paiement: '',
    })
    expect(r).toMatchObject({ nom_complet: 'Aya Konan', email: 'aya@gmail.com', telephone: '0700000000', reference_paiement: undefined })
  })
  it('rejette un e-mail invalide', () => {
    const r = registrationSchema.safeParse({ nom_complet: 'Aya', email: 'pas-un-email', telephone: '0700000000', quantites: {}, moyen_paiement: 'wave' })
    expect(r.success).toBe(false)
  })
  it('normalise et contrôle le code promo membre', () => {
    const base = { nom_complet: 'Aya', email: 'a@b.ci', telephone: '0700000000', quantites: { adulte: 1 }, moyen_paiement: 'wave' }
    expect(registrationSchema.parse({ ...base, code_promo: ' as 45 ' }).code_promo).toBe('AS45')
    expect(registrationSchema.parse({ ...base, code_promo: 'as5' }).code_promo).toBe('AS05')
    expect(registrationSchema.parse({ ...base, code_promo: '' }).code_promo).toBeUndefined()
    expect(registrationSchema.parse(base).code_promo).toBeUndefined()
    expect(registrationSchema.safeParse({ ...base, code_promo: 'AS50' }).success).toBe(false)
    expect(registrationSchema.safeParse({ ...base, code_promo: 'AS00' }).success).toBe(false)
    expect(registrationSchema.safeParse({ ...base, code_promo: 'XY12' }).success).toBe(false)
  })
  it('détecte la date limite', () => {
    expect(registrationDeadlinePassed({ date_limite: '2026-10-25T23:59:59Z' }, new Date('2026-10-26T00:00:00Z'))).toBe(true)
    expect(registrationDeadlinePassed({ date_limite: '2026-10-25T23:59:59Z' }, new Date('2026-10-25T12:00:00Z'))).toBe(false)
    expect(registrationDeadlinePassed({ date_limite: null })).toBe(false)
  })

  it('garde les inscriptions ouvertes jusqu’à la fin du jour J', () => {
    const ev = { date_limite: '2026-10-25T23:59:59Z', starts_at: '2026-10-31T09:00:00Z' }
    expect(registrationDeadlinePassed(ev, new Date('2026-10-27T21:00:00Z'))).toBe(false)
    expect(registrationDeadlinePassed(ev, new Date('2026-10-31T13:00:00Z'))).toBe(false)
    expect(registrationDeadlinePassed(ev, new Date('2026-11-01T00:00:01Z'))).toBe(true)
    expect(registrationDeadlinePassed({ date_limite: null, starts_at: '2026-10-31T09:00:00Z' }, new Date('2026-11-01T00:00:01Z'))).toBe(true)
  })
})

describe('export Excel', () => {
  it('neutralise les formules et échappe les séparateurs', () => {
    const csv = toCsv([['Nom', 'Tel'], ['=HYPERLINK("x")', '+2250700000000'], ['Dupont; Jean', '-5']])
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`)
    expect(csv).toContain('+2250700000000')
    expect(csv).toContain('"Dupont; Jean"')
  })
})

describe('détail des places', () => {
  it('accorde au pluriel', async () => {
    const { detailPlaces } = await import('@/lib/billetterie/core')
    expect(detailPlaces(CATS, { adulte: 2, etudiant: 1 })).toBe('2 adultes, 1 étudiant ou enfant')
    expect(detailPlaces(CATS, { adulte: 1, etudiant: 3 })).toBe('1 adulte, 3 étudiants ou enfants')
  })
})
