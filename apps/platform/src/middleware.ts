import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { UserRole } from '@sakin/shared'

const PUBLIC_PATHS = ['/login', '/favicon.ico']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

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
    if (session.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.redirect(new URL(process.env['NEXT_PUBLIC_ADMIN_URL'] ?? 'http://localhost:3000', request.url))
    }
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

