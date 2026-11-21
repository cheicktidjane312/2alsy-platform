import Link from 'next/link'
import { ShieldOff } from 'lucide-react'
import AuroraBackground from '@/components/ui/AuroraBackground'

export default function CompteDesactivePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative animate-page-enter">
      <AuroraBackground />
      <div className="glass-card rounded-2xl p-10 max-w-md w-full text-center relative z-10">
        <ShieldOff className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-red-400 mb-2">Compte désactivé</h1>
        <p className="text-slate-400 text-sm mb-6">
          Ton compte a été désactivé par un administrateur.
          Contacte un administrateur de la 2ALSY CUP pour plus d'informations.
        </p>
        <Link href="/" className="btn-primary px-6 py-2.5 rounded-lg text-sm inline-block">
          Retour à l'accueil
        </Link>
      </div>
    </div>
  )
}
