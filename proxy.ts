import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/lib/session'
import {
  addSecurityHeaders,
  validateOrigin,
  checkRateLimitByIP,
} from '@/lib/security/headers'

export function proxy(request: NextRequest) {
  const { nextUrl, cookies } = request
  const pathname = nextUrl.pathname

  /*
   * =========================================================
   * 🔓 EXEMPTIONS TECHNIQUES NEXT.JS (OBLIGATOIRE)
   * =========================================================
   */
  if (
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt'
  ) {
    return NextResponse.next()
  }

  const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value

  const isAuthPage = pathname === '/login'
  const isDashboardRoute =
    pathname === '/' || pathname.startsWith('/dashboard')

  const isApiRoute = pathname.startsWith('/api/')
  const isAuthApi = pathname === '/api/login'

  const legacyPrefixes = ['/employee', '/manager', '/admin']
  const isLegacyRoute = legacyPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  )

  let response = NextResponse.next()

  /*
   * =========================================================
   * 1️⃣ Redirection anciennes routes
   * =========================================================
   */
  if (isLegacyRoute) {
    if (!sessionToken) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  /*
   * =========================================================
   * 2️⃣ Protection dashboard uniquement
   * =========================================================
   */
  if (!sessionToken && isDashboardRoute) {
    // Rediriger vers /login sans exposer de paramètre `from` dans l'URL
    return NextResponse.redirect(new URL('/login', request.url))
  }

  /*
   * =========================================================
   * 3️⃣ Bloquer /login si déjà connecté
   * =========================================================
   */
  if (sessionToken && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  /*
   * =========================================================
   * 4️⃣ Sécurité ORIGIN (⚠️ PAS pour API)
   * =========================================================
   */
  if (
    process.env.NODE_ENV === 'production' &&
    !isApiRoute &&
    !isAuthApi
  ) {
    if (!validateOrigin(request)) {
      return new NextResponse('Forbidden', { status: 403 })
    }
  }

  /*
   * =========================================================
   * 5️⃣ Rate limiting API
   * =========================================================
   */
  if (isApiRoute) {
    const rateLimit = checkRateLimitByIP(request, 60, 60000)

    if (!rateLimit.allowed) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': Math.ceil(
            (rateLimit.resetTime! - Date.now()) / 1000
          ).toString(),
        },
      })
    }
  }

  /*
   * =========================================================
   * 6️⃣ Détection accès sensibles
   * =========================================================
   */
  const sensitivePaths = ['/api/admin', '/api/ldap', '/trpc']
  if (sensitivePaths.some((p) => pathname.startsWith(p))) {
    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'

    console.warn(
      `[Security] Sensitive access: ${pathname} from ${ip}`
    )
  }

  /*
   * =========================================================
   * 7️⃣ En-têtes de sécurité
   * =========================================================
   */
  response = addSecurityHeaders(response)

  return response
}
