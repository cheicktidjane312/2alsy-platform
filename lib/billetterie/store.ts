import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isTestMode, PREUVES_BUCKET } from './config'
import type { EventRecord, RegistrationRecord, RegistrationStatus } from './core'

export type NewRegistration = Omit<
  RegistrationRecord,
  | 'id' | 'numero' | 'created_at' | 'statut' | 'motif_refus' | 'valide_at' | 'valide_par'
  | 'ticket_token' | 'email_envoye_at' | 'email_erreur' | 'entre_at' | 'entre_par'
>

export type CheckInResult =
  | { status: 'ok'; registration: RegistrationRecord }
  | { status: 'deja_entre'; registration: RegistrationRecord }
  | { status: 'non_valide'; registration: RegistrationRecord }
  | { status: 'inconnu' }

export interface BilletterieStore {
  listEvents(): Promise<EventRecord[]>
  getEventBySlug(slug: string): Promise<EventRecord | null>
  setScanPin(eventId: string, pinHash: string | null): Promise<void>
  setInscriptionsOuvertes(eventId: string, ouvert: boolean): Promise<void>

  createRegistration(r: NewRegistration): Promise<RegistrationRecord>
  listRegistrations(eventId: string): Promise<RegistrationRecord[]>
  getRegistration(id: string): Promise<RegistrationRecord | null>
  getRegistrationByToken(token: string): Promise<RegistrationRecord | null>
  countPendingDuplicates(eventId: string, email: string): Promise<number>
  countPlacesReservees(eventId: string): Promise<number>
  /** E-mails des administrateurs actifs (prevenus a chaque nouvelle inscription). */
  listAdminEmails(): Promise<string[]>

  /** Passe en "valide" seulement si l'inscription est encore "en_attente" (pas de double validation). */
  validate(id: string, adminId: string | null, token: string): Promise<RegistrationRecord | null>
  reject(id: string, motif: string): Promise<RegistrationRecord | null>
  markEmail(id: string, ok: boolean, erreur?: string): Promise<void>

  /** Entree atomique : un billet ne peut servir qu'une seule fois. */
  checkIn(eventId: string, token: string, agent: string): Promise<CheckInResult>
  checkInById(eventId: string, id: string, agent: string): Promise<CheckInResult>
  undoCheckIn(eventId: string, id: string): Promise<void>

  uploadPreuve(path: string, bytes: Uint8Array, contentType: string): Promise<void>
  preuveUrl(path: string): Promise<{ url: string } | { bytes: Uint8Array; contentType: string } | null>
}

// ---------------------------------------------------------------------
// Supabase (production)
// ---------------------------------------------------------------------

function serviceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Configuration Supabase incomplete (URL ou cle service manquante)')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function fail(error: { message: string } | null, context: string): void {
  if (error) throw new Error(`${context} : ${error.message}`)
}

class SupabaseStore implements BilletterieStore {
  private db = serviceClient()

  async listEvents() {
    const { data, error } = await this.db.from('events').select('*').order('starts_at', { ascending: false })
    fail(error, 'Lecture des evenements')
    return (data ?? []) as EventRecord[]
  }

  async getEventBySlug(slug: string) {
    const { data, error } = await this.db.from('events').select('*').eq('slug', slug).maybeSingle()
    fail(error, 'Lecture de l\'evenement')
    return (data as EventRecord | null) ?? null
  }

  async setScanPin(eventId: string, pinHash: string | null) {
    const { error } = await this.db.from('events').update({ scan_pin_hash: pinHash }).eq('id', eventId)
    fail(error, 'Mise a jour du code agent')
  }

  async setInscriptionsOuvertes(eventId: string, ouvert: boolean) {
    const { error } = await this.db.from('events').update({ inscriptions_ouvertes: ouvert }).eq('id', eventId)
    fail(error, 'Mise a jour des inscriptions')
  }

