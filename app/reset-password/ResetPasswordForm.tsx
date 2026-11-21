'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Lock, KeyRound, CheckCircle, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import AuroraBackground from '@/components/ui/AuroraBackground'

const schema = z.object({
  password: z.string().min(8, 'Minimum 8 caractères'),
  confirm_password: z.string(),
}).refine(d => d.password === d.confirm_password, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirm_password'],
})

type FormData = z.infer<typeof schema>

export default function ResetPasswordForm({ expired }: { expired?: boolean }) {
  const router = useRouter()
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: data.password })

    if (error) {
      setServerError('Le lien a expiré ou la session est invalide. Redemande un nouveau lien.')
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/dashboard'), 3000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <AuroraBackground />

      {expired && !success && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="glass-card rounded-2xl p-8 w-full max-w-md text-center relative z-10"
        >
          <AlertTriangle className="h-14 w-14 text-orange-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-orange-400 mb-2">Lien expiré ou invalide</h2>
          <p className="text-slate-400 text-sm mb-6">
            Ce lien n'est plus valide. Redemande un nouveau lien de réinitialisation.
          </p>
          <Link href="/mot-de-passe-oublie" className="btn-primary px-6 py-2.5 rounded-lg text-sm inline-block">
            Nouveau lien
          </Link>
        </motion.div>
      )}

      {success && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="glass-card rounded-2xl p-8 w-full max-w-md text-center relative z-10"
        >
          <CheckCircle className="h-14 w-14 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-blue-400 mb-2">Mot de passe modifié !</h2>
          <p className="text-slate-400 text-sm">Redirection vers ton tableau de bord...</p>
        </motion.div>
      )}

      {!expired && !success && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6 md:p-8 w-full max-w-md relative z-10"
        >
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-blue-400 tracking-wide">Nouveau mot de passe</h1>
            <p className="text-sm text-slate-400 mt-1">Choisis un nouveau mot de passe pour ton compte</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Nouveau mot de passe"
              type="password"
              placeholder="Minimum 8 caractères"
              icon={<Lock className="h-4 w-4" />}
              error={errors.password?.message}
              {...register('password')}
            />
            <Input
              label="Confirmer le mot de passe"
              type="password"
              placeholder="Retape ton mot de passe"
              icon={<KeyRound className="h-4 w-4" />}
              error={errors.confirm_password?.message}
              {...register('confirm_password')}
            />

            {serverError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {serverError}
              </div>
            )}

            <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
              Changer mon mot de passe
            </Button>
          </form>
        </motion.div>
      )}
    </div>
  )
}
