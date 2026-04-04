import { Button } from '@sakin/ui'

export default function ResidentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Sakinler</h1>
        <Button>Yeni Sakin Ekle</Button>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500 text-sm">Sakin listesi yükleniyor...</p>
      </div>
    </div>
  )
}
