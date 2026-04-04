'use client'

import { useState } from 'react'
import { Button } from '@sakin/ui'
import { apiClient } from '@/lib/api'
import type { GenerateDuesDto } from '@sakin/shared'

export default function GenerateDuesPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ created: number; total: number; period: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const dto: GenerateDuesDto = {
      siteId: form.get('siteId') as string,
      periodMonth: parseInt(form.get('periodMonth') as string, 10),
      periodYear: parseInt(form.get('periodYear') as string, 10),
      amount: parseFloat(form.get('amount') as string),
      dueDayOfMonth: parseInt(form.get('dueDayOfMonth') as string, 10),
      description: (form.get('description') as string) || undefined,
    }

    try {
      const res = await apiClient<typeof result>('/dues/generate', {
        method: 'POST',
        body: JSON.stringify(dto),
      })
      setResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Toplu Aidat Oluştur</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Site ID</label>
          <input name="siteId" required className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Ay (1-12)</label>
            <input name="periodMonth" type="number" min={1} max={12} required className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Yıl</label>
            <input name="periodYear" type="number" min={2024} required className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tutar (₺)</label>
            <input name="amount" type="number" step="0.01" required className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Son Ödeme Günü</label>
            <input name="dueDayOfMonth" type="number" min={1} max={28} defaultValue={10} required className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Açıklama (opsiyonel)</label>
          <input name="description" className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {result && (
          <p className="text-sm text-green-600">
            ✓ {result.period} dönemi için {result.created}/{result.total} aidat oluşturuldu
          </p>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Oluşturuluyor...' : 'Aidatları Oluştur'}
        </Button>
      </form>
    </div>
  )
}
