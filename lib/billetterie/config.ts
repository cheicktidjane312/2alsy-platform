import 'server-only'

/**
 * Mode test : uniquement en developpement, jamais en production.
 * Il remplace Supabase par un stockage en memoire et Resend par un dossier local,
 * pour tester tout le parcours sans toucher aux vraies donnees.
 */
export function isTestMode(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.BILLETTERIE_TEST_MODE === '1'
}

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'https://2alsy.fierlah-vertex.com').replace(/\/$/, '')
}

/** Secret serveur : signe la session des agents et le hash du code d'acces. */
export function billetterieSecret(): string {
  const s = process.env.BILLETTERIE_SECRET
  if (s && s.length >= 32) return s
  if (isTestMode()) return 'test-secret-billetterie-ne-pas-utiliser-en-prod'
  throw new Error('BILLETTERIE_SECRET manquant ou trop court (32 caracteres minimum)')
}

export function emailFrom(): string {
  return process.env.BILLETTERIE_FROM_EMAIL ?? '2ALSY Billetterie <billetterie@fierlah-agency.com>'
}

export const PREUVES_BUCKET = 'billetterie-preuves'
