import Link from 'next/link'
import { Button } from '@sakin/ui'

export default function DuesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Aidatlar</h1>
        <Link href="/dues/generate">
          <Button>Toplu Aidat Oluştur</Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500 text-sm">Aidat listesi yükleniyor...</p>
      </div>
    </div>
  )
}
