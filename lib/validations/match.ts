import { z } from 'zod'

export const matchSchema = z.object({
  phase_id: z.string().uuid('Phase requise'),
  equipe_domicile: z.string().min(2, 'Équipe domicile requise').max(50),
  equipe_exterieur: z.string().min(2, 'Équipe extérieur requise').max(50),
  drapeau_domicile: z.string().length(2).nullable().optional(),
  drapeau_exterieur: z.string().length(2).nullable().optional(),
  heure_coup_envoi: z.string().min(1, 'Heure du coup d\'envoi requise'),
})

export type MatchFormData = z.infer<typeof matchSchema>

export const resultatSchema = z.object({
  score_domicile: z.number().int().min(0).max(20),
  score_exterieur: z.number().int().min(0).max(20),
  equipe_premier_but: z.enum(['domicile', 'exterieur', 'aucun']),
})

export type ResultatFormData = z.infer<typeof resultatSchema>
