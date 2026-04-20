'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiClient } from '@/lib/api'

type PlanType = 'TRIAL' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'

interface PlanSummaryRow {
  planType: PlanType
  tenantCount: number
  activeTenants: number
  totalSmsCredits: number
  totalMaxUnits: number
  avgMaxUnits: number
  expired: number
  expiringIn7Days: number
}

const PLAN_LABELS: Record<PlanType, string> = {
  TRIAL: 'Deneme',
  STARTER: 'Başlangıç',
  PROFESSIONAL: 'Profesyonel',
  ENTERPRISE: 'Kurumsal',
}

const PLAN_DESCRIPTIONS: Record<PlanType, string> = {
  TRIAL: '30 gün deneme · 50 daire · 50 SMS',
  STARTER: 'Küçük firmalar için sınırlı site/daire',
  PROFESSIONAL: 'Büyüyen firmalar · gelişmiş raporlama',
  ENTERPRISE: 'Sınırsız, özel destek',
}

export default function PlansPage() {
  const [rows, setRows] = useState<PlanSummaryRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiClient<PlanSummaryRow[]>('/platform/plans/summary')
        setRows(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Plan verisi alınamadı')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  if (loading) return <p className="text-sm text-gray-500">Plan özeti yükleniyor...</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!rows) return null

  const totals = rows.reduce(
    (acc, r) => ({
      tenantCount: acc.tenantCount + r.tenantCount,
      activeTenants: acc.activeTenants + r.activeTenants,
      totalSmsCredits: acc.totalSmsCredits + r.totalSmsCredits,
      totalMaxUnits: acc.totalMaxUnits + r.totalMaxUnits,
      expired: acc.expired + r.expired,
      expiringIn7Days: acc.expiringIn7Days + r.expiringIn7Days,
    }),
    { tenantCount: 0, activeTenants: 0, totalSmsCredits: 0, totalMaxUnits: 0, expired: 0, expiringIn7Days: 0 },
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Planlar</h1>
        <p className="text-sm text-gray-500 mt-1">
          Plan bazlı tenant dağılımı, lisans durumu ve limit özetleri.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi title="Toplam Tenant" value={totals.tenantCount} hint={`${totals.activeTenants} aktif`} />
        <Kpi title="SMS Kredisi (Toplam)" value={totals.totalSmsCredits.toLocaleString('tr-TR')} />
        <Kpi title="Tanımlı Daire Kapasitesi" value={totals.totalMaxUnits.toLocaleString('tr-TR')} />
        <Kpi
          title="Lisans Uyarıları"
          value={totals.expired + totals.expiringIn7Days}
          hint={`${totals.expired} bitti · ${totals.expiringIn7Days} 7 gün içinde`}
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Plan</th>
              <th className="px-4 py-3 text-right">Tenant</th>
              <th className="px-4 py-3 text-right">Aktif</th>
              <th className="px-4 py-3 text-right">SMS Kredisi</th>
              <th className="px-4 py-3 text-right">Ort. Max Daire</th>
              <th className="px-4 py-3 text-right">Süre Doldu</th>
              <th className="px-4 py-3 text-right">7 Gün İçinde</th>
              <th className="px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={row.planType} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{PLAN_LABELS[row.planType]}</p>
                  <p className="text-xs text-gray-500">{PLAN_DESCRIPTIONS[row.planType]}</p>
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">{row.tenantCount}</td>
                <td className="px-4 py-3 text-right text-gray-700">{row.activeTenants}</td>
                <td className="px-4 py-3 text-right text-gray-700">{row.totalSmsCredits.toLocaleString('tr-TR')}</td>
                <td className="px-4 py-3 text-right text-gray-700">{row.avgMaxUnits}</td>
                <td className="px-4 py-3 text-right">
                  {row.expired > 0 ? (
                    <span className="text-red-700 font-medium">{row.expired}</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {row.expiringIn7Days > 0 ? (
                    <span className="text-amber-700 font-medium">{row.expiringIn7Days}</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/companies?planType=${row.planType}`}
                    className="text-xs px-2 py-1 border rounded hover:bg-gray-100 text-gray-700"
                  >
                    Şirketleri Gör
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-gray-700">Plan Limitleri</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>
            Plan başına limit (daire sayısı, SMS kotası, rapor çeşitliliği) ayarı tenant detayından kayıt bazlı
            yapılabiliyor. Plan bazlı varsayılan limitlerin tanımlandığı genel ayar ekranı Faz 3'te
            eklenecek.
          </p>
          <p className="text-xs text-gray-500">
            Tek tek güncellemek için: Şirketler → Tenant Detayı → Plan bölümü.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function Kpi({ title, value, hint }: { title: string; value: number | string; hint?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-gray-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
      </CardContent>
    </Card>
  )
}
