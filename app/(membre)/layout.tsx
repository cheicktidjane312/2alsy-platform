import Header from '@/components/layout/Header'
import AuthProvider from '@/components/layout/AuthProvider'
import AuroraBackground from '@/components/ui/AuroraBackground'
import PageTransition from '@/components/ui/PageTransition'

export default function MembreLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col relative">
        <AuroraBackground />
        <Header />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
          <PageTransition>
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
    </AuthProvider>
  )
}
