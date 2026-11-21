import { z } from 'zod'

// ---------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------

export interface EventCategory {
  code: string
  label: string
  prix: number
}

export interface EventRecord {
  id: string
  created_at: string
  slug: string
  code: string
  titre: string
  sous_titre: string | null
  date_label: string
  horaire: string | null
  lieu: string
  starts_at: string | null
  description: string | null
  dress_code: string | null
  categories: EventCategory[]
  paiement_numero: string
  paiement_moyens: string
  paiement_beneficiaire: string | null
  date_limite: string | null
  contact: string | null
  places_max: number | null
  inscriptions_ouvertes: boolean
  scan_pin_hash: string | null
}

/** Ce que la page publique a le droit de voir (jamais le hash du code agent). */
export type PublicEvent = Omit<EventRecord, 'scan_pin_hash'>

export type RegistrationStatus = 'en_attente' | 'valide' | 'refuse'
export type PaymentMethod = 'wave' | 'orange_money' | 'autre'

export interface RegistrationRecord {
  id: string
  numero: number
  created_at: string
  event_id: string
  nom_complet: string
  email: string
  telephone: string
  code_promo: string | null
  quantites: Record<string, number>
  nb_personnes: number
  montant: number
  moyen_paiement: PaymentMethod
  reference_paiement: string | null
  preuve_path: string | null
  statut: RegistrationStatus
  motif_refus: string | null
  valide_at: string | null
  valide_par: string | null
  ticket_token: string | null
  email_envoye_at: string | null
  email_erreur: string | null
  entre_at: string | null
  entre_par: string | null
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  wave: 'Wave',
  orange_money: 'Orange Money',
  autre: 'Autre',
}

export const MAX_PERSONNES_PAR_INSCRIPTION = 20
export const MAX_PREUVE_BYTES = 5 * 1024 * 1024
export const PREUVE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const

// ---------------------------------------------------------------------
// Montant
// ---------------------------------------------------------------------

export function computeTotal(categories: EventCategory[], quantites: Record<string, number>) {
  let montant = 0
  let nb = 0
  for (const cat of categories) {
    const q = quantites[cat.code] ?? 0
    if (!Number.isInteger(q) || q < 0) throw new Error('Quantité invalide')
    montant += q * cat.prix
    nb += q
  }
  for (const code of Object.keys(quantites)) {
    if (!categories.some(c => c.code === code) && (quantites[code] ?? 0) > 0) {
      throw new Error('Catégorie inconnue')
    }
  }
  return { montant, nb }
}

/** 8000 -> "8 000 FCFA". Espaces normaux uniquement (compatibles PDF). */
export function formatFCFA(n: number): string {
  const s = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${s} FCFA`
}

// ---------------------------------------------------------------------
// Numero de billet et jeton du code QR
// ---------------------------------------------------------------------

export function ticketNumber(code: string, numero: number): string {
  return `${code}-${numero.toString().padStart(4, '0')}`
}

/** Jeton aleatoire de 192 bits, impossible a deviner. */
export function generateToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Buffer.from(bytes).toString('base64url')
}

const TOKEN_RE = /^[A-Za-z0-9_-]{32}$/

export function isValidToken(t: string): boolean {
  return TOKEN_RE.test(t)
}

/**
 * Le code QR contient l'URL du billet (https://.../billet/<jeton>), pour qu'un
 * telephone ordinaire ouvre le billet, et que le scanner de l'agent extraie le jeton.
 */
export function extractToken(scanned: string): string | null {
  const raw = scanned.trim()
  if (isValidToken(raw)) return raw
  const m = raw.match(/\/billet\/([A-Za-z0-9_-]{32})(?:[/?#]|$)/)
  return m ? m[1] : null
}

export function ticketUrl(appUrl: string, token: string): string {
  return `${appUrl.replace(/\/$/, '')}/billet/${token}`
}

// ---------------------------------------------------------------------
// Code d'acces des agents (scan)
// ---------------------------------------------------------------------

export async function hashPin(pin: string, secret: string): Promise<string> {
  const data = new TextEncoder().encode(`${secret}:${pin}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Buffer.from(digest).toString('hex')
}

export const pinSchema = z.string().regex(/^\d{6}$/, 'Le code doit contenir exactement 6 chiffres')

