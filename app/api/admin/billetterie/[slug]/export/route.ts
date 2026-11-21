import { NextResponse, type NextRequest } from 'next/server'
import { getAdmin } from '@/lib/billetterie/auth'
import { PAYMENT_LABELS, ticketNumber, toCsv } from '@/lib/billetterie/core'
import { handleError, json } from '@/lib/billetterie/http'
import { getStore } from '@/lib/billetterie/store'

export const dynamic = 'force-dynamic'

const STATUTS = { en_attente: 'En attente', valide: 'Validé', refuse: 'Refusé' } as const

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    if (!(await getAdmin())) return json({ error: 'Accès réservé aux administrateurs.' }, 401)
    const { slug } = await ctx.params
    const store = getStore()
    const event = await store.getEventBySlug(slug)
    if (!event) return json({ error: 'Événement introuvable' }, 404)
    const regs = await store.listRegistrations(event.id)
    const header = ['Billet', 'Inscrit le', 'Nom', 'Téléphone', 'E-mail', 'Code membre',
      ...event.categories.map(c => c.label), 'Personnes', 'Montant (FCFA)', 'Paiement', 'Référence',
      'Statut', 'Motif du refus', 'E-mail envoyé', 'Entré le', 'Contrôlé par']
    const rows = regs.map(r => [
      ticketNumber(event.code, r.numero), r.created_at.slice(0, 16).replace('T', ' '), r.nom_complet, r.telephone, r.email, r.code_promo,
      ...event.categories.map(c => r.quantites[c.code] ?? 0), r.nb_personnes, r.montant,
      PAYMENT_LABELS[r.moyen_paiement], r.reference_paiement, STATUTS[r.statut], r.motif_refus,
      r.email_envoye_at ? 'Oui' : r.statut === 'valide' ? 'Non' : '', r.entre_at ? r.entre_at.slice(0, 16).replace('T', ' ') : '', r.entre_par,
    ])
    return new NextResponse(toCsv([header, ...rows]), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="inscriptions-${event.slug}.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    return handleError(e)
  }
}
