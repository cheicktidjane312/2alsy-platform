'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { AlertTriangle, CameraOff, CheckCircle2, Loader2, LogOut, Search, ScanLine, UserCheck, XCircle } from 'lucide-react'

interface Billet {
  id: string
  billet: string
  nom: string
  nb_personnes: number
  detail: string
  statut: 'en_attente' | 'valide' | 'refuse'
  entre_at: string | null
  entre_par: string | null
}

type Result =
  | { status: 'ok' | 'deja_entre' | 'non_valide'; billet: Billet }
  | { status: 'inconnu' }
  | { status: 'erreur'; message: string }

function heure(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getUTCHours().toString().padStart(2, '0')} h ${d.getUTCMinutes().toString().padStart(2, '0')}`
}

function feedback(ok: boolean) {
  try {
    navigator.vibrate?.(ok ? 120 : [80, 60, 80, 60, 200])
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AC()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.value = ok ? 880 : 220
    g.gain.value = 0.08
    o.connect(g).connect(ctx.destination)
    o.start()
    o.stop(ctx.currentTime + (ok ? 0.12 : 0.35))
  } catch {
    /* son indisponible */
  }
}

export default function ScanClient({ slug, titre }: { slug: string; titre: string }) {
  const [phase, setPhase] = useState<'chargement' | 'code' | 'scan'>('chargement')
  const [agent, setAgent] = useState<string | null>(null)
  const [pinConfigured, setPinConfigured] = useState(true)

  useEffect(() => {
    fetch(`/api/scan/${slug}/session`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        setPinConfigured(!!d.pinConfigured)
        if (d.agent) { setAgent(d.agent); setPhase('scan') } else setPhase('code')
      })
      .catch(() => setPhase('code'))
  }, [slug])

  if (phase === 'chargement') {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-400" /></div>
  }
  if (phase === 'code') {
    return <PinScreen slug={slug} titre={titre} pinConfigured={pinConfigured} onDone={name => { setAgent(name); setPhase('scan') }} />
  }
  return <Scanner slug={slug} titre={titre} agent={agent ?? 'Agent'} onLogout={() => { setAgent(null); setPhase('code') }} />
}

function PinScreen({ slug, titre, pinConfigured, onDone }: { slug: string; titre: string; pinConfigured: boolean; onDone: (name: string) => void }) {
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/scan/${slug}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, agent: name }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error ?? 'Connexion impossible')
      onDone(name || 'Agent')
    } catch (err) {
      setError((err as Error).message)
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl glass-card p-6 space-y-5">
        <div className="text-center">
          <ScanLine className="h-10 w-10 mx-auto text-blue-400" />
          <h1 className="mt-3 text-xl! font-bold">Contrôle des entrées</h1>
          <p className="text-sm text-slate-400 mt-1">{titre}</p>
        </div>
        {!pinConfigured && (
          <p className="text-sm rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-300 p-3">
            Le code d&apos;accès n&apos;a pas encore été défini. Un administrateur doit le créer dans Administration, Billetterie.
          </p>
        )}
        <div>
          <label htmlFor="agent" className="block text-sm text-slate-300 mb-1.5">Votre prénom</label>
          <input id="agent" value={name} onChange={e => setName(e.target.value)} maxLength={40} autoComplete="given-name"
            className="input-field w-full rounded-lg px-4 py-3 text-base" placeholder="Ex. Moussa" />
        </div>
        <div>
          <label htmlFor="pin" className="block text-sm text-slate-300 mb-1.5">Code d&apos;accès (6 chiffres)</label>
          <input id="pin" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric"
            autoComplete="one-time-code" className="input-field w-full rounded-lg px-4 py-3 text-center text-2xl tracking-[0.5em] tabular-nums" placeholder="000000" />
        </div>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={loading || pin.length !== 6} className="btn-primary w-full rounded-lg py-3 font-semibold disabled:opacity-50">
          {loading ? 'Vérification...' : 'Commencer le contrôle'}
        </button>
      </form>
    </div>
  )
}

function Scanner({ slug, titre, agent, onLogout }: { slug: string; titre: string; agent: string; onLogout: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const busyRef = useRef(false)
  const lastRef = useRef<{ code: string; at: number }>({ code: '', at: 0 })
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [stats, setStats] = useState<{ entres: number; attendus: number } | null>(null)
  const [mode, setMode] = useState<'scan' | 'recherche'>('scan')

  const refreshStats = useCallback(() => {
    fetch(`/api/scan/${slug}/recherche?q=`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setStats(d.stats))
      .catch(() => {})
  }, [slug])

  useEffect(() => { refreshStats() }, [refreshStats])

  const show = useCallback((r: Result) => {
    setResult(r)
    feedback(r.status === 'ok')
    if (r.status === 'ok') refreshStats()
  }, [refreshStats])

  const check = useCallback(async (code: string) => {
    busyRef.current = true
    try {
      const res = await fetch(`/api/scan/${slug}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.status === 401) { onLogout(); return }
      if (!res.ok) throw new Error(d.error ?? 'Erreur')
      show(d as Result)
    } catch (e) {
      show({ status: 'erreur', message: (e as Error).message === 'Failed to fetch' ? 'Pas de connexion internet. Utilisez la recherche par nom dès que le réseau revient.' : (e as Error).message })
    }
  }, [slug, show, onLogout])

  // Camera + lecture du code QR
  useEffect(() => {
    if (mode !== 'scan') return
    let stream: MediaStream | null = null
    let raf = 0
    let stopped = false

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
        const video = videoRef.current!
        video.srcObject = stream
        await video.play()
        tick()
      } catch {
        setCameraError('Caméra indisponible. Autorisez l\'accès à la caméra dans le navigateur, ou utilisez la recherche par nom.')
      }
    }

    function tick() {
      if (stopped) return
      const video = videoRef.current
      const canvas = canvasRef.current
      if (video && canvas && video.readyState >= 2 && !busyRef.current) {
        const w = 480
        const h = Math.round((video.videoHeight / video.videoWidth) * w) || 360
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!
        ctx.drawImage(video, 0, 0, w, h)
        const code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' })
        if (code?.data) {
          const now = Date.now()
          if (code.data !== lastRef.current.code || now - lastRef.current.at > 4000) {
            lastRef.current = { code: code.data, at: now }
            void check(code.data)
          }
        }
      }
      raf = requestAnimationFrame(tick)
    }

    void start()
    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach(t => t.stop())
    }
  }, [mode, check])

  function next() {
    setResult(null)
    busyRef.current = false
  }

  // Passage automatique au suivant apres une entree validee
  useEffect(() => {
    if (result?.status !== 'ok') return
    const t = setTimeout(next, 3500)
    return () => clearTimeout(t)
  }, [result])

  async function logout() {
    await fetch(`/api/scan/${slug}/session`, { method: 'DELETE' }).catch(() => {})
    onLogout()
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-blue-500/15">
        <div className="min-w-0">
          <div className="text-sm font-bold text-blue-400 truncate">{titre}</div>
          <div className="text-xs text-slate-500">Agent : {agent}</div>
        </div>
        <div className="flex items-center gap-3">
          {stats && (
            <div className="text-right" aria-live="polite">
              <div className="text-lg font-bold tabular-nums leading-none">{stats.entres}<span className="text-slate-500 text-sm"> / {stats.attendus}</span></div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">entrés</div>
            </div>
          )}
          <button onClick={logout} aria-label="Se déconnecter" className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"><LogOut className="h-5 w-5" /></button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 p-3">
        <button onClick={() => { setMode('scan'); next() }} className={`rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 ${mode === 'scan' ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-300'}`}>
          <ScanLine className="h-4 w-4" /> Scanner
        </button>
        <button onClick={() => setMode('recherche')} className={`rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 ${mode === 'recherche' ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-300'}`}>
          <Search className="h-4 w-4" /> Rechercher un nom
        </button>
      </div>

      {mode === 'scan' ? (
        <div className="relative flex-1 mx-3 mb-3 rounded-2xl overflow-hidden bg-black min-h-[60vh]">
          <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          {!cameraError && !result && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="h-60 w-60 rounded-3xl border-4 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
              <p className="absolute bottom-6 left-0 right-0 text-center text-sm text-white/90">Placez le code QR du billet dans le cadre</p>
            </div>
          )}
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-3">
              <CameraOff className="h-10 w-10 text-slate-400" />
              <p className="text-sm text-slate-300">{cameraError}</p>
            </div>
          )}
          {result && <ResultPanel result={result} onNext={next} />}
        </div>
      ) : (
        <ManualSearch slug={slug} onResult={r => { show(r); setMode('scan') }} onExpired={onLogout} />
      )}
    </div>
  )
}