// ---------------------------------------------------------------------
// Validation du formulaire d'inscription
// ---------------------------------------------------------------------

export function normalizePhone(v: string): string {
  return v.replace(/[^\d+]/g, '')
}

/** Code promo membre 2ALSY : AS01 a AS49 (meme regle que la table profiles). */
export const CODE_PROMO_RE = /^AS(0[1-9]|[1-4][0-9])$/

/** "as 45", "As-45", "as5" -> "AS45" / "AS05". Vide -> undefined. */
export function normalizeCodePromo(v: string | undefined | null): string | undefined {
  if (!v) return undefined
  const s = v.toUpperCase().replace(/[\s\-_.]/g, '')
  if (!s) return undefined
  const m = /^AS(\d{1,2})$/.exec(s)
  if (m) return `AS${m[1].padStart(2, '0')}`
  return s
}

export const registrationSchema = z.object({
  nom_complet: z.string().trim().min(2, 'Indiquez votre nom complet').max(120, 'Nom trop long'),
  email: z.string().trim().toLowerCase().pipe(z.email('Adresse e-mail invalide')).pipe(z.string().max(160)),
  telephone: z
    .string()
    .transform(normalizePhone)
    .pipe(z.string().min(8, 'Numéro de téléphone invalide').max(20, 'Numéro de téléphone invalide')),
  code_promo: z
    .string()
    .optional()
    .transform(normalizeCodePromo)
    .pipe(z.string().regex(CODE_PROMO_RE, 'Code promo invalide (format AS01 à AS49, ex. AS45)').optional()),
  quantites: z.record(z.string(), z.number().int().min(0).max(MAX_PERSONNES_PAR_INSCRIPTION)),
  moyen_paiement: z.enum(['wave', 'orange_money', 'autre']),
  reference_paiement: z
    .string()
    .trim()
    .max(80, 'Référence trop longue')
    .optional()
    .transform(v => (v ? v : undefined)),
})

export type RegistrationInput = z.infer<typeof registrationSchema>

/**
 * Date limite effective : les inscriptions restent ouvertes jusqu'à la fin
 * du jour de l'événement (jour J inclus, heure UTC = heure d'Abidjan), même
 * si `date_limite` est plus tôt. Pour fermer avant, l'admin coupe
 * `inscriptions_ouvertes`.
 */
export function effectiveDeadline(event: Pick<EventRecord, 'date_limite' | 'starts_at'>): Date | null {
  const limite = event.date_limite ? new Date(event.date_limite) : null
  if (!event.starts_at) return limite
  const d = new Date(event.starts_at)
  const finJourJ = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59))
  return limite && limite.getTime() > finJourJ.getTime() ? limite : finJourJ
}

export function registrationDeadlinePassed(event: Pick<EventRecord, 'date_limite'> & Partial<Pick<EventRecord, 'starts_at'>>, now = new Date()): boolean {
  const limite = effectiveDeadline({ date_limite: event.date_limite, starts_at: event.starts_at ?? null })
  return !!limite && now.getTime() > limite.getTime()
}

export function toPublicEvent(e: EventRecord): PublicEvent {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { scan_pin_hash, ...rest } = e
  return rest
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

export function toCsv(rows: (string | number | null)[][]): string {
  const esc = (v: string | number | null) => {
    const s = v === null ? '' : String(v)
    // Neutralise les formules Excel (=, +, -, @) et echappe les guillemets
    const safe = /^[=+\-@]/.test(s) && !/^-?\d/.test(s) && !/^\+\d/.test(s) ? `'${s}` : s
    return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
  }
  // Point-virgule + BOM : ouverture correcte dans Excel en francais
  return '﻿' + rows.map(r => r.map(esc).join(';')).join('\r\n')
}

/** "2 adultes, 1 étudiant ou enfant" */
export function detailPlaces(categories: EventCategory[], quantites: Record<string, number>): string {
  return categories
    .filter(c => (quantites[c.code] ?? 0) > 0)
    .map(c => {
      const q = quantites[c.code]
      const label = c.label.toLowerCase()
      const pluriel = q > 1
        ? label.split(' ').map(w => (['ou', 'et', 'de', 'du', 'des', 'la', 'le'].includes(w) || /[sxz]$/.test(w) ? w : `${w}s`)).join(' ')
        : label
      return `${q} ${pluriel}`
    })
    .join(', ')
}
