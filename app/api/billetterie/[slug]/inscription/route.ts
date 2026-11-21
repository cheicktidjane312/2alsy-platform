import { after, type NextRequest } from 'next/server'
import { handleError, json } from '@/lib/billetterie/http'
import { notifyAdmins, submitRegistration } from '@/lib/billetterie/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params
    const form = await req.formData()
    const reg = await submitRegistration(slug, form)
    after(() => notifyAdmins(slug, reg))
    return json({ ok: true, montant: reg.montant, nb_personnes: reg.nb_personnes, email: reg.email })
  } catch (e) {
    return handleError(e)
  }
}