  async createRegistration(r: NewRegistration) {
    const { data, error } = await this.db.from('event_registrations').insert(r).select('*').single()
    fail(error, 'Enregistrement de l\'inscription')
    return data as RegistrationRecord
  }

  async listRegistrations(eventId: string) {
    const { data, error } = await this.db
      .from('event_registrations')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(5000)
    fail(error, 'Lecture des inscriptions')
    return (data ?? []) as RegistrationRecord[]
  }

  async getRegistration(id: string) {
    const { data, error } = await this.db.from('event_registrations').select('*').eq('id', id).maybeSingle()
    fail(error, 'Lecture de l\'inscription')
    return (data as RegistrationRecord | null) ?? null
  }

  async getRegistrationByToken(token: string) {
    const { data, error } = await this.db.from('event_registrations').select('*').eq('ticket_token', token).maybeSingle()
    fail(error, 'Lecture du billet')
    return (data as RegistrationRecord | null) ?? null
  }

  async countPendingDuplicates(eventId: string, email: string) {
    const { count, error } = await this.db
      .from('event_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('email', email)
      .eq('statut', 'en_attente')
    fail(error, 'Controle des doublons')
    return count ?? 0
  }

  async listAdminEmails() {
    const { data, error } = await this.db
      .from('profiles')
      .select('id')
      .in('role', ['admin', 'super_admin'])
      .eq('is_active', true)
    fail(error, 'Lecture des administrateurs')
    const emails = await Promise.all(
      (data ?? []).map(async p => {
        const { data: u } = await this.db.auth.admin.getUserById(p.id as string)
        return u?.user?.email ?? null
      }),
    )
    return emails.filter((e): e is string => !!e)
  }

  async countPlacesReservees(eventId: string) {
    const { data, error } = await this.db
      .from('event_registrations')
      .select('nb_personnes')
      .eq('event_id', eventId)
      .neq('statut', 'refuse')
    fail(error, 'Comptage des places')
    return (data ?? []).reduce((s, r) => s + (r as { nb_personnes: number }).nb_personnes, 0)
  }

  async validate(id: string, adminId: string | null, token: string) {
    const { data, error } = await this.db
      .from('event_registrations')
      .update({ statut: 'valide' satisfies RegistrationStatus, valide_at: new Date().toISOString(), valide_par: adminId, ticket_token: token, motif_refus: null })
      .eq('id', id)
      .eq('statut', 'en_attente')
      .select('*')
    fail(error, 'Validation')
    return ((data ?? [])[0] as RegistrationRecord | undefined) ?? null
  }

  async reject(id: string, motif: string) {
    const { data, error } = await this.db
      .from('event_registrations')
      .update({ statut: 'refuse' satisfies RegistrationStatus, motif_refus: motif })
      .eq('id', id)
      .eq('statut', 'en_attente')
      .select('*')
    fail(error, 'Refus')
    return ((data ?? [])[0] as RegistrationRecord | undefined) ?? null
  }

  async markEmail(id: string, ok: boolean, erreur?: string) {
    const patch = ok
      ? { email_envoye_at: new Date().toISOString(), email_erreur: null }
      : { email_erreur: (erreur ?? 'Erreur inconnue').slice(0, 500) }
    const { error } = await this.db.from('event_registrations').update(patch).eq('id', id)
    fail(error, 'Suivi de l\'envoi')
  }

  private async finishCheckIn(
    eventId: string,
    column: 'ticket_token' | 'id',
    value: string,
    agent: string,
  ): Promise<CheckInResult> {
    const { data, error } = await this.db
      .from('event_registrations')
      .update({ entre_at: new Date().toISOString(), entre_par: agent.slice(0, 60) })
      .eq(column, value)
      .eq('event_id', eventId)
      .eq('statut', 'valide')
      .is('entre_at', null)
      .select('*')
    fail(error, 'Enregistrement de l\'entree')
    const updated = (data ?? [])[0] as RegistrationRecord | undefined
    if (updated) return { status: 'ok', registration: updated }

    const { data: existing, error: e2 } = await this.db
      .from('event_registrations')
      .select('*')
      .eq(column, value)
      .eq('event_id', eventId)
      .maybeSingle()
    fail(e2, 'Lecture du billet')
    const reg = existing as RegistrationRecord | null
    if (!reg) return { status: 'inconnu' }
    if (reg.statut !== 'valide') return { status: 'non_valide', registration: reg }
    return { status: 'deja_entre', registration: reg }
  }

  checkIn(eventId: string, token: string, agent: string) {
    return this.finishCheckIn(eventId, 'ticket_token', token, agent)
  }

  checkInById(eventId: string, id: string, agent: string) {
    return this.finishCheckIn(eventId, 'id', id, agent)
  }

  async undoCheckIn(eventId: string, id: string) {
    const { error } = await this.db
      .from('event_registrations')
      .update({ entre_at: null, entre_par: null })
      .eq('id', id)
      .eq('event_id', eventId)
    fail(error, 'Annulation de l\'entree')
  }

  async uploadPreuve(path: string, bytes: Uint8Array, contentType: string) {
    const { error } = await this.db.storage.from(PREUVES_BUCKET).upload(path, bytes, { contentType, upsert: false })
    fail(error, 'Envoi de la capture')
  }

  async preuveUrl(path: string) {
    const { data, error } = await this.db.storage.from(PREUVES_BUCKET).createSignedUrl(path, 300)
    if (error || !data) return null
    return { url: data.signedUrl }
  }
}

// ---------------------------------------------------------------------
// Memoire (mode test uniquement)
// ---------------------------------------------------------------------

interface MemoryState {
  events: EventRecord[]
  registrations: RegistrationRecord[]
  files: Map<string, { bytes: Uint8Array; contentType: string }>
  seq: number
}

const globalForMemory = globalThis as unknown as { __billetterieMemory?: MemoryState }

export function memoryState(): MemoryState {
  if (!globalForMemory.__billetterieMemory) {
    globalForMemory.__billetterieMemory = {
      seq: 0,
      files: new Map(),
      registrations: [],
      events: [
        {
          id: '00000000-0000-4000-8000-000000000001',
          created_at: new Date().toISOString(),
          slug: 'octobre-rose-2026',
          code: 'OR26',
          titre: 'Pique-nique Octobre Rose',
          sous_titre: 'Sensibilisation, partage, solidarité',
          date_label: 'Samedi 31 octobre 2026',
          horaire: '9 h - 14 h',
          lieu: 'Jardin botanique de Bingerville',
          starts_at: '2026-10-31T09:00:00Z',
          description: 'Sensibilisation avec un professionnel de santé, quiz et jeux, pique-nique partagé, atelier entrepreneuriat.',
          dress_code: 'Un vêtement rose',
          categories: [
            { code: 'adulte', label: 'Adulte', prix: 8000 },
            { code: 'etudiant', label: 'Étudiant ou enfant', prix: 5000 },
          ],
          paiement_numero: '+225 07 00 00 00 00',
          paiement_moyens: 'Wave et Orange Money',
          paiement_beneficiaire: '2ALSY',
          date_limite: '2099-10-25T23:59:59Z',
          contact: '+225 05 00 00 00 00 / +225 07 00 00 00 00',
          places_max: null,
          inscriptions_ouvertes: true,
          scan_pin_hash: null,
        },
      ],
    }
  }
  return globalForMemory.__billetterieMemory
}

class MemoryStore implements BilletterieStore {
  private s = memoryState()

