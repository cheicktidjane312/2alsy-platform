'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle, ArrowLeft, Check, CheckCircle2, Copy, Download, ExternalLink, FileImage, KeyRound, Loader2,
  Mail, RotateCcw, ScanLine, Search, X,
} from 'lucide-react'
import {
  PAYMENT_LABELS, detailPlaces, formatFCFA, ticketNumber,
  type PublicEvent, type RegistrationRecord, type RegistrationStatus,
} from '@/lib/billetterie/core'

type Filtre = RegistrationStatus | 'tous'

const FILTRES: { value: Filtre; label: string }[] = [
  { value: 'en_attente', label: 'À vérifier' },
  { value: 'valide', label: 'Validés' },
  { value: 'refuse', label: 'Refusés' },
  { value: 'tous', label: 'Tous' },
]

function dateCourte(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => n.toString().padStart(2, '0')
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`
}

export default function AdminEventClient({
  event, pinConfigured, registrations, baseUrl,
}: { event: PublicEvent; pinConfigured: boolean; registrations: RegistrationRecord[]; baseUrl: string }) {
  const router = useRouter()
  const [refreshing, startRefresh] = useTransition()
  const [filtre, setFiltre] = useState<Filtre>('en_attente')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [refusId, setRefusId] = useState<string | null>(null)
  const [motif, setMotif] = useState('')

  const inscriptionUrl = `${baseUrl}/evenement/${event.slug}`
  const scanUrl = `${baseUrl}/scan/${event.slug}`

  const stats = useMemo(() => {
    const valides = registrations.filter(r => r.statut === 'valide')
    return {
      attente: registrations.filter(r => r.statut === 'en_attente').length,
      validesInscriptions: valides.length,
      validesPersonnes: valides.reduce((s, r) => s + r.nb_personnes, 0),
      montant: valides.reduce((s, r) => s + r.montant, 0),
      entres: valides.filter(r => r.entre_at).reduce((s, r) => s + r.nb_personnes, 0),
      echecsEmail: valides.filter(r => !r.email_envoye_at).length,
    }
  }, [registrations])

  // Une meme reference de paiement utilisee deux fois est suspecte
  const refsEnDouble = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of registrations) {
      if (r.statut === 'refuse' || !r.reference_paiement) continue
      const k = r.reference_paiement.trim().toLowerCase()
      counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    return new Set([...counts].filter(([, n]) => n > 1).map(([k]) => k))
  }, [registrations])

  const visibles = useMemo(() => {
    const nq = q.trim().toLowerCase()
    return registrations
      .filter(r => filtre === 'tous' || r.statut === filtre)
      .filter(r => !nq || [r.nom_complet, r.email, r.telephone, r.code_promo ?? '', r.reference_paiement ?? '', ticketNumber(event.code, r.numero)]
        .some(v => v.toLowerCase().includes(nq)))
      .sort((a, b) => filtre === 'en_attente' ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at))
  }, [registrations, filtre, q, event.code])

  async function act(id: string, action: 'valider' | 'refuser' | 'renvoyer' | 'annuler_entree', extra?: { motif: string }) {
    setBusy(id)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/billetterie/inscriptions/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error ?? 'Action impossible')
      if (action === 'valider' || action === 'renvoyer') {
        setMessage(d.emailOk
          ? { ok: true, text: 'Paiement validé : le billet a été envoyé par e-mail.' }
          : { ok: false, text: `Paiement validé, mais l'e-mail n'est pas parti (${d.erreur}). Téléchargez le billet et envoyez-le par WhatsApp, ou réessayez.` })
      } else if (action === 'refuser') {
        setMessage({ ok: true, text: d.emailOk ? 'Inscription refusée, la personne a été prévenue par e-mail.' : 'Inscription refusée (e-mail de refus non envoyé).' })
        setRefusId(null)
        setMotif('')
      }
      startRefresh(() => router.refresh())
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/billetterie" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-blue-400"><ArrowLeft className="h-4 w-4" />Billetterie</Link>
        <h1 className="mt-2 text-2xl! font-bold text-blue-400">{event.titre}</h1>
        <p className="text-sm text-slate-500">{event.date_label}{event.horaire ? `, ${event.horaire}` : ''} - {event.lieu}</p>
      </div>

      {/* Chiffres */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="À vérifier" value={stats.attente} accent={stats.attente > 0 ? 'text-orange-300' : undefined} />
        <Stat label="Personnes validées" value={stats.validesPersonnes} sub={`${stats.validesInscriptions} inscription${stats.validesInscriptions > 1 ? 's' : ''}`} />
        <Stat label="Montant validé" value={formatFCFA(stats.montant)} />
        <Stat label="Entrés le jour J" value={`${stats.entres} / ${stats.validesPersonnes}`} />
      </div>

      {/* Liens et reglages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="glass-card rounded-2xl p-4 space-y-3">
          <LinkRow label="Lien d'inscription à partager" url={inscriptionUrl} />
          <LinkRow label="Page de contrôle des agents" url={scanUrl} icon={<ScanLine className="h-4 w-4" />} />
          <a href={`/api/admin/billetterie/${event.slug}/export`} className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300">
            <Download className="h-4 w-4" /> Exporter les inscriptions (Excel)
          </a>
        </div>
        <Reglages slug={event.slug} pinConfigured={pinConfigured} ouvert={event.inscriptions_ouvertes} onSaved={() => startRefresh(() => router.refresh())} />
      </div>

      {message && (
        <div role="status" className={`rounded-xl px-4 py-3 text-sm border ${message.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-orange-500/10 border-orange-500/30 text-orange-200'}`}>
          {message.text}
        </div>
      )}
      {stats.echecsEmail > 0 && (
        <div className="rounded-xl px-4 py-3 text-sm border bg-orange-500/10 border-orange-500/30 text-orange-200 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {stats.echecsEmail} billet{stats.echecsEmail > 1 ? 's' : ''} validé{stats.echecsEmail > 1 ? 's' : ''} sans e-mail envoyé : filtre « Validés », bouton Renvoyer.
        </div>
      )}

      {/* Liste */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <div className="flex gap-1.5 overflow-x-auto">
          {FILTRES.map(f => (
            <button key={f.value} onClick={() => setFiltre(f.value)}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold ${filtre === f.value ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>
              {f.label}{f.value === 'en_attente' && stats.attente > 0 ? ` (${stats.attente})` : ''}
            </button>
          ))}
        </div>
        <div className="relative md:ml-auto md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Nom, téléphone, référence..."
            className="input-field w-full rounded-lg pl-9 pr-3 py-2 text-sm" aria-label="Rechercher" />
        </div>
        {refreshing && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
      </div>

      <ul className="space-y-3">
        {visibles.length === 0 && <li className="text-center text-slate-500 py-10">Aucune inscription dans cette liste.</li>}
        {visibles.map(r => {
          const detail = detailPlaces(event.categories, r.quantites)
          const suspect = r.reference_paiement && refsEnDouble.has(r.reference_paiement.trim().toLowerCase())
          return (
            <li key={r.id} className="glass-card rounded-2xl p-4">
              <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                <div className="flex-1 min-w-[220px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{r.nom_complet}</span>
                    {r.code_promo && <span className="rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 px-2 py-0.5 text-[11px] font-semibold tabular-nums">{r.code_promo}</span>}
                    <StatusBadge r={r} />
                    {suspect && <span className="rounded-full bg-red-500/15 text-red-300 border border-red-500/30 px-2 py-0.5 text-[11px] font-semibold">Référence déjà utilisée</span>}
                  </div>
                  <div className="text-sm text-slate-400 mt-0.5">{r.telephone} - <span className="break-all">{r.email}</span></div>
                  <div className="text-sm mt-1.5">
                    <span className="font-semibold text-white">{formatFCFA(r.montant)}</span>
                    <span className="text-slate-400"> pour {detail}</span>
                  </div>
                  <div className="text-sm text-slate-400">
                    {PAYMENT_LABELS[r.moyen_paiement]}{r.reference_paiement ? ` - réf. ${r.reference_paiement}` : ''} - inscrit le {dateCourte(r.created_at)}
                  </div>
                  {r.statut === 'valide' && (
                    <div className="text-xs mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                      <span className="text-slate-300">Billet {ticketNumber(event.code, r.numero)}</span>
                      {r.email_envoye_at
                        ? <span className="text-emerald-300 inline-flex items-center gap-1"><Mail className="h-3 w-3" />E-mail envoyé</span>
                        : <span className="text-orange-300 inline-flex items-center gap-1" title={r.email_erreur ?? ''}><AlertTriangle className="h-3 w-3" />E-mail non envoyé</span>}
                      {r.entre_at && <span className="text-blue-300">Entré le {dateCourte(r.entre_at)}{r.entre_par ? ` (${r.entre_par})` : ''}</span>}
                    </div>
                  )}
                  {r.statut === 'refuse' && r.motif_refus && <div className="text-xs text-red-300 mt-1.5">Motif : {r.motif_refus}</div>}
                </div>

                <div className="flex flex-wrap gap-2">
                  {r.preuve_path && (
                    <a href={`/api/admin/billetterie/inscriptions/${r.id}/preuve`} target="_blank" rel="noopener noreferrer"
                      className="rounded-lg border border-blue-500/30 text-blue-300 px-3 py-2 text-sm inline-flex items-center gap-1.5 hover:bg-blue-500/10">
                      <FileImage className="h-4 w-4" /> Capture
                    </a>
                  )}
                  {r.statut === 'en_attente' && (
                    <>
                      <button disabled={busy === r.id} onClick={() => { if (confirm(`Confirmer que ${formatFCFA(r.montant)} ont bien été reçus de ${r.nom_complet} ?`)) void act(r.id, 'valider') }}
                        className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50">
                        {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Valider
                      </button>
                      <button disabled={busy === r.id} onClick={() => { setRefusId(refusId === r.id ? null : r.id); setMotif('') }}
                        className="rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/10 px-3 py-2 text-sm font-semibold inline-flex items-center gap-1.5">
                        <X className="h-4 w-4" /> Refuser
                      </button>
                    </>
                  )}
                  {r.statut === 'valide' && (
                    <>
                      <button disabled={busy === r.id} onClick={() => act(r.id, 'renvoyer')}
                        className="rounded-lg border border-blue-500/30 text-blue-300 hover:bg-blue-500/10 px-3 py-2 text-sm inline-flex items-center gap-1.5 disabled:opacity-50">
                        {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Renvoyer
                      </button>
                      <a href={`/api/admin/billetterie/inscriptions/${r.id}/billet`}
                        className="rounded-lg border border-blue-500/30 text-blue-300 hover:bg-blue-500/10 px-3 py-2 text-sm inline-flex items-center gap-1.5">
                        <Download className="h-4 w-4" /> Billet PDF
                      </a>
                      {r.entre_at && (
                        <button disabled={busy === r.id} onClick={() => { if (confirm('Annuler l\'entrée de ce billet ? Il pourra être scanné à nouveau.')) void act(r.id, 'annuler_entree') }}
                          className="rounded-lg border border-slate-500/30 text-slate-300 hover:bg-white/5 px-3 py-2 text-sm inline-flex items-center gap-1.5">
                          <RotateCcw className="h-4 w-4" /> Annuler l&apos;entrée
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {refusId === r.id && (
                <form onSubmit={e => { e.preventDefault(); void act(r.id, 'refuser', { motif }) }} className="mt-3 flex flex-col sm:flex-row gap-2">
                  <input value={motif} onChange={e => setMotif(e.target.value)} autoFocus maxLength={300}
                    placeholder="Motif envoyé à la personne (ex. paiement non reçu)" className="input-field flex-1 rounded-lg px-3 py-2 text-sm" />
                  <div className="flex flex-wrap gap-1.5">
                    {['Paiement non reçu', 'Montant incomplet', 'Capture illisible'].map(m => (
                      <button key={m} type="button" onClick={() => setMotif(m)} className="rounded-lg bg-white/5 px-2.5 py-2 text-xs text-slate-300 hover:bg-white/10">{m}</button>
                    ))}
                  </div>
                  <button type="submit" disabled={busy === r.id || motif.trim().length < 3} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold disabled:opacity-50">Confirmer le refus</button>
                </form>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Stat({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="text-xs text-slate-500 uppercase tracking-wide">{label}</div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${accent ?? 'text-white'}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  )
}

function StatusBadge({ r }: { r: RegistrationRecord }) {
  if (r.statut === 'en_attente') return <span className="rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/30 px-2 py-0.5 text-[11px] font-semibold">À vérifier</span>
  if (r.statut === 'refuse') return <span className="rounded-full bg-red-500/15 text-red-300 border border-red-500/30 px-2 py-0.5 text-[11px] font-semibold">Refusé</span>
  return <span className="rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Validé</span>
}

function LinkRow({ label, url, icon }: { label: string; url: string; icon?: React.ReactNode }) {
  const [copied, setCopied] = useState(false)
  return (
    <div>
      <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">{icon}{label}</div>
      <div className="flex items-center gap-2">
        <code className="flex-1 min-w-0 truncate rounded-lg bg-black/30 px-3 py-2 text-xs text-slate-300">{url}</code>
        <button onClick={async () => { await navigator.clipboard.writeText(url).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
          className="rounded-lg bg-white/5 p-2 text-slate-300 hover:bg-white/10" aria-label="Copier le lien">
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
        </button>
        <a href={url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-white/5 p-2 text-slate-300 hover:bg-white/10" aria-label="Ouvrir"><ExternalLink className="h-4 w-4" /></a>
      </div>
    </div>
  )
}

function Reglages({ slug, pinConfigured, ouvert, onSaved }: { slug: string; pinConfigured: boolean; ouvert: boolean; onSaved: () => void }) {
  const [pin, setPin] = useState('')
  const [ouvertLocal, setOuvertLocal] = useState(ouvert)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function save(body: Record<string, unknown>, ok: string): Promise<boolean> {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/admin/billetterie/${slug}/reglages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error ?? 'Enregistrement impossible')
      setMsg(ok)
      setPin('')
      onSaved()
      return true
    } catch (e) {
      setMsg((e as Error).message)
      return false
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="glass-card rounded-2xl p-4 space-y-3">
      <div>
        <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5"><KeyRound className="h-4 w-4" />Code d&apos;accès des agents d&apos;accueil</div>
        <p className="text-xs text-slate-400 mb-2">{pinConfigured ? 'Un code est défini. Le changer déconnecte tous les agents.' : 'Aucun code : les agents ne peuvent pas encore se connecter.'}</p>
        <form onSubmit={e => { e.preventDefault(); void save({ pin }, 'Code enregistré. Communiquez-le aux agents de vive voix.') }} className="flex gap-2">
          <input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="6 chiffres"
            className="input-field w-36 rounded-lg px-3 py-2 text-sm tracking-widest tabular-nums" aria-label="Nouveau code d'accès" />
          <button type="submit" disabled={saving || pin.length !== 6} className="btn-primary rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50">
            {pinConfigured ? 'Changer' : 'Définir'}
          </button>
        </form>
      </div>
      <label className="flex items-center justify-between gap-3 pt-2 border-t border-white/5">
        <span className="text-sm text-slate-300">Inscriptions ouvertes</span>
        <input type="checkbox" checked={ouvertLocal} disabled={saving}
          onChange={async e => {
            const v = e.target.checked
            setOuvertLocal(v)
            if (!(await save({ inscriptions_ouvertes: v }, v ? 'Inscriptions ouvertes.' : 'Inscriptions fermées.'))) setOuvertLocal(!v)
          }}
          className="h-5 w-5 accent-blue-500" />
      </label>
      {msg && <p className="text-xs text-blue-300">{msg}</p>}
    </div>
  )
}
