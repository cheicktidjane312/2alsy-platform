import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const error = searchParams.get('error')
  const errorCode = searchParams.get('error_code')

  // Erreur renvoyée par Supabase (lien expiré / déjà utilisé)
  if (error || errorCode) {
    return NextResponse.redirect(new URL('/connexion?error=lien_invalide', origin))
  }

  if (code) {
    const response = NextResponse.redirect(new URL(next, origin))

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (!exchangeError) {
      // Session établie → connecté et redirigé vers `next`
      return response
    }

    // L'échange a échoué (souvent : lien ouvert dans un autre navigateur que
    // celui de l'inscription, donc pas de code_verifier). L'email est malgré
    // tout confirmé côté Supabase à l'étape /verify. On invite à se connecter.
    console.error('[auth/callback] exchangeCodeForSession failed:', exchangeError.message)
    return NextResponse.redirect(new URL('/connexion?confirmed=1', origin))
  }

  // Pas de code et pas d'erreur : rien à traiter
  return NextResponse.redirect(new URL('/connexion', origin))
}
