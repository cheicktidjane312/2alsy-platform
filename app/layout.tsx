import type { Metadata, Viewport } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'
import NavigationProgress from '@/components/ui/NavigationProgress'

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://2alsy.fierlah-vertex.com'

export const metadata: Metadata = {
  title: '2ALSY CUP - Coupe du Monde 2026',
  description: 'Le jeu de pronostics officiel des Anciens du Lycée Scientifique de Yamoussoukro. Pronostique les matchs de la Coupe du Monde 2026 et grimpe au classement.',
  metadataBase: new URL(APP_URL),
  openGraph: {
    title: '2ALSY CUP - Coupe du Monde 2026',
    description: 'Le jeu de pronostics officiel des Anciens du Lycée Scientifique de Yamoussoukro.',
    url: APP_URL,
    siteName: '2ALSY CUP',
    images: [
      {
        url: '/og-image.png',
        width: 1280,
        height: 673,
        alt: '2ALSY CUP - Coupe du Monde 2026',
      },
    ],
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '2ALSY CUP - Coupe du Monde 2026',
    description: 'Le jeu de pronostics officiel des Anciens du Lycée Scientifique de Yamoussoukro.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/logo-2alsy.png', type: 'image/png' },
    ],
    apple: '/logo-2alsy.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0A1628',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={`${dmSans.variable} h-full`}>
      <body className="h-full bg-[#0A1628] text-white antialiased">
        <NavigationProgress />
        {children}
      </body>
    </html>
  )
}
