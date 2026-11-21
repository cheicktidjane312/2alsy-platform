'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Trophy, Menu, X, LogOut, User, BarChart2, Clock, Star, BookOpen } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/store/useAuth'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/dashboard', label: 'Accueil', icon: Trophy },
  { href: '/pronostics', label: 'Pronostics', icon: Star },
  { href: '/classement', label: 'Classement', icon: BarChart2 },
  { href: '/historique', label: 'Historique', icon: Clock },
  { href: '/guide', label: 'Guide', icon: BookOpen },
]

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { profile } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(59,130,246,0.12)] bg-[rgba(10,22,40,0.85)] backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="relative w-8 h-8 flex-shrink-0">
              <Image
                src="/logo-2alsy.png"
                alt="LYSCI"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-blue-400 tracking-widest text-sm">2ALSY CUP</span>
              <div className="text-[10px] text-slate-500 tracking-wider">COUPE DU MONDE 2026</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-blue-400 hover:bg-blue-500/8 transition-all"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
            {profile?.role !== 'member' && (
              <Link
                href="/admin"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-blue-400/70 hover:text-blue-400 hover:bg-blue-500/8 transition-all"
              >
                Admin
              </Link>
            )}
          </nav>

          {/* User actions */}
          <div className="flex items-center gap-2">
            {profile && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/8 border border-blue-500/15">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">
                  {profile.pseudo[0].toUpperCase()}
                </div>
                <div className="text-xs">
                  <span className="text-slate-200 font-medium">{profile.pseudo}</span>
                  <span className="text-blue-400/60 ml-1">{profile.code_promo}</span>
                </div>
                <span className="text-blue-400 font-bold text-xs ml-1">{profile.total_points} pts</span>
              </div>
            )}
            <Link
              href="/profil"
              className="p-2 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/8 transition-colors hidden sm:block"
            >
              <User className="h-4 w-4" />
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors hidden sm:block"
            >
              <LogOut className="h-4 w-4" />
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/8 transition-colors"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-blue-500/12 overflow-hidden bg-[#0A1628]"
          >
            <div className="px-4 py-3 space-y-1">
              {profile && (
                <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-lg bg-blue-500/8 border border-blue-500/15">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                    {profile.pseudo[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{profile.pseudo} <span className="text-blue-400">{profile.code_promo}</span></div>
                    <div className="text-xs text-blue-400">{profile.total_points} points</div>
                  </div>
                </div>
              )}
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-blue-400 hover:bg-blue-500/8 transition-colors"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
              {profile?.role !== 'member' && (
                <Link
                  href="/admin"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-blue-400/70 hover:text-blue-400 hover:bg-blue-500/8 transition-colors"
                >
                  Administration
                </Link>
              )}
              <Link
                href="/profil"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-blue-400 hover:bg-blue-500/8 transition-colors"
              >
                <User className="h-4 w-4" />
                Mon profil
              </Link>
              <button
                onClick={() => { setMenuOpen(false); handleLogout() }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Se déconnecter
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
