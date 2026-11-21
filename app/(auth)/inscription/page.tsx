'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { User, Mail, Lock, KeyRound, BadgeCheck, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { inscriptionSchema, type InscriptionFormData } from '@/lib/validations/inscription'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function InscriptionPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<InscriptionFormData>({
    resolver: zodResolver(inscriptionSchema),
  })

  const onSubmit = async (data: InscriptionFormData) => {
    setServerError(null)
    const supabase = createClient()

    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        data: {
          pseudo: data.pseudo,
          nom_complet: data.nom_complet,
          code_promo: data.code_promo.toUpperCase(),
        },
      },
    })

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        setServerError('Cet email est déjà utilisé. Connecte-toi.')
      } else {
        setServerError('Une erreur est survenue. Contacte l\'administrateur.')
      }
      return
    }

    if (signUpData.user && signUpData.user.identities?.length === 0) {
      setServerError('Cet email est déjà associé à un compte. Connecte-toi ou réinitialise ton mot de passe.')
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card rounded-2xl p-8 w-full max-w-md text-center"
      >
        <CheckCircle className="h-14 w-14 text-emerald-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-blue-400 mb-2">Inscription réussie !</h2>
        <p className="text-slate-400 text-sm mb-6">
          Un email de confirmation t'a été envoyé. Clique sur le lien pour activer ton compte.
        </p>
        <Link href="/connexion" className="btn-primary px-6 py-2.5 rounded-lg text-sm inline-block">
          Se connecter
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
        <h1 className="text-2xl font-bold text-blue-400 tracking-wide">Rejoindre la 2ALSY CUP</h1>
        <p className="text-sm text-slate-400 mt-1">Inscris-toi pour pronostiquer</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Code promo AS"
          placeholder="AS01, AS12, AS49..."
          icon={<BadgeCheck className="h-4 w-4" />}
          error={errors.code_promo?.message}
          {...register('code_promo')}
        />
        <Input
          label="Pseudo"
          placeholder="Ton pseudo dans l'app"
          icon={<User className="h-4 w-4" />}
          error={errors.pseudo?.message}
          {...register('pseudo')}
        />
        <Input
          label="Nom complet"
          placeholder="Prénom Nom"
          icon={<User className="h-4 w-4" />}
          error={errors.nom_complet?.message}
          {...register('nom_complet')}
        />
        <Input
          label="Email"
          type="email"
          placeholder="ton@email.com"
          icon={<Mail className="h-4 w-4" />}
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Mot de passe"
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
          Créer mon compte
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-4">
        Déjà membre ?{' '}
        <Link href="/connexion" className="text-blue-400 hover:text-blue-300 transition-colors">
          Se connecter
        </Link>
      </p>
    </motion.div>
  )
}
