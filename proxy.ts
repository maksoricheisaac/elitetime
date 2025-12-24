import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/lib/session'

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

  return NextResponse.next()
}
