import { Button } from '@sakin/ui'

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Ödemeler</h1>
        <Button variant="outline">Manuel Ödeme Gir</Button>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500 text-sm">Ödeme geçmişi yükleniyor...</p>
      </div>
    </div>
  )
}
