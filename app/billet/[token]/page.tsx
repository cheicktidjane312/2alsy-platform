import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import QRCode from 'qrcode'
import { CalendarDays, CheckCircle2, Download, MapPin } from 'lucide-react'
import { appUrl } from '@/lib/billetterie/config'
import { detailPlaces, isValidToken, ticketNumber, ticketUrl } from '@/lib/billetterie/core'
import { getStore } from '@/lib/billetterie/store'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Mon billet | 2ALSY',
  robots: { index: false, follow: false },
}

export default async function BilletPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!isValidToken(token)) notFound()
  const store = getStore()
  const reg = await store.getRegistrationByToken(token)
  if (!reg || reg.statut !== 'valide') notFound()
  const event = (await store.listEvents()).find(e => e.id === reg.event_id)
  if (!event) notFound()

  const svg = await QRCode.toString(ticketUrl(appUrl(), token), { type: 'svg', margin: 1, errorCorrectionLevel: 'M' })
  const num = ticketNumber(event.code, reg.numero)
  const detail = detailPlaces(event.categories, reg.quantites)

  return (
    <div className="min-h-screen bg-[#fbf6f9] text-[#14214f] px-4 py-8">
      <div className="max-w-sm mx-auto rounded-3xl bg-white shadow-xl shadow-[#d6246e]/10 overflow-hidden border border-[#f0dbe6]">
        <div className="bg-[#d6246e] text-white px-6 py-5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-white p-1 shrink-0">
            <Image src="/logo-2alsy.png" alt="2ALSY" width={32} height={32} className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="text-xs font-semibold tracking-[0.14em] uppercase text-white/85">Billet d&apos;entrée</div>
            <div className="text-lg font-bold leading-tight">{event.titre}</div>
          </div>
        </div>

        <div className="px-6 pt-6 pb-4 text-center">
          <div className="mx-auto w-60 [&_svg]:w-full [&_svg]:h-auto" dangerouslySetInnerHTML={{ __html: svg }} />
          <div className="mt-3 text-2xl font-bold tracking-wide tabular-nums">{num}</div>
          <div className="text-sm text-[#6b7290]">Valable pour {reg.nb_personnes} personne{reg.nb_personnes > 1 ? 's' : ''}</div>
          {reg.entre_at && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4" /> Billet déjà utilisé à l&apos;entrée
            </div>
          )}
        </div>

        <div className="mx-6 border-t border-dashed border-[#ecdbe4]" />

        <dl className="px-6 py-4 space-y-2.5 text-[15px]">
          <div className="flex justify-between gap-4"><dt className="text-[#6b7290]">Participant</dt><dd className="font-semibold text-right">{reg.nom_complet}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-[#6b7290]">Places</dt><dd className="font-semibold text-right">{detail}</dd></div>
          <div className="flex items-start gap-2 pt-1 text-[#3a4466]"><CalendarDays className="h-4 w-4 mt-0.5 shrink-0 text-[#d6246e]" />{event.date_label}{event.horaire ? `, ${event.horaire}` : ''}</div>
          <div className="flex items-start gap-2 text-[#3a4466]"><MapPin className="h-4 w-4 mt-0.5 shrink-0 text-[#d6246e]" />{event.lieu}</div>
        </dl>

        <div className="px-6 pb-6">
          <a href={`/api/billet/${token}/pdf`} className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#14214f] py-3.5 font-semibold text-white">
            <Download className="h-4 w-4" /> Télécharger le reçu en PDF
          </a>
          <p className="mt-3 text-center text-xs text-[#8a90a8]">Présentez ce code QR à l&apos;entrée. Il ne peut servir qu&apos;une seule fois : ne le partagez pas.</p>
        </div>
      </div>
    </div>
  )
}
