import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(req: NextRequest) {
  // Mode test local de la billetterie (jamais actif en production)
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.BILLETTERIE_TEST_MODE === '1' &&
    req.nextUrl.pathname.startsWith('/admin/billetterie')
  ) {
    return NextResponse.next()
  }

  let res = NextResponse.next({ request: req })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          res = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = req.nextUrl.pathname

  // Protection routes admin
  if (pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/connexion', req.url))
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    const p = profile as { role: string; is_active: boolean } | null
    if (!p || !['admin', 'super_admin'].includes(p.role)) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    if (!p.is_active) {
      return NextResponse.redirect(new URL('/compte-desactive', req.url))
    }
  }

  // Protection routes membres
  const protectedPaths = ['/dashboard', '/pronostics', '/classement', '/historique', '/profil', '/guide']
  if (protectedPaths.some(p => pathname.startsWith(p))) {
    if (!user) {
      return NextResponse.redirect(new URL('/connexion', req.url))
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_active')
      .eq('id', user.id)
      .single()

    const p = profile as { is_active: boolean } | null
    if (p && !p.is_active) {
      return NextResponse.redirect(new URL('/compte-desactive', req.url))
    }
  }

  // Rediriger les utilisateurs connectes vers dashboard
  if ((pathname === '/connexion' || pathname === '/inscription') && user) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/pronostics/:path*',
    '/classement/:path*',
    '/historique/:path*',
    '/profil/:path*',
    '/guide/:path*',
    '/connexion',
    '/inscription',
  ],
}
