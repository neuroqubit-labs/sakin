import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { UserRole } from '@sakin/shared'
import { hasRouteAccess } from '@/lib/access-policy'

const PUBLIC_PATHS = ['/login', '/favicon.ico']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Statik dosyalar ve public path'ler geç
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get('sakin-session')

  if (!sessionCookie?.value) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    const session = JSON.parse(atob(sessionCookie.value)) as { role?: UserRole }
    const role = session.role ?? null

    // SUPER_ADMIN yalnızca platform uygulamasına yönlendirilsin.
    if (role === UserRole.SUPER_ADMIN) {
      return NextResponse.redirect(new URL(process.env['NEXT_PUBLIC_PLATFORM_URL'] ?? 'http://localhost:3002', request.url))
    }

    if (!hasRouteAccess(pathname, role)) {
      const fallback = role === UserRole.STAFF ? '/work' : '/dashboard'
      return NextResponse.redirect(new URL(fallback, request.url))
    }
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
