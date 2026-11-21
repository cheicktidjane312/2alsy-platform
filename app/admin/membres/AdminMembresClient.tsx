'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, UserX, UserCheck, ArrowLeft } from 'lucide-react'
import { StaggerContainer, StaggerItem } from '@/components/ui/Stagger'
import { createClient } from '@/lib/supabase'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import { getInitials } from '@/lib/utils'
import type { Profile } from '@/types/database'

interface Props {
  membres: Profile[]
  pronoByUser: Record<string, number>
}

export default function AdminMembresClient({ membres, pronoByUser }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const filtered = membres.filter(m => {
    const q = search.toLowerCase()
    return m.pseudo.toLowerCase().includes(q) || m.nom_complet.toLowerCase().includes(q) || m.code_promo.toLowerCase().includes(q)
  })

  const handleToggleActive = async (membre: Profile) => {
    setTogglingId(membre.id)
    const supabase = createClient()
    await supabase.from('profiles').update({ is_active: !membre.is_active }).eq('id', membre.id)
    setTogglingId(null)
    router.refresh()
  }

  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <Link href="/admin" className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-400 transition-colors mb-4 md:hidden">
          <ArrowLeft className="h-4 w-4" />
          Tableau de bord
        </Link>
        <h1 className="text-2xl font-bold text-blue-400">Membres ({membres.length})</h1>
      </StaggerItem>

      <StaggerItem>
        <Input
        placeholder="Rechercher par pseudo, nom ou promo..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        icon={<Search className="h-4 w-4" />}
      />
      </StaggerItem>

      <StaggerItem>
        <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-blue-500/12">
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Membre</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Promo</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Points</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Pronos</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Statut</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(membre => (
                <tr key={membre.id} className="table-row-hover border-b border-white/5 last:border-0">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center text-xs font-bold text-blue-400">
                        {getInitials(membre.pseudo)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{membre.pseudo}</div>
                        <div className="text-xs text-slate-500">{membre.nom_complet}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 hidden sm:table-cell">
                    <span className="text-xs text-blue-400/60">{membre.code_promo}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-bold text-blue-400">{membre.total_points}</span>
                  </td>
                  <td className="py-3 px-4 text-right hidden md:table-cell">
                    <span className="text-sm text-slate-400">{pronoByUser[membre.id] ?? 0}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {membre.is_active
                      ? <Badge variant="open">Actif</Badge>
                      : <Badge variant="closed">Désactivé</Badge>
                    }
                  </td>
                  <td className="py-3 px-4 text-right">
                    {membre.role === 'member' && (
                      <button
                        onClick={() => handleToggleActive(membre)}
                        disabled={togglingId === membre.id}
                        className={`p-2 rounded-lg transition-colors ${
                          membre.is_active
                            ? 'text-red-400/50 hover:text-red-400 hover:bg-red-500/10'
                            : 'text-green-400/50 hover:text-green-400 hover:bg-green-500/10'
                        }`}
                      >
                        {membre.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-10 text-center text-slate-500 text-sm">
              Aucun membre trouvé
            </div>
          )}
        </div>
      </Card>
      </StaggerItem>
    </StaggerContainer>
  )
}
