import { z } from 'zod'

export const pronosticSchema = z.object({
  match_id: z.string().uuid(),
  issue_pronostiquee: z.enum(['domicile', 'exterieur', 'nul']),
  vainqueur_pronostique: z.string().nullable().optional(),
  score_domicile_prono: z.number().int().min(0).max(20),
  score_exterieur_prono: z.number().int().min(0).max(20),
  equipe_premier_but_prono: z.enum(['domicile', 'exterieur', 'aucun']),
})

export type PronosticFormData = z.infer<typeof pronosticSchema>
