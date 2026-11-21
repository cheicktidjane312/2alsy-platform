import type { NextRequest } from 'next/server'
import { getScanAgent } from '@/lib/billetterie/auth'
import { extractToken } from '@/lib/billetterie/core'
import { handleError, json } from '@/lib/billetterie/http'
import { checkInPayload } from '@/lib/billetterie/scan'
import { getStore } from '@/lib/billetterie/store'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params
    const store = getStore()
    const event = await store.getEventBySlug(slug)
    if (!event) return json({ error: 'Événement introuvable' }, 404)
    const agent = await getScanAgent(event)
    if (!agent) return json({ error: 'Session expirée : saisissez à nouveau le code d\'accès.' }, 401)

    const body = (await req.json().catch(() => ({}))) as { code?: string }
    const token = extractToken(String(body.code ?? ''))
    if (!token) return json({ status: 'inconnu' })
    return json(checkInPayload(event, await store.checkIn(event.id, token, agent)))
  } catch (e) {
    return handleError(e)
  }
}
