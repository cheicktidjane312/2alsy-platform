import { z } from 'zod'

export const inscriptionSchema = z.object({
  code_promo: z
    .string()
    .regex(/^AS(0[1-9]|[1-4][0-9])$/, 'Code promo invalide (format : AS01 à AS49)'),
  pseudo: z.string().min(2, 'Minimum 2 caractères').max(30, 'Maximum 30 caractères'),
  nom_complet: z.string().min(3, 'Minimum 3 caractères').max(100, 'Maximum 100 caractères'),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Minimum 8 caractères'),
  confirm_password: z.string(),
}).refine(data => data.password === data.confirm_password, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirm_password'],
})

export type InscriptionFormData = z.infer<typeof inscriptionSchema>

export const connexionSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

export type ConnexionFormData = z.infer<typeof connexionSchema>

export const resetPasswordSchema = z.object({
  email: z.string().email('Email invalide'),
})

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

export const newPasswordSchema = z.object({
  password: z.string().min(8, 'Minimum 8 caractères'),
  confirm_password: z.string(),
}).refine(data => data.password === data.confirm_password, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirm_password'],
})