function ResultPanel({ result, onNext }: { result: Result; onNext: () => void }) {
  const styles = {
    ok: { bg: 'bg-emerald-600', icon: <CheckCircle2 className="h-16 w-16" />, title: 'ENTRÉE VALIDÉE' },
    deja_entre: { bg: 'bg-orange-600', icon: <AlertTriangle className="h-16 w-16" />, title: 'DÉJÀ ENTRÉ' },
    non_valide: { bg: 'bg-red-600', icon: <XCircle className="h-16 w-16" />, title: 'PAIEMENT NON VALIDÉ' },
    inconnu: { bg: 'bg-red-600', icon: <XCircle className="h-16 w-16" />, title: 'BILLET INCONNU' },
    erreur: { bg: 'bg-slate-700', icon: <AlertTriangle className="h-16 w-16" />, title: 'ERREUR' },
  }[result.status]

  return (
    <button onClick={onNext} className={`absolute inset-0 ${styles.bg} text-white flex flex-col items-center justify-center p-6 text-center`} aria-live="assertive">
      {styles.icon}
      <div className="mt-3 text-3xl font-extrabold tracking-wide">{styles.title}</div>
      {'billet' in result && (
        <>
          <div className="mt-4 text-2xl font-bold">{result.billet.nom}</div>
          <div className="mt-1 text-4xl font-extrabold tabular-nums">{result.billet.nb_personnes} personne{result.billet.nb_personnes > 1 ? 's' : ''}</div>
          <div className="mt-1 text-base text-white/90">{result.billet.detail}</div>
          <div className="mt-1 text-sm text-white/80">Billet {result.billet.billet}</div>
          {result.status === 'deja_entre' && (
            <div className="mt-4 rounded-xl bg-black/20 px-4 py-2 text-base">
              Entré à {heure(result.billet.entre_at)}{result.billet.entre_par ? `, contrôlé par ${result.billet.entre_par}` : ''}
            </div>
          )}
          {result.status === 'non_valide' && <div className="mt-4 text-base">Ce paiement n&apos;a pas été validé. Orientez la personne vers un responsable.</div>}
        </>
      )}
      {result.status === 'inconnu' && <div className="mt-4 text-base">Ce code ne correspond à aucun billet de cet événement.</div>}
      {result.status === 'erreur' && <div className="mt-4 text-base">{result.message}</div>}
      <div className="mt-8 rounded-full bg-white/20 px-6 py-3 text-base font-semibold">Toucher pour continuer</div>
    </button>
  )
}

