import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { registrationDeadlinePassed, toPublicEvent } from '@/lib/billetterie/core'
import { getStore } from '@/lib/billetterie/store'
import RegistrationForm from './RegistrationForm'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const event = await getStore().getEventBySlug(slug).catch(() => null)
  if (!event) return { title: 'Événement introuvable' }
  const description = `${event.date_label}${event.horaire ? `, ${event.horaire}` : ''} - ${event.lieu}. Inscription et billet en ligne.`
  return {
    title: `${event.titre} - Inscription | 2ALSY`,
    description,
    openGraph: { title: `${event.titre} - 2ALSY`, description, type: 'website' },
  }
}

export const viewport = { themeColor: '#d6246e' }

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const event = await getStore().getEventBySlug(slug)
  if (!event) notFound()

  const closedReason = !event.inscriptions_ouvertes
    ? 'Les inscriptions sont fermées pour cet événement.'
    : registrationDeadlinePassed(event)
      ? 'La date limite d\'inscription est dépassée.'
      : null

  return <RegistrationForm event={toPublicEvent(event)} closedReason={closedReason} />
}
