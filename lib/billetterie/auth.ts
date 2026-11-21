import 'server-only'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { billetterieSecret, isTestMode } from './config'
import type { EventRecord } from './core'

export interface AdminIdentity {
  userId: string | null
  label: string
}

/** Verifie que l'utilisateur connecte est admin ou super_admin et actif. */
export async function getAdmin(): Promise<AdminIdentity | null> {
  if (isTestMode()) {
    // Mode test local : l'admin est simule par un cookie, pour pouvoir tester aussi le parcours agent sans droits
    const store = await cookies()
    return store.get('bt_test_admin')?.value === '1' ? { userId: null, label: 'Admin test' } : null
  }
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('role, is_active, pseudo').eq('id', user.id).single()
  const p = data as { role: string; is_active: boolean; pseudo: string } | null
  if (!p || !p.is_active || !['admin', 'super_admin'].includes(p.role)) return null
  return { userId: user.id, label: p.pseudo }
}

// ---------------------------------------------------------------------
// Session des agents d'accueil (code a 6 chiffres, sans compte)
// ---------------------------------------------------------------------

const SESSION_HOURS = 16

export function scanCookieName(eventId: string): string {
  return `bt_scan_${eventId.replace(/-/g, '').slice(0, 16)}`
}

async function hmac(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(billetterieSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))
  return Buffer.from(sig).toString('base64url')
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

/** La signature inclut le hash du code : changer le code deconnecte tous les agents. */
export async function createScanSession(event: EventRecord, agent: string): Promise<void> {
  const exp = Date.now() + SESSION_HOURS * 3600_000
  const name = agent.replace(/[^\p{L}\p{N} '-]/gu, '').slice(0, 40) || 'Agent'
  const payload = `${event.id}.${exp}.${Buffer.from(name).toString('base64url')}`
  const sig = await hmac(`${payload}.${event.scan_pin_hash ?? ''}`)
  const store = await cookies()
  store.set(scanCookieName(event.id), `${payload}.${sig}`, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_HOURS * 3600,
  })
}

export async function clearScanSession(eventId: string): Promise<void> {
  const store = await cookies()
  store.delete(scanCookieName(eventId))
}

/** Retourne le nom de l'agent si la session est valide, sinon null. */
export async function getScanAgent(event: EventRecord): Promise<string | null> {
  const admin = await getAdmin()
  if (admin) return admin.label

  if (!event.scan_pin_hash) return null
  const store = await cookies()
  const raw = store.get(scanCookieName(event.id))?.value
  if (!raw) return null
  const parts = raw.split('.')
  if (parts.length !== 4) return null
  const [eventId, exp, name, sig] = parts
  if (eventId !== event.id || Number(exp) < Date.now()) return null
  const expected = await hmac(`${eventId}.${exp}.${name}.${event.scan_pin_hash}`)
  if (!safeEqual(sig, expected)) return null
  return Buffer.from(name, 'base64url').toString('utf8')
}
