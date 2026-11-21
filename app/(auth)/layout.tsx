import Link from 'next/link'
import Image from 'next/image'
import AuroraBackground from '@/components/ui/AuroraBackground'
import PageTransition from '@/components/ui/PageTransition'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col relative">
      <AuroraBackground />
      <header className="flex items-center justify-center px-6 py-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative w-8 h-8">
            <Image src="/logo-2alsy.png" alt="LYSCI" width={32} height={32} className="object-contain" />
          </div>
          <span className="font-bold text-blue-400 tracking-widest text-sm">2ALSY CUP</span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <PageTransition className="w-full flex items-center justify-center">
          {children}
        </PageTransition>
      </main>
      <footer className="py-5 border-t border-blue-500/8">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 px-6">
          <span className="text-xs text-slate-500 font-semibold tracking-wide">2ALSY CUP 2026</span>
          <span className="text-slate-700 hidden sm:block">-</span>
          <span className="text-xs text-slate-500 italic">2ALSY - Les aînés au service des cadets - L'excellence notre passion !</span>
          <span className="text-slate-700 hidden sm:block">-</span>
          <a
            href="https://fierlah-vertex.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 group"
          >
            <span className="text-xs text-slate-600 group-hover:text-blue-400/60 transition-colors">Réalisé par</span>
            <span className="text-xs font-bold text-blue-400/40 group-hover:text-blue-400 transition-colors tracking-wide">FIERLAH Vertex</span>
          </a>
        </div>
      </footer>
    </div>
  )
}
