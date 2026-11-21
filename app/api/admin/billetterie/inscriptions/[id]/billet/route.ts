import { NextResponse, type NextRequest } from 'next/server'
import { getAdmin } from '@/lib/billetterie/auth'
import { appUrl } from '@/lib/billetterie/config'
import { ticketNumber, ticketUrl } from '@/lib/billetterie/core'
import { handleError, isUuid, json } from '@/lib/billetterie/http'
import { getStore } from '@/lib/billetterie/store'
import { buildTicketPdf } from '@/lib/billetterie/ticket-pdf'

export const dynamic = 'force-dynamic'

/** Permet a l'admin de telecharger le billet (par exemple pour l'envoyer par WhatsApp si l'e-mail echoue). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    if (!(await getAdmin())) return json({ error: 'Accès réservé aux administrateurs.' }, 401)
    const { id } = await ctx.params
    if (!isUuid(id)) return json({ error: 'Identifiant invalide' }, 400)
    const store = getStore()
    const reg = await store.getRegistration(id)
    if (!reg || reg.statut !== 'valide' || !reg.ticket_token) return json({ error: 'Billet non disponible.' }, 404)
    const event = (await store.listEvents()).find(e => e.id === reg.event_id)!
    const pdf = await buildTicketPdf(event, reg, ticketUrl(appUrl(), reg.ticket_token))
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Billet-${ticketNumber(event.code, reg.numero)}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    return handleError(e)
  }
}
