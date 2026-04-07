'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSiteContext } from '@/providers/site-provider'
import { useAuth } from '@/providers/auth-provider'
import { PaymentCollectModal } from '@/components/payment-collect-modal'

export function WorkTopbar() {
  const { selectedSiteId, setSelectedSiteId, availableSites, hydrated, error } = useSiteContext()
  const { signOut } = useAuth()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [openPaymentModal, setOpenPaymentModal] = useState(false)
  const today = useMemo(
    () => new Intl.DateTimeFormat('tr-TR', { dateStyle: 'full' }).format(new Date()),
    [],
  )

  const selectedSiteName = useMemo(
    () => availableSites.find((site) => site.id === selectedSiteId)?.name ?? 'Bina seçiniz',
    [availableSites, selectedSiteId],
  )

  return (
    <div className="sticky top-0 z-20 mb-6 ledger-glass border-b border-[#c5c6cd]/20 px-4 py-3">
      {error ? (
        <div className="mb-3 rounded-md bg-[#ffdad6] px-3 py-2 text-xs font-medium text-[#93000a]">
          Site context hatası: {error}
        </div>
      ) : null}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#e6e8ea]">
            <span className="text-[10px] font-bold text-[#0c1427]">BLD</span>
            <label htmlFor="site-switcher" className="text-xs font-semibold text-[#4a5563]">
              Aktif Bina
            </label>
          </div>
          <select
            id="site-switcher"
            value={selectedSiteId ?? ''}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            disabled={!hydrated || availableSites.length === 0}
            className="ledger-input min-w-60 bg-white"
          >
            {availableSites.length === 0 ? (
              <option value="">Bina bulunamadı</option>
            ) : (
              availableSites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name} ({site.city})
                </option>
              ))
            )}
          </select>
          <span className="text-xs text-[#5f6a75] hidden md:inline font-medium">{selectedSiteName}</span>
          <span className="text-xs text-[#6b7280] hidden lg:inline">{today}</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <input
              type="text"
              placeholder="Daire veya sakin ara..."
              className="ledger-input w-64 bg-white pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                const q = search.trim()
                router.push(q ? `/work/units?q=${encodeURIComponent(q)}` : '/work/units')
              }}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[#607084]">SRC</span>
          </div>

          <button
            type="button"
            onClick={() => setOpenPaymentModal(true)}
            className="px-4 py-2 text-xs font-bold rounded-md ledger-gradient text-white"
          >
            Ödeme Al
          </button>

          <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-md bg-white">
            <button type="button" className="h-7 w-7 grid place-items-center rounded-md bg-[#eef1f4] text-[10px] text-[#445266]">NT</button>
            <button type="button" className="h-7 w-7 grid place-items-center rounded-md bg-[#eef1f4] text-[10px] text-[#445266]">HP</button>
            <div className="h-7 w-7 rounded-full ledger-gradient text-white text-[11px] font-bold grid place-items-center">OP</div>
          </div>

          <button
            type="button"
            onClick={() => void signOut()}
            className="px-4 py-2 text-xs font-semibold rounded-md bg-[#e6e8ea] text-[#0c1427]"
          >
            Çıkış
          </button>
        </div>
      </div>

      <PaymentCollectModal
        open={openPaymentModal}
        onClose={() => setOpenPaymentModal(false)}
        context={{ siteName: selectedSiteId ? selectedSiteName : undefined }}
      />
    </div>
  )
}
