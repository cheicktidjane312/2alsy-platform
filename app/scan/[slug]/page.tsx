import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getStore } from '@/lib/billetterie/store'
import ScanClient from './ScanClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Contrôle des entrées | 2ALSY',
  robots: { index: false, follow: false },
}

export const viewport = { themeColor: '#0A1628' }

export default async function ScanPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const event = await getStore().getEventBySlug(slug)
  if (!event) notFound()
  return <ScanClient slug={event.slug} titre={event.titre} />
}
