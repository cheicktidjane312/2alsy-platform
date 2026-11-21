import { notFound } from 'next/navigation'
import { appUrl } from '@/lib/billetterie/config'
import { toPublicEvent } from '@/lib/billetterie/core'
import { getStore } from '@/lib/billetterie/store'
import AdminEventClient from './AdminEventClient'

export const dynamic = 'force-dynamic'

export default async function AdminEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const store = getStore()
  const event = await store.getEventBySlug(slug)
  if (!event) notFound()
  const registrations = await store.listRegistrations(event.id)
  return (
    <AdminEventClient
      event={toPublicEvent(event)}
      pinConfigured={!!event.scan_pin_hash}
      registrations={registrations}
      baseUrl={appUrl()}
    />
  )
}
