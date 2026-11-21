'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, UserMinus, Info, ArrowLeft } from 'lucide-react'
import { StaggerContainer, StaggerItem } from '@/components/ui/Stagger'
import { createClient } from '@/lib/supabase'
import Card, { CardTitle } from '@/components/ui/Card'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import { getInitials } from '@/lib/utils'
import type { Profile } from '@/types/database'

interface Props {
  admins: Profile[]
  currentUserId: string
}

export default function AdminAdminsClient({ admins, currentUserId }: Props) {
  const router = useRouter()
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleDemote = async (profile: Profile) => {
    if (profile.id === currentUserId) {
      setMessage({ type: 'error', text: 'Vous ne pouvez pas vous retirer les droits admin.' })
      return
    }
    setUpdatingId(profile.id)
    setMessage(null)
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({ role: 'member' }).eq('id', profile.id)
    setUpdatingId(null)
    if (error) {
      setMessage({ type: 'error', text: 'Une erreur est survenue. Contacte l\'administrateur.' })
    } else {
      setMessage({ type: 'success', text: `${profile.pseudo} n'est plus administrateur.` })
      router.refresh()
    }
  }

  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <Link href="/admin" className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-400 transition-colors mb-4 md:hidden">
          <ArrowLeft className="h-4 w-4" />
          Tableau de bord
        </Link>
        <h1 className="text-2xl font-bold text-blue-400">Gestion des admins</h1>
        <p className="text-sm text-slate-500 mt-1">Visualiser et gérer les droits d'administrateur</p>
      </StaggerItem>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
          {message.text}
        </div>
      )}

      {/* Admins actuels */}
      <StaggerItem>
      <Card>
        <CardTitle className="mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Administrateurs actuels ({admins.length})
        </CardTitle>
        <div className="space-y-2">
          {admins.map(admin => (
            <div key={admin.id} className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
              <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center text-xs font-bold text-blue-400">
                {getInitials(admin.pseudo)}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-white">{admin.pseudo} <span className="text-blue-400/50">{admin.code_promo}</span></div>
                <div className="text-xs text-slate-500">{admin.nom_complet}</div>
              </div>
              <Badge variant={admin.role === 'super_admin' ? 'corrected' : 'default'}>
                {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
              </Badge>
              {admin.role === 'admin' && admin.id !== currentUserId && (
                <button
                  onClick={() => handleDemote(admin)}
                  disabled={updatingId === admin.id}
                  className="p-2 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  <UserMinus className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>
      </StaggerItem>

      {/* Notice ajout admin */}
      <StaggerItem>
      <GlassCard className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center flex-shrink-0">
            <Info size={20} className="text-blue-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold mb-2">Ajouter un administrateur</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              L'ajout d'un nouvel administrateur est réservé au super administrateur.
              Contacte le responsable technique pour toute demande de promotion.
            </p>
          </div>
        </div>
      </GlassCard>
      </StaggerItem>
    </StaggerContainer>
  )
}
