import type { NextRequest } from 'next/server'
import { getScanAgent } from '@/lib/billetterie/auth'
import { handleError, isUuid, json } from '@/lib/billetterie/http'
import { checkInPayload } from '@/lib/billetterie/scan'
import { getStore } from '@/lib/billetterie/store'

export const dynamic = 'force-dynamic'

/** Entree manuelle (billet introuvable sur le telephone, ecran casse...) apres recherche par nom. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params
    const store = getStore()
    const event = await store.getEventBySlug(slug)
    if (!event) return json({ error: 'Événement introuvable' }, 404)
    const agent = await getScanAgent(event)
    if (!agent) return json({ error: 'Session expirée : saisissez à nouveau le code d\'accès.' }, 401)
    const body = (await req.json().catch(() => ({}))) as { id?: string }
    if (!body.id || !isUuid(body.id)) return json({ error: 'Identifiant invalide' }, 400)
    return json(checkInPayload(event, await store.checkInById(event.id, body.id, `${agent} (manuel)`)))
  } catch (e) {
    return handleError(e)
  }
}
