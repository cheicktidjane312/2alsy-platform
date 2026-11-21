import type { NextRequest } from 'next/server'
import { clearScanSession, createScanSession, getScanAgent } from '@/lib/billetterie/auth'
import { billetterieSecret } from '@/lib/billetterie/config'
import { hashPin } from '@/lib/billetterie/core'
import { handleError, json } from '@/lib/billetterie/http'
import { getStore } from '@/lib/billetterie/store'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params
    const event = await getStore().getEventBySlug(slug)
    if (!event) return json({ error: 'Événement introuvable' }, 404)
    const agent = await getScanAgent(event)
    return json({ agent, pinConfigured: !!event.scan_pin_hash })
  } catch (e) {
    return handleError(e)
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params
    const event = await getStore().getEventBySlug(slug)
    if (!event) return json({ error: 'Événement introuvable' }, 404)
    if (!event.scan_pin_hash) return json({ error: 'Le code d\'accès des agents n\'a pas encore été défini par l\'administrateur.' }, 403)
    const body = (await req.json().catch(() => ({}))) as { pin?: string; agent?: string }
    const pin = String(body.pin ?? '')
    const hash = await hashPin(pin, billetterieSecret())
    if (hash !== event.scan_pin_hash) {
      // Ralentit les essais au hasard
      await new Promise(r => setTimeout(r, 900))
      return json({ error: 'Code incorrect.' }, 401)
    }
    await createScanSession(event, String(body.agent ?? 'Agent'))
    return json({ ok: true })
  } catch (e) {
    return handleError(e)
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const event = await getStore().getEventBySlug(slug)
  if (event) await clearScanSession(event.id)
  return json({ ok: true })
}
