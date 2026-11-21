import Link from 'next/link'
import Image from 'next/image'
import { Trophy, Users, Zap, Target, Clock, BarChart2 } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import AuroraBackground from '@/components/ui/AuroraBackground'

async function getStats() {
  try {
    const supabase = await createServerSupabaseClient()
    const [{ count: membres }, { count: pronostics }, { data: leader }] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('pronostics').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('pseudo, total_points').eq('is_active', true).order('total_points', { ascending: false }).limit(1).single(),
    ])
    return { membres: membres ?? 0, pronostics: pronostics ?? 0, leader: leader ?? null }
  } catch {
    return { membres: 0, pronostics: 0, leader: null }
  }
}

export default async function LandingPage() {
  const stats = await getStats()

  return (
    <div className="min-h-screen flex flex-col relative animate-page-enter">
      <AuroraBackground />

      {/* Header minimal */}
      <header className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(30,64,175,0.2)] border border-[rgba(59,130,246,0.3)] flex items-center justify-center p-1.5">
            <Image
              src="/logo-2alsy.png"
              alt="LYSCI"
              width={28}
              height={28}
              className="object-contain"
            />
          </div>
          <span className="font-bold text-blue-400 tracking-widest text-sm hidden sm:block">2ALSY CUP</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/connexion"
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-blue-400 transition-colors"
          >
            Se connecter
          </Link>
          <Link
            href="/inscription"
            className="btn-primary px-4 py-2 text-sm rounded-lg"
          >
            Rejoindre
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          {/* Logo central */}
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-[rgba(30,64,175,0.15)] border border-[rgba(59,130,246,0.25)] flex items-center justify-center p-3 accent-glow">
              <Image
                src="/logo-2alsy.png"
                alt="LYSCI"
                width={72}
                height={72}
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-sm font-medium mb-6">
            <Trophy className="h-4 w-4" />
            Coupe du Monde 2026
          </div>

          {/* Titre */}
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-4">
            <span className="text-blue-400">2ALSY</span>
            <span className="text-white"> CUP</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 mb-4">
            Le jeu de pronostics officiel des Anciens du Lycée Scientifique de Yamoussoukro
          </p>
          <p className="text-sm text-blue-400/60 mb-10">
            Pronostique les matchs, accumule des points, grimpe au classement
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/inscription"
              className="btn-primary px-8 py-3.5 text-base rounded-xl w-full sm:w-auto font-semibold"
            >
              Rejoindre la compétition
            </Link>
            <Link
              href="/connexion"
              className="px-8 py-3.5 text-base rounded-xl border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:border-blue-400/60 transition-all w-full sm:w-auto font-medium"
            >
              Se connecter
            </Link>
          </div>
        </div>

        {/* Stats live */}
        <div className="mt-16 grid grid-cols-3 gap-4 md:gap-8 max-w-lg mx-auto w-full">
          <div className="glass-card rounded-xl p-4 text-center">
            <div className="flex justify-center mb-2">
              <Users className="h-5 w-5 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white">{stats.membres}</div>
            <div className="text-xs text-slate-500 mt-1">Participants</div>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <div className="flex justify-center mb-2">
              <Zap className="h-5 w-5 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white">{stats.pronostics}</div>
            <div className="text-xs text-slate-500 mt-1">Pronostics</div>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <div className="flex justify-center mb-2">
              <Trophy className="h-5 w-5 text-blue-400" />
            </div>
            <div className="text-lg font-black text-white truncate">{(stats.leader as { pseudo?: string } | null)?.pseudo ?? '-'}</div>
            <div className="text-xs text-slate-500 mt-1">Leader</div>
          </div>
        </div>

        {/* Comment jouer */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto w-full text-left">
          <div className="glass-card rounded-xl p-5">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3">
              <Target className="h-5 w-5 text-blue-400" />
            </div>
            <h3 className="font-bold text-white text-sm mb-1">15 pts max par match</h3>
            <p className="text-xs text-slate-400">Issue (2) + Vainqueur (3) + Score exact (6) + 1er but (4)</p>
          </div>
          <div className="glass-card rounded-xl p-5">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3">
              <Clock className="h-5 w-5 text-blue-400" />
            </div>
            <h3 className="font-bold text-white text-sm mb-1">Pronostic live</h3>
            <p className="text-xs text-slate-400">Jusqu'à la mi-temps avec malus progressif sur les retards</p>
          </div>
          <div className="glass-card rounded-xl p-5">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3">
              <BarChart2 className="h-5 w-5 text-blue-400" />
            </div>
            <h3 className="font-bold text-white text-sm mb-1">Classement par phase</h3>
            <p className="text-xs text-slate-400">Classement général + par phase de la compétition</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-blue-500/8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 text-center">
            <span className="font-semibold tracking-wide">2ALSY CUP 2026</span>
            <span className="text-slate-700">-</span>
            <span className="italic">2ALSY - Les aînés au service des cadets - L'excellence notre passion !</span>
          </div>
          <a
            href="https://fierlah-vertex.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 group"
          >
            <span className="text-xs text-slate-600 group-hover:text-blue-400/60 transition-colors">Réalisé par</span>
            <span className="text-sm font-bold text-blue-400/40 group-hover:text-blue-400 transition-colors tracking-wide">FIERLAH Vertex</span>
          </a>
        </div>
      </footer>
    </div>
  )
}
