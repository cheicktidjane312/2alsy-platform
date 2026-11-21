'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, LayoutDashboard, Calendar, CheckSquare, Users, Shield, BookOpen, ArrowLeft, Ticket } from 'lucide-react'

const adminLinks = [
  { href: '/admin', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/admin/matchs', label: 'Matchs', icon: Calendar },
  { href: '/admin/resultats', label: 'Résultats', icon: CheckSquare },
  { href: '/admin/membres', label: 'Membres', icon: Users },
  { href: '/admin/admins', label: 'Admins', icon: Shield },
  { href: '/admin/billetterie', label: 'Billetterie', icon: Ticket },
  { href: '/admin/guide', label: 'Guide admin', icon: BookOpen },
]

interface Props {
  pseudo: string
  role: string
}

export default function AdminMobileNav({ pseudo, role }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#0A1628] border-b border-blue-500/12">
      <div className="flex items-center justify-between px-4 py-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-slate-400 hover:text-blue-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-xs">Espace membre</span>
        </Link>
        <span className="text-sm font-bold text-blue-400">Admin</span>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/8 transition-colors"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-blue-500/12 overflow-hidden bg-[#0A1628]"
          >
            <div className="px-4 py-3 space-y-1">
              <div className="flex items-center gap-3 px-3 py-2.5 mb-2 rounded-lg bg-blue-500/8 border border-blue-500/15">
                <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">
                  {pseudo[0].toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-semibold text-blue-400">{pseudo}</div>
                  <div className="text-[10px] text-slate-500 capitalize">{role.replace('_', ' ')}</div>
                </div>
              </div>
              {adminLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:text-blue-400 hover:bg-blue-500/8 transition-colors"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
