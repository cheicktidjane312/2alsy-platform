import 'server-only'
import { appUrl } from './config'
import {
  MAX_PERSONNES_PAR_INSCRIPTION,
  MAX_PREUVE_BYTES,
  PREUVE_TYPES,
  computeTotal,
  generateToken,
  registrationDeadlinePassed,
  registrationSchema,
  ticketUrl,
  type EventRecord,
  type RegistrationRecord,
} from './core'
import { sendAdminNotification, sendRejectionEmail, sendTicketEmail } from './email'
import { getStore } from './store'
import { buildTicketPdf } from './ticket-pdf'

export class UserError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

function sniffType(bytes: Uint8Array): (typeof PREUVE_TYPES)[number] | null {
  const b = bytes
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp'
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'application/pdf'
  return null
}

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' }

export async function submitRegistration(slug: string, form: FormData): Promise<RegistrationRecord> {
  const store = getStore()
  const event = await store.getEventBySlug(slug)
  if (!event) throw new UserError('Événement introuvable', 404)
  if (!event.inscriptions_ouvertes) throw new UserError('Les inscriptions sont fermées pour cet événement.')
  if (registrationDeadlinePassed(event)) throw new UserError('La date limite d\'inscription est dépassée.')

  // Champ piege invisible : rempli uniquement par les robots
  if (String(form.get('site_web') ?? '').length > 0) throw new UserError('Inscription refusée.')

  let quantites: Record<string, number>
  try {
    quantites = JSON.parse(String(form.get('quantites') ?? '{}'))
  } catch {
    throw new UserError('Quantités invalides.')
  }

  const parsed = registrationSchema.safeParse({
    nom_complet: form.get('nom_complet') ?? '',
    email: form.get('email') ?? '',
    telephone: form.get('telephone') ?? '',
    code_promo: String(form.get('code_promo') ?? ''),
    quantites,
    moyen_paiement: form.get('moyen_paiement') ?? '',
    reference_paiement: form.get('reference_paiement') || undefined,
  })
  if (!parsed.success) throw new UserError(parsed.error.issues[0]?.message ?? 'Formulaire invalide.')
  const input = parsed.data

  let total: { montant: number; nb: number }
  try {
    total = computeTotal(event.categories, input.quantites)
  } catch (e) {
    throw new UserError((e as Error).message)
  }
  if (total.nb < 1) throw new UserError('Choisissez au moins une place.')
  if (total.nb > MAX_PERSONNES_PAR_INSCRIPTION) throw new UserError(`${MAX_PERSONNES_PAR_INSCRIPTION} places maximum par inscription.`)

  if (event.places_max) {
    const reservees = await store.countPlacesReservees(event.id)
    if (reservees + total.nb > event.places_max) throw new UserError('Il ne reste plus assez de places pour cet événement.')
  }

  if ((await store.countPendingDuplicates(event.id, input.email)) >= 3) {
    throw new UserError('Vous avez déjà plusieurs inscriptions en attente de vérification avec cette adresse e-mail.')
  }

  // Capture du paiement (facultative si une reference est saisie)
  const file = form.get('preuve')
  let preuvePath: string | null = null
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_PREUVE_BYTES) throw new UserError('La capture dépasse 5 Mo.')
    const bytes = new Uint8Array(await file.arrayBuffer())
    const type = sniffType(bytes)
    if (!type) throw new UserError('Format de capture non accepté (photo JPG, PNG ou PDF).')
    preuvePath = `${event.slug}/${crypto.randomUUID()}.${EXT[type]}`
    await store.uploadPreuve(preuvePath, bytes, type)
  }

  if (!input.reference_paiement && !preuvePath) {
    throw new UserError('Ajoutez la référence de votre paiement ou une capture d\'écran.')
  }

  return store.createRegistration({
    event_id: event.id,
    nom_complet: input.nom_complet,
    email: input.email,
    telephone: input.telephone,
    code_promo: input.code_promo ?? null,
    quantites: Object.fromEntries(Object.entries(input.quantites).filter(([, q]) => q > 0)),
    nb_personnes: total.nb,
    montant: total.montant,
    moyen_paiement: input.moyen_paiement,
    reference_paiement: input.reference_paiement ?? null,
    preuve_path: preuvePath,
  })
}

/**
 * Previent les administrateurs d'une nouvelle inscription.
 * Destinataires : BILLETTERIE_ADMIN_EMAILS (liste separee par des virgules) si definie,
 * sinon tous les comptes admin actifs de l'application. Ne bloque jamais l'inscription.
 */
export async function notifyAdmins(slug: string, reg: RegistrationRecord): Promise<void> {
  try {
    const store = getStore()
    const event = await store.getEventBySlug(slug)
    if (!event) return
    const override = (process.env.BILLETTERIE_ADMIN_EMAILS ?? '').split(',').map(s => s.trim()).filter(Boolean)
    const to = [...new Set((override.length ? override : await store.listAdminEmails()).map(e => e.toLowerCase()))].slice(0, 45)
    await sendAdminNotification(event, reg, to, `${appUrl()}/admin/billetterie/${event.slug}`)
  } catch (e) {
    console.error('[billetterie] notification admin echouee', (e as Error).message)
  }
}

async function loadPair(id: string): Promise<{ event: EventRecord; reg: RegistrationRecord }> {
  const store = getStore()
  const reg = await store.getRegistration(id)
  if (!reg) throw new UserError('Inscription introuvable', 404)
  const event = (await store.listEvents()).find(e => e.id === reg.event_id)
  if (!event) throw new UserError('Événement introuvable', 404)
  return { event, reg }
}

/** Genere le PDF et l'envoie. L'echec d'envoi est enregistre sans annuler la validation. */
async function deliver(event: EventRecord, reg: RegistrationRecord): Promise<{ emailOk: boolean; erreur?: string }> {
  const store = getStore()
  try {
    const url = ticketUrl(appUrl(), reg.ticket_token!)
    const pdf = await buildTicketPdf(event, reg, url)
    await sendTicketEmail(event, reg, pdf, url)
    await store.markEmail(reg.id, true)
    return { emailOk: true }
  } catch (e) {
    const msg = (e as Error).message
    await store.markEmail(reg.id, false, msg)
    return { emailOk: false, erreur: msg }
  }
}

export async function validateRegistration(id: string, adminId: string | null) {
  const store = getStore()
  const { event } = await loadPair(id)
  const updated = await store.validate(id, adminId, generateToken())
  if (!updated) throw new UserError('Cette inscription a déjà été traitée.', 409)
  const result = await deliver(event, updated)
  return { registration: (await store.getRegistration(id))!, ...result }
}

export async function resendTicket(id: string) {
  const { event, reg } = await loadPair(id)
  if (reg.statut !== 'valide' || !reg.ticket_token) throw new UserError('Le billet n\'existe pas encore : validez d\'abord le paiement.')
  const result = await deliver(event, reg)
  return { registration: (await getStore().getRegistration(id))!, ...result }
}

export async function rejectRegistration(id: string, motif: string) {
  const clean = motif.trim().slice(0, 300)
  if (clean.length < 3) throw new UserError('Indiquez le motif du refus.')
  const store = getStore()
  const { event } = await loadPair(id)
  const updated = await store.reject(id, clean)
  if (!updated) throw new UserError('Cette inscription a déjà été traitée.', 409)
  let emailOk = true
  try {
    await sendRejectionEmail(event, updated, clean)
  } catch {
    emailOk = false
  }
  return { registration: updated, emailOk }
}