function ManualSearch({ slug, onResult, onExpired }: { slug: string; onResult: (r: Result) => void; onExpired: () => void }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Billet[]>([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (q.trim().length < 2) return
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/scan/${slug}/recherche?q=${encodeURIComponent(q)}`, { cache: 'no-store' })
        if (res.status === 401) return onExpired()
        const d = await res.json()
        setResults(d.results ?? [])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [q, slug, onExpired])

  const shown = q.trim().length < 2 ? [] : results

  async function admit(id: string) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/scan/${slug}/entree`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.status === 401) return onExpired()
      onResult(await res.json())
    } catch {
      onResult({ status: 'erreur', message: 'Pas de connexion internet.' })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex-1 px-3 pb-6">
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Nom, téléphone ou numéro de billet" autoFocus
        className="input-field w-full rounded-xl px-4 py-3 text-base" aria-label="Rechercher un participant" />
      <p className="mt-2 text-xs text-slate-500">Seuls les participants dont le paiement est validé apparaissent.</p>
      {loading && <Loader2 className="h-5 w-5 animate-spin text-blue-400 mt-4 mx-auto" />}
      <ul className="mt-3 space-y-2">
        {shown.map(b => (
          <li key={b.id} className="rounded-xl glass-card p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{b.nom}</div>
              <div className="text-xs text-slate-400">{b.billet} - {b.nb_personnes} pers. ({b.detail})</div>
              {b.entre_at && <div className="text-xs text-orange-300 mt-0.5">Déjà entré à {heure(b.entre_at)}</div>}
            </div>
            <button disabled={!!b.entre_at || busyId === b.id} onClick={() => admit(b.id)}
              className="shrink-0 rounded-lg bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-400 px-3 py-2 text-sm font-semibold flex items-center gap-1.5">
              <UserCheck className="h-4 w-4" /> Faire entrer
            </button>
          </li>
        ))}
        {q.trim().length >= 2 && !loading && shown.length === 0 && (
          <li className="text-sm text-slate-400 text-center py-6">Aucun participant validé ne correspond.</li>
        )}
      </ul>
    </div>
  )
}
