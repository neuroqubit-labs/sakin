import Link from 'next/link'

const navItems = [
  { href: '/dashboard', label: 'Genel Durum' },
  { href: '/companies', label: 'Şirketler' },
  { href: '/plans', label: 'Planlar' },
]

export default function PlatformDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-72 bg-white shadow-md flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-gray-900">Sakin Platform</h1>
          <p className="text-xs text-gray-500 mt-1">Super Admin</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-4 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  )
}

