'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Mail, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/validations/inscription'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function MotDePasseOubliePage() {
  const [sent, setSent] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const onSubmit = async (data: ResetPasswordFormData) => {
    setServerError(null)
    const supabase = createClient()

    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-password/exchange`,
    })

    if (error) {
      console.error('[reset-password]', error.message, error.status, error)
      setServerError('Une erreur est survenue. Contacte l\'administrateur.')
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card rounded-2xl p-8 w-full max-w-md text-center"
      >
        <CheckCircle className="h-12 w-12 text-blue-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-blue-400 mb-2">Email envoyé !</h2>
        <p className="text-slate-400 text-sm mb-6">
          Vérifie ta boîte mail et clique sur le lien pour réinitialiser ton mot de passe.
          Le lien est valable 1 heure.
        </p>
        <Link href="/connexion" className="btn-primary px-6 py-2.5 rounded-lg text-sm inline-block">
          Retour à la connexion
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-6 md:p-8 w-full max-w-md"
    >
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-blue-400 tracking-wide">Mot de passe oublié</h1>
        <p className="text-sm text-slate-400 mt-1">Entre ton email pour recevoir un lien de réinitialisation</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="ton@email.com"
          icon={<Mail className="h-4 w-4" />}
          error={errors.email?.message}
          {...register('email')}
        />

        {serverError && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {serverError}
          </div>
        )}

        <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
          Envoyer le lien
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-4">
        <Link href="/connexion" className="text-blue-400 hover:text-blue-300 transition-colors">
          Retour à la connexion
        </Link>
      </p>
    </motion.div>
  )
}
