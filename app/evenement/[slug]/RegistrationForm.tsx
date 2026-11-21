'use client'

import { useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { CalendarDays, Check, Clock, Copy, ImagePlus, Loader2, MapPin, Minus, Plus, Shirt, X } from 'lucide-react'
import { effectiveDeadline, formatFCFA, type PublicEvent } from '@/lib/billetterie/core'

type Moyen = 'wave' | 'orange_money'

const MOYENS: { value: Moyen; label: string; color: string }[] = [
  { value: 'wave', label: 'Wave', color: '#1dc8f2' },
  { value: 'orange_money', label: 'Orange Money', color: '#ff7900' },
]

/** Reduit les photos avant l'envoi : une capture de 4 Mo passe a environ 200 Ko. */
async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.size < 400_000) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.82))
    return blob && blob.size < file.size ? blob : file
  } catch {
    return file
  }
}

export default function RegistrationForm({ event, closedReason }: { event: PublicEvent; closedReason: string | null }) {
  const [quantites, setQuantites] = useState<Record<string, number>>(
    () => Object.fromEntries(event.categories.map((c, i) => [c.code, i === 0 ? 1 : 0])),
  )
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [email, setEmail] = useState('')
  const [codePromo, setCodePromo] = useState('')
  const [moyen, setMoyen] = useState<Moyen>('wave')
  const [reference, setReference] = useState('')
  const [preuve, setPreuve] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ email: string; montant: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const total = useMemo(() => {
    let montant = 0
    let nb = 0
    for (const c of event.categories) {
      montant += (quantites[c.code] ?? 0) * c.prix
      nb += quantites[c.code] ?? 0
    }
    return { montant, nb }
  }, [quantites, event.categories])

  const limite = effectiveDeadline(event)
  const deadline = limite
    ? limite.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' })
    : null

  function setQ(code: string, delta: number) {
    setQuantites(q => ({ ...q, [code]: Math.max(0, Math.min(20, (q[code] ?? 0) + delta)) }))
  }

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(event.paiement_numero.replace(/\s/g, ''))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* presse-papiers indisponible */
    }
  }

  function pickFile(f: File | null) {
    setError(null)
    if (preview) URL.revokeObjectURL(preview)
    if (!f) { setPreuve(null); setPreview(null); return }
    if (f.size > 15 * 1024 * 1024) { setError('Ce fichier est trop lourd (15 Mo maximum).'); return }
    setPreuve(f)
    setPreview(f.type.startsWith('image/') ? URL.createObjectURL(f) : null)
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (total.nb < 1) return setError('Choisissez au moins une place.')
    if (!reference.trim() && !preuve) return setError('Ajoutez la capture de votre paiement ou sa référence.')

    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.set('nom_complet', nom)
      fd.set('telephone', telephone)
      fd.set('email', email)
      fd.set('code_promo', codePromo)
      fd.set('moyen_paiement', moyen)
      fd.set('reference_paiement', reference)
      fd.set('quantites', JSON.stringify(quantites))
      fd.set('site_web', (e.currentTarget.elements.namedItem('site_web') as HTMLInputElement)?.value ?? '')
      if (preuve) {
        const blob = await compressImage(preuve)
        const name = blob === preuve ? preuve.name : 'capture.jpg'
        if (blob.size > 5 * 1024 * 1024) throw new Error('La capture dépasse 5 Mo. Envoyez une capture d\'écran plutôt qu\'une photo.')
        fd.set('preuve', blob, name)
      }
      const res = await fetch(`/api/billetterie/${event.slug}/inscription`, { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'L\'envoi a échoué. Vérifiez votre connexion et réessayez.')
      setDone({ email: data.email, montant: data.montant })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fbf6f9] text-[#14214f]">
      {/* En-tete */}
      <header className="bg-[#d6246e] text-white">
        <div className="max-w-xl mx-auto px-5 pt-6 pb-8">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-white p-1.5 shrink-0">
              <Image src="/logo-2alsy.png" alt="2ALSY" width={32} height={32} className="h-full w-full object-contain" />
            </div>
            <p className="text-sm font-semibold tracking-wide text-white/90">La 2ALSY vous invite au</p>
          </div>
          <h1 className="mt-5 text-[2rem]! leading-tight font-bold tracking-tight">{event.titre}</h1>
          {event.sous_titre && <p className="mt-1 text-white/85 text-sm uppercase tracking-[0.14em]">{event.sous_titre}</p>}
          <ul className="mt-5 space-y-2 text-[15px]">
            <li className="flex items-center gap-2.5"><CalendarDays className="h-4 w-4 shrink-0" />{event.date_label}</li>
            {event.horaire && <li className="flex items-center gap-2.5"><Clock className="h-4 w-4 shrink-0" />{event.horaire}</li>}
            <li className="flex items-center gap-2.5"><MapPin className="h-4 w-4 shrink-0" />{event.lieu}</li>
            {event.dress_code && <li className="flex items-center gap-2.5"><Shirt className="h-4 w-4 shrink-0" />Tenue : {event.dress_code.toLowerCase()}</li>}
          </ul>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-5 -mt-4 pb-16">
        {done ? (
          <section className="rounded-2xl bg-white shadow-sm border border-[#f0dbe6] p-6 text-center">
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Check className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-xl! font-bold">Inscription envoyée</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[#3a4466]">
              Merci. Votre paiement de <strong>{formatFCFA(done.montant)}</strong> va être vérifié par l&apos;équipe.
              Vous recevrez votre <strong>billet avec code QR</strong> à l&apos;adresse <strong className="break-all">{done.email}</strong>.
            </p>
            <p className="mt-3 text-sm text-[#6b7290]">Pensez à regarder dans vos courriers indésirables (spams).</p>
            {event.contact && <p className="mt-5 text-sm text-[#6b7290]">Une question ? {event.contact}</p>}
          </section>
        ) : closedReason ? (
          <section className="rounded-2xl bg-white shadow-sm border border-[#f0dbe6] p-6 text-center">
            <h2 className="text-lg! font-bold">Inscriptions fermées</h2>
            <p className="mt-2 text-[15px] text-[#3a4466]">{closedReason}</p>
            {event.contact && <p className="mt-4 text-sm text-[#6b7290]">Informations : {event.contact}</p>}
          </section>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            {/* 1. Places */}
            <section className="rounded-2xl bg-white shadow-sm border border-[#f0dbe6] p-5">
              <Step n={1} title="Vos places" />
              <div className="mt-3 divide-y divide-[#f3e7ee]">
                {event.categories.map(c => (
                  <div key={c.code} className="flex items-center justify-between py-3">
                    <div>
                      <div className="font-semibold">{c.label}</div>
                      <div className="text-sm text-[#6b7290]">{formatFCFA(c.prix)}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="button" aria-label={`Retirer une place ${c.label}`} onClick={() => setQ(c.code, -1)}
                        className="h-10 w-10 rounded-full border border-[#e5cfdb] flex items-center justify-center text-[#d6246e] active:scale-95 disabled:opacity-30"
                        disabled={(quantites[c.code] ?? 0) === 0}>
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-6 text-center text-lg font-bold tabular-nums" aria-live="polite">{quantites[c.code] ?? 0}</span>
                      <button type="button" aria-label={`Ajouter une place ${c.label}`} onClick={() => setQ(c.code, 1)}
                        className="h-10 w-10 rounded-full bg-[#d6246e] text-white flex items-center justify-center active:scale-95">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-baseline justify-between rounded-xl bg-[#14214f] text-white px-4 py-3">
                <span className="text-sm">Total à payer{total.nb > 0 && ` (${total.nb} personne${total.nb > 1 ? 's' : ''})`}</span>
                <span className="text-xl font-bold tabular-nums whitespace-nowrap">{formatFCFA(total.montant)}</span>
              </div>
            </section>

            {/* 2. Paiement */}
            <section className="rounded-2xl bg-white shadow-sm border border-[#f0dbe6] p-5">
              <Step n={2} title="Payez" />
              <p className="mt-3 text-[15px] leading-relaxed text-[#3a4466]">
                Envoyez <strong className="text-[#14214f]">{formatFCFA(total.montant)}</strong> par {event.paiement_moyens} au numéro
                {event.paiement_beneficiaire ? ` de ${event.paiement_beneficiaire}` : ''} :
              </p>
              <button type="button" onClick={copyNumber} aria-label={`Copier le numéro ${event.paiement_numero}`}
                className="mt-3 w-full rounded-xl border-2 border-dashed border-[#d6246e]/40 bg-[#fff2f8] px-4 py-3 text-center active:scale-[0.99]">
                <span className="block text-[22px] font-bold tabular-nums whitespace-nowrap">{event.paiement_numero}</span>
                <span className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#d6246e]">
                  {copied ? <><Check className="h-4 w-4" />Numéro copié</> : <><Copy className="h-4 w-4" />Toucher pour copier le numéro</>}
                </span>
              </button>
              {deadline && <p className="mt-2 text-sm text-[#6b7290]">Date limite de paiement : {deadline}.</p>}
            </section>

            {/* 3. Informations */}
            <section className="rounded-2xl bg-white shadow-sm border border-[#f0dbe6] p-5 space-y-4">
              <Step n={3} title="Vos informations" />

              <Field label="Nom et prénoms" htmlFor="nom">
                <input id="nom" required autoComplete="name" value={nom} onChange={e => setNom(e.target.value)}
                  className="ev-input" placeholder="Ex. Aya Konan" maxLength={120} />
              </Field>
              <Field label="Téléphone" htmlFor="tel">
                <input id="tel" required type="tel" inputMode="tel" autoComplete="tel" value={telephone} onChange={e => setTelephone(e.target.value)}
                  className="ev-input" placeholder="Ex. 07 00 00 00 00" maxLength={25} />
              </Field>
              <Field label="E-mail (votre billet sera envoyé ici)" htmlFor="email">
                <input id="email" required type="email" inputMode="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="ev-input" placeholder="Ex. aya@gmail.com" maxLength={160} />
              </Field>
              <Field label="Code promo membre 2ALSY (si vous êtes membre)" htmlFor="code_promo">
                <input id="code_promo" autoComplete="off" autoCapitalize="characters" spellCheck={false} value={codePromo}
                  onChange={e => setCodePromo(e.target.value.toUpperCase())}
                  className="ev-input uppercase" placeholder="Ex. AS45" maxLength={6} />
              </Field>

              <div>
                <span className="block text-sm font-semibold mb-1.5">Payé avec</span>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Moyen de paiement">
                  {MOYENS.map(m => (
                    <button key={m.value} type="button" role="radio" aria-checked={moyen === m.value} onClick={() => setMoyen(m.value)}
                      className={`rounded-xl border-2 px-3 py-3 text-[15px] font-semibold transition-colors ${moyen === m.value ? 'border-[#14214f] bg-[#14214f] text-white' : 'border-[#ecdbe4] bg-white'}`}>
                      <span className="inline-block h-2.5 w-2.5 rounded-full mr-2 align-middle" style={{ background: m.color }} />
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-sm font-semibold mb-1.5">Capture du paiement</span>
                <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
                  onChange={e => pickFile(e.target.files?.[0] ?? null)} aria-label="Capture du paiement" />
                {preuve ? (
                  <div className="flex items-center gap-3 rounded-xl border border-[#ecdbe4] p-2.5">
                    {preview
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={preview} alt="Aperçu de la capture" className="h-16 w-16 rounded-lg object-cover" />
                      : <div className="h-16 w-16 rounded-lg bg-[#f3e7ee] flex items-center justify-center text-xs font-bold">PDF</div>}
                    <span className="flex-1 text-sm truncate">{preuve.name}</span>
                    <button type="button" onClick={() => { pickFile(null); if (fileRef.current) fileRef.current.value = '' }}
                      className="p-2 text-[#6b7290]" aria-label="Retirer la capture"><X className="h-5 w-5" /></button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#e5cfdb] py-5 text-[15px] font-semibold text-[#d6246e] active:scale-[0.99]">
                    <ImagePlus className="h-5 w-5" /> Ajouter la capture d&apos;écran
                  </button>
                )}
              </div>

              <Field label="Référence de la transaction (si pas de capture)" htmlFor="ref">
                <input id="ref" value={reference} onChange={e => setReference(e.target.value)} className="ev-input"
                  placeholder="Ex. ID de transaction Wave ou Orange Money" maxLength={80} autoComplete="off" />
              </Field>

              {/* Piege a robots, invisible pour les humains */}
              <input name="site_web" tabIndex={-1} autoComplete="off" className="absolute -left-[9999px] h-0 w-0 opacity-0" aria-hidden="true" />
            </section>

            {error && <p role="alert" className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-[15px] text-red-700">{error}</p>}

            <button type="submit" disabled={submitting || total.nb < 1}
              className="w-full rounded-2xl bg-[#d6246e] py-4 text-lg font-bold text-white shadow-lg shadow-[#d6246e]/25 disabled:opacity-50 active:scale-[0.99] flex items-center justify-center gap-2">
              {submitting ? <><Loader2 className="h-5 w-5 animate-spin" />Envoi en cours...</> : `Envoyer mon inscription`}
            </button>
            <p className="text-center text-xs text-[#8a90a8] leading-relaxed">
              Vos informations servent uniquement à l&apos;organisation de l&apos;événement par la 2ALSY.
              Votre billet vous est envoyé par e-mail dès que le paiement est vérifié.
            </p>
          </form>
        )}
      </main>
    </div>
  )
}

function Step({ n, title }: { n: number; title: string }) {
  return (
    <h2 className="flex items-center gap-2.5 text-[17px]! leading-snug! font-bold">
      <span className="h-7 w-7 rounded-full bg-[#d6246e] text-white text-sm flex items-center justify-center shrink-0">{n}</span>
      {title}
    </h2>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-semibold mb-1.5">{label}</label>
      {children}
    </div>
  )
}
