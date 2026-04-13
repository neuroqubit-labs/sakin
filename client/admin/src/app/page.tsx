import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { decodeSession } from '@/lib/session'

export default async function HomePage() {
  const cookieStore = await cookies()
  const session = decodeSession(cookieStore.get('sakin-session')?.value ?? '')

  if (!session) {
    redirect('/login')
  }

  redirect('/dashboard')
}
