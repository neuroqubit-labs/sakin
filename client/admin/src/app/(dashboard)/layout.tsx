import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { UserRole, type UserRole as UserRoleType } from '@sakin/shared'
import { decodeSession } from '@/lib/session'
import { DashboardShell } from '@/components/dashboard-shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const session = decodeSession(cookieStore.get('sakin-session')?.value ?? '')
  const role = (session?.role ?? null) as UserRoleType | null

  if (!role || role === UserRole.SUPER_ADMIN) {
    redirect('/login')
  }

  return <DashboardShell role={role}>{children}</DashboardShell>
}