  async listEvents() { return [...this.s.events] }
  async getEventBySlug(slug: string) { return this.s.events.find(e => e.slug === slug) ?? null }
  async setScanPin(eventId: string, pinHash: string | null) {
    const e = this.s.events.find(x => x.id === eventId); if (e) e.scan_pin_hash = pinHash
  }
  async setInscriptionsOuvertes(eventId: string, ouvert: boolean) {
    const e = this.s.events.find(x => x.id === eventId); if (e) e.inscriptions_ouvertes = ouvert
  }

  async createRegistration(r: NewRegistration) {
    const reg: RegistrationRecord = {
      ...r,
      id: crypto.randomUUID(),
      numero: ++this.s.seq,
      created_at: new Date().toISOString(),
      statut: 'en_attente',
      motif_refus: null, valide_at: null, valide_par: null, ticket_token: null,
      email_envoye_at: null, email_erreur: null, entre_at: null, entre_par: null,
    }
    this.s.registrations.push(reg)
    return { ...reg }
  }

  async listRegistrations(eventId: string) {
    return this.s.registrations.filter(r => r.event_id === eventId).sort((a, b) => b.created_at.localeCompare(a.created_at)).map(r => ({ ...r }))
  }
  async getRegistration(id: string) { const r = this.s.registrations.find(x => x.id === id); return r ? { ...r } : null }
  async getRegistrationByToken(token: string) { const r = this.s.registrations.find(x => x.ticket_token === token); return r ? { ...r } : null }
  async countPendingDuplicates(eventId: string, email: string) {
    return this.s.registrations.filter(r => r.event_id === eventId && r.email === email && r.statut === 'en_attente').length
  }
  async listAdminEmails() {
    return ['admin@test.local']
  }

