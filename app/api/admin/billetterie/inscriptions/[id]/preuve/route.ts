import { NextResponse, type NextRequest } from 'next/server'
import { getAdmin } from '@/lib/billetterie/auth'
import { handleError, isUuid, json } from '@/lib/billetterie/http'
import { getStore } from '@/lib/billetterie/store'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    if (!(await getAdmin())) return json({ error: 'Accès réservé aux administrateurs.' }, 401)
    const { id } = await ctx.params
    if (!isUuid(id)) return json({ error: 'Identifiant invalide' }, 400)
    const store = getStore()
    const reg = await store.getRegistration(id)
    if (!reg?.preuve_path) return json({ error: 'Aucune capture pour cette inscription.' }, 404)
    const res = await store.preuveUrl(reg.preuve_path)
    if (!res) return json({ error: 'Capture introuvable.' }, 404)
    if ('url' in res) return NextResponse.redirect(res.url, { headers: { 'Cache-Control': 'no-store' } })
    return new NextResponse(Buffer.from(res.bytes), { headers: { 'Content-Type': res.contentType, 'Cache-Control': 'no-store' } })
  } catch (e) {
    return handleError(e)
  }
}
