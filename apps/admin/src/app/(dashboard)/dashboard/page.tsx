import { Card, CardContent, CardHeader, CardTitle } from '@sakin/ui'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Genel Özet</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-gray-600">Toplam Site</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">—</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-gray-600">Bu Ay Tahsilat</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">—</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-gray-600">Gecikmiş Aidat</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">—</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
