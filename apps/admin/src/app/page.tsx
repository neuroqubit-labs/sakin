import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { decodeSession } from '@/lib/session'
import { UserRole } from '@sakin/shared'

export default async function HomePage() {
  const cookieStore = await cookies()
  const session = decodeSession(cookieStore.get('sakin-session')?.value ?? '')

  if (!session) {
    redirect('/login')
  }

  if (session.role === UserRole.STAFF) {
    redirect('/work')
  }

  if (session.role === UserRole.SUPER_ADMIN) {
    redirect(process.env['NEXT_PUBLIC_PLATFORM_URL'] ?? 'http://localhost:3002')
  }

  redirect('/dashboard')
}
