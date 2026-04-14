import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/providers/auth-provider'
import { QueryProvider } from '@/providers/query-provider'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Wafra | Sakin Yönetim Admin',
  description: 'Wafra Software tarafindan gelistirilen Sakin Yonetim yonetim paneli.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className={`${inter.className} bg-[#f8fbff]`}>
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  )
}
