import { NextResponse, type NextRequest } from 'next/server'
import { appUrl } from '@/lib/billetterie/config'
import { isValidToken, ticketNumber, ticketUrl } from '@/lib/billetterie/core'
import { handleError, json } from '@/lib/billetterie/http'
import { getStore } from '@/lib/billetterie/store'
import { buildTicketPdf } from '@/lib/billetterie/ticket-pdf'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params
    if (!isValidToken(token)) return json({ error: 'Billet introuvable' }, 404)
    const store = getStore()
    const reg = await store.getRegistrationByToken(token)
    if (!reg || reg.statut !== 'valide') return json({ error: 'Billet introuvable' }, 404)
    const event = (await store.listEvents()).find(e => e.id === reg.event_id)!
    const pdf = await buildTicketPdf(event, reg, ticketUrl(appUrl(), token))
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Billet-${ticketNumber(event.code, reg.numero)}.pdf"`,
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex',
      },
    })
  } catch (e) {
    return handleError(e)
  }
}
