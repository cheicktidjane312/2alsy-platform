'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Mail, Lock, CheckCircle, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { connexionSchema, type ConnexionFormData } from '@/lib/validations/inscription'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

function ConnexionContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [serverError, setServerError] = useState<string | null>(null)

  const confirmed = searchParams.get('confirmed') === '1'
  const linkError = searchParams.get('error') === 'lien_invalide'

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ConnexionFormData>({
    resolver: zodResolver(connexionSchema),
  })

  const onSubmit = async (data: ConnexionFormData) => {
    setServerError(null)
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      if (error.message.includes('Invalid login credentials') || error.message.includes('invalid_credentials')) {
        setServerError('Email ou mot de passe incorrect.')
      } else if (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
        setServerError('Confirme ton email avant de te connecter.')
      } else {
        setServerError('Une erreur est survenue. Contacte l\'administrateur.')
      }
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-6 md:p-8 w-full max-w-md"
    >
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-blue-400 tracking-wide">Connexion</h1>
        <p className="text-sm text-slate-400 mt-1">Accès à ton espace 2ALSY CUP</p>
      </div>

      {confirmed && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          Ton email est confirmé ! Connecte-toi pour accéder à ton espace.
        </div>
      )}

      {linkError && (
        <div className="mb-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          Ce lien est invalide ou expiré. Connecte-toi normalement.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="ton@email.com"
          icon={<Mail className="h-4 w-4" />}
          error={errors.email?.message}
          autoComplete="email"
          {...register('email')}
        />
        <div>
          <Input
            label="Mot de passe"
            type="password"
            placeholder="Ton mot de passe"
            icon={<Lock className="h-4 w-4" />}
            error={errors.password?.message}
            autoComplete="current-password"
            {...register('password')}
          />
          <div className="flex justify-end mt-1.5">
            <Link href="/mot-de-passe-oublie" className="text-xs text-blue-400/60 hover:text-blue-400 transition-colors">
              Mot de passe oublié ?
            </Link>
          </div>
        </div>

        {serverError && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {serverError}
          </div>
        )}

        <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
          Se connecter
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-4">
        Pas encore membre ?{' '}
        <Link href="/inscription" className="text-blue-400 hover:text-blue-300 transition-colors">
          S'inscrire
        </Link>
      </p>
    </motion.div>
  )
}

export default function ConnexionPage() {
  return (
    <Suspense fallback={null}>
      <ConnexionContent />
    </Suspense>
  )
}
