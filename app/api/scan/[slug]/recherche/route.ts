import type { NextRequest } from 'next/server'
import { getScanAgent } from '@/lib/billetterie/auth'
import { ticketNumber } from '@/lib/billetterie/core'
import { handleError, json } from '@/lib/billetterie/http'
import { scanView } from '@/lib/billetterie/scan'
import { getStore } from '@/lib/billetterie/store'

export const dynamic = 'force-dynamic'

function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params
    const store = getStore()
    const event = await store.getEventBySlug(slug)
    if (!event) return json({ error: 'Événement introuvable' }, 404)
    const agent = await getScanAgent(event)
    if (!agent) return json({ error: 'Session expirée : saisissez à nouveau le code d\'accès.' }, 401)

    const regs = (await store.listRegistrations(event.id)).filter(r => r.statut === 'valide')
    const entres = regs.filter(r => r.entre_at).reduce((s, r) => s + r.nb_personnes, 0)
    const attendus = regs.reduce((s, r) => s + r.nb_personnes, 0)

    const q = norm(req.nextUrl.searchParams.get('q') ?? '').trim()
    const digits = q.replace(/\D/g, '')
    const results = q.length < 2 ? [] : regs
      .filter(r =>
        norm(r.nom_complet).includes(q) ||
        norm(ticketNumber(event.code, r.numero)).includes(q) ||
        (!!r.code_promo && norm(r.code_promo) === q.replace(/[\s\-_.]/g, '')) ||
        (digits.length >= 4 && r.telephone.replace(/\D/g, '').includes(digits)))
      .slice(0, 12)
      .map(r => scanView(event, r))

    return json({ results, stats: { entres, attendus } })
  } catch (e) {
    return handleError(e)
  }
}
