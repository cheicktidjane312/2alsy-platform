'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Lock, Save } from 'lucide-react'
import { StaggerContainer, StaggerItem } from '@/components/ui/Stagger'
import { createClient } from '@/lib/supabase'
import Card, { CardTitle } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { getInitials } from '@/lib/utils'
import type { Profile } from '@/types/database'

interface Props {
  profile: Profile
  email: string
}

export default function ProfilClient({ profile, email }: Props) {
  const router = useRouter()
  const [pseudo, setPseudo] = useState(profile.pseudo)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSavePseudo = async () => {
    if (pseudo.trim().length < 2) return
    setSaving(true)
    setSaveMsg(null)
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({ pseudo: pseudo.trim() }).eq('id', profile.id)
    setSaving(false)
    if (error) {
      setSaveMsg('Une erreur est survenue. Contacte l\'administrateur.')
    } else {
      setSaveMsg('Pseudo mis à jour !')
      router.refresh()
    }
  }

  const handleChangePassword = async () => {
    if (newPw !== confirmPw) {
      setPwMsg({ type: 'error', text: 'Les mots de passe ne correspondent pas' })
      return
    }
    if (newPw.length < 8) {
      setPwMsg({ type: 'error', text: 'Minimum 8 caractères' })
      return
    }
    setPwLoading(true)
    setPwMsg(null)
    const supabase = createClient()

    const { error: reAuthErr } = await supabase.auth.signInWithPassword({ email, password: currentPw })
    if (reAuthErr) {
      setPwLoading(false)
      setPwMsg({ type: 'error', text: 'Mot de passe actuel incorrect' })
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPw })
    setPwLoading(false)
    if (error) {
      setPwMsg({ type: 'error', text: 'Une erreur est survenue. Contacte l\'administrateur.' })
    } else {
      setPwMsg({ type: 'success', text: 'Mot de passe mis à jour !' })
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    }
  }

  return (
    <StaggerContainer className="max-w-lg mx-auto space-y-6">
      <StaggerItem>
        <h1 className="text-2xl font-bold text-blue-400">Mon profil</h1>
      </StaggerItem>

      {/* Avatar + infos */}
      <StaggerItem>
        <Card>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-blue-500/15 border-2 border-blue-500/30 flex items-center justify-center text-2xl font-black text-blue-400">
              {getInitials(profile.pseudo)}
            </div>
            <div>
              <div className="font-bold text-white text-lg">{profile.pseudo}</div>
              <div className="text-sm text-blue-400/60">{profile.code_promo}</div>
              <div className="text-sm text-slate-400">{profile.nom_complet}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
            <div>
              <div className="text-xs text-slate-500">Points totaux</div>
              <div className="font-black text-blue-400 text-xl">{profile.total_points}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Email</div>
              <div className="text-sm text-slate-300 truncate">{email}</div>
            </div>
          </div>

          <div className="space-y-3">
            <CardTitle>Modifier le pseudo</CardTitle>
            <Input
              label="Pseudo"
              value={pseudo}
              onChange={e => setPseudo(e.target.value)}
              icon={<User className="h-4 w-4" />}
              maxLength={30}
            />
            {saveMsg && (
              <p className={`text-xs ${saveMsg.includes('erreur') ? 'text-red-400' : 'text-emerald-400'}`}>{saveMsg}</p>
            )}
            <Button onClick={handleSavePseudo} loading={saving} variant="outline" className="w-full">
              <Save className="h-4 w-4" />
              Sauvegarder
            </Button>
          </div>
        </Card>
      </StaggerItem>

      {/* Change password */}
      <StaggerItem>
        <Card>
          <CardTitle className="mb-4">Changer le mot de passe</CardTitle>
          <div className="space-y-3">
            <Input
              label="Mot de passe actuel"
              type="password"
              value={currentPw}
              onChange={e => setCurrentPw(e.target.value)}
              icon={<Lock className="h-4 w-4" />}
            />
            <Input
              label="Nouveau mot de passe"
              type="password"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              icon={<Lock className="h-4 w-4" />}
              placeholder="Minimum 8 caractères"
            />
            <Input
              label="Confirmer le nouveau mot de passe"
              type="password"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              icon={<Lock className="h-4 w-4" />}
            />
            {pwMsg && (
              <p className={`text-xs ${pwMsg.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>{pwMsg.text}</p>
            )}
            <Button onClick={handleChangePassword} loading={pwLoading} variant="outline" className="w-full">
              Mettre à jour le mot de passe
            </Button>
          </div>
        </Card>
      </StaggerItem>
    </StaggerContainer>
  )
}
