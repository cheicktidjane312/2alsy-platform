import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import AuthProvider from '@/components/layout/AuthProvider'
import AdminMobileNav from '@/components/layout/AdminMobileNav'
import PageTransition from '@/components/ui/PageTransition'
import { LayoutDashboard, Calendar, CheckSquare, Users, Shield, LogOut, BookOpen, Ticket } from 'lucide-react'
import { isTestMode } from '@/lib/billetterie/config'
import type { Profile } from '@/types/database'

export const adminLinks = [
  { href: '/admin', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/admin/matchs', label: 'Matchs', icon: Calendar },
  { href: '/admin/resultats', label: 'Résultats', icon: CheckSquare },
  { href: '/admin/membres', label: 'Membres', icon: Users },
  { href: '/admin/admins', label: 'Admins', icon: Shield },
  { href: '/admin/billetterie', label: 'Billetterie', icon: Ticket },
  { href: '/admin/guide', label: 'Guide admin', icon: BookOpen },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let profile: Pick<Profile, 'role' | 'pseudo'> | null
  if (isTestMode()) {
    // Mode test local uniquement (jamais actif en production)
    profile = { role: 'super_admin', pseudo: 'Admin test' }
  } else {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/connexion')
    const { data } = await supabase.from('profiles').select('role, pseudo').eq('id', user.id).single()
    profile = data as Pick<Profile, 'role' | 'pseudo'> | null
  }

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) redirect('/dashboard')

  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#0A1628] flex">
        {/* Sidebar */}
        <aside className="w-64 hidden md:flex flex-col border-r border-blue-500/12 bg-[#0A1628]">
          <div className="p-4 border-b border-blue-500/12">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center p-1">
                <Image src="/logo-2alsy.png" alt="LYSCI" width={20} height={20} className="object-contain" />
              </div>
              <div>
                <div className="text-xs font-bold text-blue-400 tracking-wider">2ALSY CUP</div>
                <div className="text-[10px] text-slate-500">Administration</div>
              </div>
            </Link>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            {adminLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-blue-400 hover:bg-blue-500/8 transition-all"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="p-3 border-t border-blue-500/12">
            <div className="px-3 py-2 mb-2">
              <div className="text-xs font-semibold text-blue-400">{profile.pseudo}</div>
              <div className="text-[10px] text-slate-500 capitalize">{profile.role.replace('_', ' ')}</div>
            </div>
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-white hover:bg-white/5 transition-all"
            >
              <LogOut className="h-4 w-4" />
              Espace membre
            </Link>
          </div>
        </aside>

        {/* Mobile top bar */}
        <AdminMobileNav pseudo={profile.pseudo} role={profile.role} />

        <main className="flex-1 min-w-0 overflow-auto">
          <div className="md:p-8 p-4 pt-16 md:pt-8 max-w-5xl mx-auto">
            <PageTransition>
              {children}
            </PageTransition>
          </div>
        </main>
      </div>
    </AuthProvider>
  )
}
