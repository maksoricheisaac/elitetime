import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/lib/session'
import { addSecurityHeaders, validateOrigin, checkRateLimitByIP } from '@/lib/security/headers'

export function proxy(request: NextRequest) {
  const { nextUrl, cookies } = request
  const pathname = nextUrl.pathname

  const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value

  const isAuthPage = pathname === '/login'
  const isDashboardRoute =
    pathname === '/' ||
    pathname.startsWith('/dashboard')

  const legacyPrefixes = ['/employee', '/manager', '/admin']
  const isLegacyRoute = legacyPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  )
  
  // Créer la réponse Next.js
  let response = NextResponse.next()

  // 1️⃣ Redirection des anciennes routes
  if (isLegacyRoute) {
    if (!sessionToken) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // 2️⃣ Protection du dashboard uniquement
  if (!sessionToken && isDashboardRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 3️⃣ Bloquer /login pour utilisateur connecté
  if (sessionToken && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
  // 4️⃣ Sécurité : Valider l'origine en production
  if (process.env.NODE_ENV === 'production') {
    if (!validateOrigin(request)) {
      return new NextResponse('Forbidden', { status: 403 })
    }
  }
  
  // 5️⃣ Sécurité : Rate limiting pour les routes API
  if (pathname.startsWith('/api/')) {
    const rateLimit = checkRateLimitByIP(request, 60, 60000) // 60 requêtes/minute
    
    if (!rateLimit.allowed) {
      return new NextResponse('Too Many Requests', { 
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimit.resetTime! - Date.now()) / 1000).toString(),
        }
      })
    }
  }
  
  // 6️⃣ Sécurité : Protection contre les scans de routes sensibles
  const sensitivePaths = ['/api/admin', '/api/ldap', '/trpc']
  const isSensitivePath = sensitivePaths.some(path => pathname.startsWith(path))
  
  if (isSensitivePath && request.method === 'GET') {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    console.warn(`[Security] Sensitive path access attempt: ${pathname} from ${ip}`)
  }
  
  // 7️⃣ Appliquer les en-têtes de sécurité à toutes les réponses
  response = addSecurityHeaders(response)

  return response
}
