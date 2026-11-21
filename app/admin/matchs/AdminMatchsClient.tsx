'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, Calendar, ArrowLeft } from 'lucide-react'
import { StaggerContainer, StaggerItem } from '@/components/ui/Stagger'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { matchSchema, type MatchFormData } from '@/lib/validations/match'
import { formatMatchTime } from '@/lib/time'
import { getFlagEmoji } from '@/lib/utils'
import Card, { CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import type { Match, Phase } from '@/types/database'

interface Props {
  matchs: (Match & { phase: { nom: string; ordre: number } | null })[]
  phases: Phase[]
}

export default function AdminMatchsClient({ matchs, phases }: Props) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [editMatch, setEditMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<Partial<MatchFormData>>({})

  const phaseOptions = [
    { value: '', label: 'Sélectionner une phase...' },
    ...phases.map(p => ({ value: p.id, label: p.nom })),
  ]

  const openCreate = () => {
    setEditMatch(null)
    setForm({})
    setError(null)
    setModalOpen(true)
  }

  const openEdit = (match: Match) => {
    setEditMatch(match)
    const kickoff = new Date(match.heure_coup_envoi)
    const localISO = new Date(kickoff.getTime() - kickoff.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    setForm({
      phase_id: match.phase_id,
      equipe_domicile: match.equipe_domicile,
      equipe_exterieur: match.equipe_exterieur,
      drapeau_domicile: match.drapeau_domicile ?? undefined,
      drapeau_exterieur: match.drapeau_exterieur ?? undefined,
      heure_coup_envoi: localISO,
    })
    setError(null)
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    setError(null)
    const result = matchSchema.safeParse(form)
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Erreur de validation')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const kickoffUTC = new Date(result.data.heure_coup_envoi).toISOString()

    try {
      if (editMatch) {
        const { error: err } = await supabase.from('matchs').update({
          phase_id: result.data.phase_id,
          equipe_domicile: result.data.equipe_domicile,
          equipe_exterieur: result.data.equipe_exterieur,
          drapeau_domicile: result.data.drapeau_domicile ?? null,
          drapeau_exterieur: result.data.drapeau_exterieur ?? null,
          heure_coup_envoi: kickoffUTC,
        }).eq('id', editMatch.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('matchs').insert({
          phase_id: result.data.phase_id,
          equipe_domicile: result.data.equipe_domicile,
          equipe_exterieur: result.data.equipe_exterieur,
          drapeau_domicile: result.data.drapeau_domicile ?? null,
          drapeau_exterieur: result.data.drapeau_exterieur ?? null,
          heure_coup_envoi: kickoffUTC,
          statut: 'programmé',
        })
        if (err) throw err
      }
      setModalOpen(false)
      router.refresh()
    } catch {
      setError('Une erreur est survenue. Contacte l\'administrateur.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (match: Match) => {
    const supabase = createClient()
    await supabase.from('matchs').update({
      statut: match.statut === 'annulé' ? 'programmé' : 'annulé'
    }).eq('id', match.id)
    router.refresh()
  }

  // Grouper par phase
  const byPhase: Record<string, typeof matchs> = {}
  for (const m of matchs) {
    const key = m.phase?.nom ?? 'Sans phase'
    if (!byPhase[key]) byPhase[key] = []
    byPhase[key].push(m)
  }

  return (
    <StaggerContainer className="space-y-6">
      <StaggerItem>
        <Link href="/admin" className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-400 transition-colors mb-4 md:hidden">
          <ArrowLeft className="h-4 w-4" />
          Tableau de bord
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-400">Gestion des matchs</h1>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouveau match
          </Button>
        </div>
      </StaggerItem>

      {Object.entries(byPhase).map(([phaseName, phaseMatchs]) => (
        <StaggerItem key={phaseName}>
        <Card>
          <CardTitle className="mb-4">{phaseName}</CardTitle>
          <div className="space-y-2">
            {phaseMatchs.map(match => (
              <div
                key={match.id}
                className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span>{getFlagEmoji(match.drapeau_domicile)}</span>
                    <span className="font-medium text-white">{match.equipe_domicile}</span>
                    <span className="text-slate-600">vs</span>
                    <span className="font-medium text-white">{match.equipe_exterieur}</span>
                    <span>{getFlagEmoji(match.drapeau_exterieur)}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{formatMatchTime(match.heure_coup_envoi)}</div>
                </div>
                <Badge variant={match.corrige ? 'corrected' : match.statut === 'annulé' ? 'closed' : 'default'}>
                  {match.corrige ? 'Corrigé' : match.statut}
                </Badge>
                <div className="flex gap-1">
                  {!match.corrige && (
                    <button
                      onClick={() => openEdit(match)}
                      className="p-2 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {!match.corrige && (
                    <button
                      onClick={() => handleToggleStatus(match)}
                      className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
        </StaggerItem>
      ))}

      {matchs.length === 0 && (
        <Card className="text-center py-10">
          <Calendar className="h-8 w-8 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Aucun match programmé. Commencez par en créer un.</p>
        </Card>
      )}

      {/* Modal creation/edition */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editMatch ? 'Modifier le match' : 'Nouveau match'}
      >
        <div className="space-y-4">
          <Select
            label="Phase"
            options={phaseOptions}
            value={form.phase_id ?? ''}
            onChange={e => setForm(f => ({ ...f, phase_id: e.target.value }))}
            error={!form.phase_id ? undefined : undefined}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Équipe domicile"
              placeholder="Ex: France"
              value={form.equipe_domicile ?? ''}
              onChange={e => setForm(f => ({ ...f, equipe_domicile: e.target.value }))}
            />
            <Input
              label="Équipe extérieur"
              placeholder="Ex: Espagne"
              value={form.equipe_exterieur ?? ''}
              onChange={e => setForm(f => ({ ...f, equipe_exterieur: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Code pays dom. (ISO)"
              placeholder="FR, CI, BR..."
              maxLength={2}
              value={form.drapeau_domicile ?? ''}
              onChange={e => setForm(f => ({ ...f, drapeau_domicile: e.target.value.toUpperCase() }))}
            />
            <Input
              label="Code pays ext. (ISO)"
              placeholder="ES, DE, AR..."
              maxLength={2}
              value={form.drapeau_exterieur ?? ''}
              onChange={e => setForm(f => ({ ...f, drapeau_exterieur: e.target.value.toUpperCase() }))}
            />
          </div>
          <Input
            label="Date et heure du coup d'envoi (heure locale)"
            type="datetime-local"
            value={form.heure_coup_envoi ?? ''}
            onChange={e => setForm(f => ({ ...f, heure_coup_envoi: e.target.value }))}
          />

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)} className="flex-1">Annuler</Button>
            <Button onClick={handleSubmit} loading={loading} className="flex-1">
              {editMatch ? 'Sauvegarder' : 'Créer le match'}
            </Button>
          </div>
        </div>
      </Modal>
    </StaggerContainer>
  )
}
