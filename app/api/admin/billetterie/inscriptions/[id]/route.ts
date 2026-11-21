import type { NextRequest } from 'next/server'
import { getAdmin } from '@/lib/billetterie/auth'
import { handleError, isUuid, json } from '@/lib/billetterie/http'
import { rejectRegistration, resendTicket, validateRegistration, UserError } from '@/lib/billetterie/service'
import { getStore } from '@/lib/billetterie/store'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdmin()
    if (!admin) return json({ error: 'Accès réservé aux administrateurs.' }, 401)
    const { id } = await ctx.params
    if (!isUuid(id)) throw new UserError('Identifiant invalide')
    const body = (await req.json().catch(() => ({}))) as { action?: string; motif?: string }

    switch (body.action) {
      case 'valider':
        return json(await validateRegistration(id, admin.userId))
      case 'renvoyer':
        return json(await resendTicket(id))
      case 'refuser':
        return json(await rejectRegistration(id, body.motif ?? ''))
      case 'annuler_entree': {
        const store = getStore()
        const reg = await store.getRegistration(id)
        if (!reg) throw new UserError('Inscription introuvable', 404)
        await store.undoCheckIn(reg.event_id, id)
        return json({ registration: await store.getRegistration(id) })
      }
      default:
        throw new UserError('Action inconnue')
    }
  } catch (e) {
    return handleError(e)
  }
}
