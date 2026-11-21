import 'server-only'
import { NextResponse } from 'next/server'
import { UserError } from './service'

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

export function handleError(e: unknown) {
  if (e instanceof UserError) return json({ error: e.message }, e.status)
  console.error('[billetterie]', e)
  return json({ error: 'Erreur serveur. Réessayez dans un instant.' }, 500)
}

export function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}
