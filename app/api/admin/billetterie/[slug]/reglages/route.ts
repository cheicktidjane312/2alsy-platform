import type { NextRequest } from 'next/server'
import { getAdmin } from '@/lib/billetterie/auth'
import { billetterieSecret } from '@/lib/billetterie/config'
import { hashPin, pinSchema } from '@/lib/billetterie/core'
import { handleError, json } from '@/lib/billetterie/http'
import { UserError } from '@/lib/billetterie/service'
import { getStore } from '@/lib/billetterie/store'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    if (!(await getAdmin())) return json({ error: 'Accès réservé aux administrateurs.' }, 401)
    const { slug } = await ctx.params
    const store = getStore()
    const event = await store.getEventBySlug(slug)
    if (!event) throw new UserError('Événement introuvable', 404)
    const body = (await req.json().catch(() => ({}))) as { pin?: string | null; inscriptions_ouvertes?: boolean }

    if (body.pin !== undefined) {
      if (body.pin === null) {
        await store.setScanPin(event.id, null)
      } else {
        const p = pinSchema.safeParse(body.pin)
        if (!p.success) throw new UserError(p.error.issues[0].message)
        await store.setScanPin(event.id, await hashPin(p.data, billetterieSecret()))
      }
    }
    if (typeof body.inscriptions_ouvertes === 'boolean') {
      await store.setInscriptionsOuvertes(event.id, body.inscriptions_ouvertes)
    }
    return json({ ok: true })
  } catch (e) {
    return handleError(e)
  }
}