  async countPlacesReservees(eventId: string) {
    return this.s.registrations.filter(r => r.event_id === eventId && r.statut !== 'refuse').reduce((s, r) => s + r.nb_personnes, 0)
  }

  async validate(id: string, adminId: string | null, token: string) {
    const r = this.s.registrations.find(x => x.id === id)
    if (!r || r.statut !== 'en_attente') return null
    Object.assign(r, { statut: 'valide', valide_at: new Date().toISOString(), valide_par: adminId, ticket_token: token, motif_refus: null })
    return { ...r }
  }
  async reject(id: string, motif: string) {
    const r = this.s.registrations.find(x => x.id === id)
    if (!r || r.statut !== 'en_attente') return null
    Object.assign(r, { statut: 'refuse', motif_refus: motif })
    return { ...r }
  }
  async markEmail(id: string, ok: boolean, erreur?: string) {
    const r = this.s.registrations.find(x => x.id === id)
    if (!r) return
    if (ok) Object.assign(r, { email_envoye_at: new Date().toISOString(), email_erreur: null })
    else r.email_erreur = erreur ?? 'Erreur inconnue'
  }

  private doCheckIn(r: RegistrationRecord | undefined, agent: string): CheckInResult {
    if (!r) return { status: 'inconnu' }
    if (r.statut !== 'valide') return { status: 'non_valide', registration: { ...r } }
    if (r.entre_at) return { status: 'deja_entre', registration: { ...r } }
    Object.assign(r, { entre_at: new Date().toISOString(), entre_par: agent })
    return { status: 'ok', registration: { ...r } }
  }
  async checkIn(eventId: string, token: string, agent: string) {
    return this.doCheckIn(this.s.registrations.find(x => x.event_id === eventId && x.ticket_token === token), agent)
  }
  async checkInById(eventId: string, id: string, agent: string) {
    return this.doCheckIn(this.s.registrations.find(x => x.event_id === eventId && x.id === id), agent)
  }
  async undoCheckIn(eventId: string, id: string) {
    const r = this.s.registrations.find(x => x.event_id === eventId && x.id === id)
    if (r) Object.assign(r, { entre_at: null, entre_par: null })
  }

  async uploadPreuve(path: string, bytes: Uint8Array, contentType: string) {
    this.s.files.set(path, { bytes, contentType })
  }
  async preuveUrl(path: string) {
    const f = this.s.files.get(path)
    return f ? { bytes: f.bytes, contentType: f.contentType } : null
  }
}

export function getStore(): BilletterieStore {
  return isTestMode() ? new MemoryStore() : new SupabaseStore()
}
