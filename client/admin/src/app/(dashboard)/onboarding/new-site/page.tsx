'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Download,
  FileText,
  Layers,
  Plus,
  Trash2,
  Upload,
  Users,
  Wand2,
} from 'lucide-react'
import {
  CreateSiteSchema,
  UnitType,
  ResidentType,
  type CreateSiteDto,
  type BulkCreateUnitsDto,
  type GenerateDuesDto,
} from '@sakin/shared'
import { apiClient } from '@/lib/api'
import { useApiMutation } from '@/hooks/use-api'
import { useSiteContext } from '@/providers/site-provider'
import { toastSuccess, toastError } from '@/lib/toast'
import { PageHeader, SectionTitle } from '@/components/surface'
import { Breadcrumb } from '@/components/breadcrumb'
import { Button } from '@/components/ui/button'

type WizardStep = 1 | 2 | 3

interface SitePayload extends CreateSiteDto {
  blocks: Array<{ name: string; floorsPerBlock: number; unitsPerFloor: number }>
  unitNumberingScheme: 'FLOOR_PREFIX' | 'SEQUENTIAL' | 'BLOCK_FLOOR'
}

interface DryRunRow {
  rowIndex: number
  raw: string
  valid: boolean
  normalized: {
    firstName: string
    lastName: string
    email?: string
    phoneNumber: string
    tckn?: string
    type: ResidentType
  } | null
  errors: string[]
}

interface DryRunResponse {
  summary: { totalRows: number; validRows: number; invalidRows: number }
  preview: DryRunRow[]
  exceededPreviewLimit: boolean
}

const CSV_TEMPLATE = [
  'firstName,lastName,email,phoneNumber,tckn,type,site,unit',
  'Ahmet,Yılmaz,ahmet@example.com,5551234567,12345678901,OWNER,Güneş Apartmanı,1',
  'Ayşe,Demir,,5559876543,,TENANT,Güneş Apartmanı,2',
].join('\n')

export default function OnboardingWizardPage() {
  const router = useRouter()
  const { refresh: refreshSites, setSelectedSiteId } = useSiteContext()
  const [step, setStep] = useState<WizardStep>(1)

  // Step 1 — site plan state
  const [siteForm, setSiteForm] = useState<SitePayload>({
    name: '',
    address: '',
    city: '',
    district: '',
    totalUnits: 0,
    hasBlocks: false,
    blocks: [{ name: 'A', floorsPerBlock: 5, unitsPerFloor: 4 }],
    unitNumberingScheme: 'SEQUENTIAL',
  })
  const [createdSiteId, setCreatedSiteId] = useState<string | null>(null)
  const [createdUnitCount, setCreatedUnitCount] = useState(0)
  const [step1Submitting, setStep1Submitting] = useState(false)

  // Step 2 — residents state
  const [importMode, setImportMode] = useState<'csv' | 'skip'>('csv')
  const [csvText, setCsvText] = useState('')
  const [dryRun, setDryRun] = useState<DryRunResponse | null>(null)
  const [dryRunLoading, setDryRunLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importedCount, setImportedCount] = useState(0)

  // Step 3 — dues state
  const [duesAmount, setDuesAmount] = useState<string>('')
  const [duesDay, setDuesDay] = useState<string>('10')
  const [skipDues, setSkipDues] = useState(false)

  const plannedUnits = useMemo(() => {
    if (!siteForm.hasBlocks) {
      return siteForm.totalUnits
    }
    return siteForm.blocks.reduce(
      (sum, b) => sum + (b.floorsPerBlock || 0) * (b.unitsPerFloor || 0),
      0,
    )
  }, [siteForm])

  const step1Valid = useMemo(() => {
    const base = CreateSiteSchema.safeParse({
      name: siteForm.name,
      address: siteForm.address,
      city: siteForm.city,
      district: siteForm.district || undefined,
      totalUnits: Math.max(plannedUnits, 1),
      hasBlocks: siteForm.hasBlocks,
    })
    if (!base.success) return false
    if (siteForm.hasBlocks && siteForm.blocks.some((b) => !b.name.trim() || b.floorsPerBlock < 1 || b.unitsPerFloor < 1)) {
      return false
    }
    return plannedUnits > 0
  }, [siteForm, plannedUnits])

  async function handleStep1Submit() {
    if (!step1Valid || step1Submitting) return
    setStep1Submitting(true)

    try {
      const createRes = await apiClient<{ id: string }>('/sites', {
        method: 'POST',
        body: JSON.stringify({
          name: siteForm.name.trim(),
          address: siteForm.address.trim(),
          city: siteForm.city.trim(),
          district: siteForm.district?.trim() || undefined,
          totalUnits: plannedUnits,
          hasBlocks: siteForm.hasBlocks,
        }),
      })

      const siteId = createRes.id
      let totalCreated = 0

      if (siteForm.hasBlocks) {
        for (const block of siteForm.blocks) {
          const blockRes = await apiClient<{ id: string }>(`/sites/${siteId}/blocks`, {
            method: 'POST',
            body: JSON.stringify({
              name: block.name.trim(),
              totalUnits: block.floorsPerBlock * block.unitsPerFloor,
            }),
          })

          const bulkPayload: BulkCreateUnitsDto = {
            items: Array.from({ length: block.floorsPerBlock }, (_, floorIdx) => ({
              type: UnitType.APARTMENT,
              count: block.unitsPerFloor,
              blockId: blockRes.id,
              numberingPrefix: siteForm.unitNumberingScheme === 'BLOCK_FLOOR'
                ? `${block.name}${floorIdx + 1}`
                : siteForm.unitNumberingScheme === 'FLOOR_PREFIX'
                  ? `${floorIdx + 1}`
                  : undefined,
              numberingStart: siteForm.unitNumberingScheme === 'FLOOR_PREFIX'
                ? 1
                : siteForm.unitNumberingScheme === 'BLOCK_FLOOR'
                  ? 1
                  : floorIdx * block.unitsPerFloor + 1,
              floorStart: floorIdx + 1,
            })),
          }

          const bulkRes = await apiClient<{ created: number }>(
            `/sites/${siteId}/units/bulk`,
            { method: 'POST', body: JSON.stringify(bulkPayload) },
          )
          totalCreated += bulkRes.created
        }
      } else {
        const bulkPayload: BulkCreateUnitsDto = {
          items: [
            {
              type: UnitType.APARTMENT,
              count: plannedUnits,
              numberingStart: 1,
            },
          ],
        }
        const bulkRes = await apiClient<{ created: number }>(
          `/sites/${siteId}/units/bulk`,
          { method: 'POST', body: JSON.stringify(bulkPayload) },
        )
        totalCreated = bulkRes.created
      }

      setCreatedSiteId(siteId)
      setCreatedUnitCount(totalCreated)
      setSelectedSiteId(siteId)
      await refreshSites()
      toastSuccess(`Site ve ${totalCreated} daire oluşturuldu`)
      setStep(2)
    } catch (err) {
      toastError(err instanceof Error ? err : 'Site oluşturulamadı')
    } finally {
      setStep1Submitting(false)
    }
  }

  async function handleDryRun() {
    if (!csvText.trim()) {
      toastError('Yüklenecek CSV içeriği yok')
      return
    }
    setDryRunLoading(true)
    try {
      const res = await apiClient<DryRunResponse>('/residents/import/dry-run', {
        method: 'POST',
        body: JSON.stringify({ csv: csvText }),
      })
      setDryRun(res)
    } catch (err) {
      toastError(err instanceof Error ? err : 'CSV önizleme başarısız')
    } finally {
      setDryRunLoading(false)
    }
  }

  async function handleImportCommit() {
    if (!dryRun || dryRun.summary.validRows === 0) return
    setImportLoading(true)
    try {
      const res = await apiClient<{ summary: { createdCount: number } }>(
        '/residents/import/commit',
        {
          method: 'POST',
          body: JSON.stringify({ csv: csvText, skipInvalid: true }),
        },
      )
      setImportedCount(res.summary.createdCount)
      toastSuccess(`${res.summary.createdCount} sakin kaydedildi`)
      setStep(3)
    } catch (err) {
      toastError(err instanceof Error ? err : 'Aktarım başarısız')
    } finally {
      setImportLoading(false)
    }
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'sakinler-sablon.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function handleFileUpload(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result
      if (typeof text === 'string') {
        setCsvText(text)
        setDryRun(null)
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  const duesGenMutation = useApiMutation<{ generated: number }, GenerateDuesDto>('/dues/generate', {
    onSuccess: (res) => {
      toastSuccess(`${res.generated} daire için aidat oluşturuldu`)
      finishWizard()
    },
  })

  function handleStep3Submit() {
    if (skipDues) {
      finishWizard()
      return
    }
    if (!createdSiteId) return
    const amount = Number(duesAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      toastError('Aidat tutarı geçerli olmalı')
      return
    }
    const day = Number(duesDay)
    const now = new Date()
    duesGenMutation.mutate({
      siteId: createdSiteId,
      periodMonth: now.getMonth() + 1,
      periodYear: now.getFullYear(),
      amount,
      currency: 'TRY',
      type: 'AIDAT' as GenerateDuesDto['type'],
      dueDayOfMonth: Number.isFinite(day) ? day : 10,
    })
  }

  function finishWizard() {
    if (createdSiteId) {
      router.push(`/sites/${createdSiteId}`)
    } else {
      router.push('/sites')
    }
  }

  return (
    <div className="space-y-6 motion-in">
      <Breadcrumb
        items={[
          { label: 'Portföy', href: '/sites' },
          { label: 'Yeni Site Sihirbazı' },
        ]}
      />

      <PageHeader
        title="Yeni Site Sihirbazı"
        eyebrow="Hızlı Onboarding"
        subtitle="Yeni bir binayı site, daireler ve sakinleriyle birlikte dakikalar içinde sisteme alın."
      />

      <WizardStepper currentStep={step} createdSite={!!createdSiteId} imported={importedCount > 0} />

      {step === 1 && (
        <Step1SitePlan
          form={siteForm}
          setForm={setSiteForm}
          plannedUnits={plannedUnits}
          canSubmit={step1Valid}
          submitting={step1Submitting}
          onSubmit={handleStep1Submit}
        />
      )}

      {step === 2 && createdSiteId && (
        <Step2Residents
          createdUnitCount={createdUnitCount}
          mode={importMode}
          setMode={setImportMode}
          csvText={csvText}
          setCsvText={(t) => { setCsvText(t); setDryRun(null) }}
          dryRun={dryRun}
          dryRunLoading={dryRunLoading}
          importLoading={importLoading}
          onDryRun={handleDryRun}
          onCommit={handleImportCommit}
          onTemplate={downloadTemplate}
          onFile={handleFileUpload}
          onBack={() => setStep(1)}
          onSkip={() => setStep(3)}
        />
      )}

      {step === 3 && createdSiteId && (
        <Step3Dues
          duesAmount={duesAmount}
          setDuesAmount={setDuesAmount}
          duesDay={duesDay}
          setDuesDay={setDuesDay}
          skipDues={skipDues}
          setSkipDues={setSkipDues}
          submitting={duesGenMutation.isPending}
          onBack={() => setStep(2)}
          onSubmit={handleStep3Submit}
          summary={{
            unitCount: createdUnitCount,
            residentCount: importedCount,
          }}
        />
      )}
    </div>
  )
}

function WizardStepper({ currentStep, createdSite, imported }: { currentStep: WizardStep; createdSite: boolean; imported: boolean }) {
  const steps = [
    { n: 1 as const, label: 'Bina Planı', icon: Building2, done: createdSite || currentStep > 1 },
    { n: 2 as const, label: 'Sakin Yükle', icon: Users, done: imported || currentStep > 2 },
    { n: 3 as const, label: 'İlk Aidat', icon: Wand2, done: false },
  ]

  return (
    <div className="ledger-panel p-4">
      <div className="flex items-center gap-2">
        {steps.map((s, idx) => {
          const Icon = s.icon
          const isActive = currentStep === s.n
          const isDone = s.done
          return (
            <div key={s.n} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-colors ${
                  isActive
                    ? 'border-[#4f7df7]/40 bg-[linear-gradient(135deg,#12203a,#1d3b67,#4f7df7)] text-white shadow-[0_14px_28px_rgba(79,125,247,0.22)]'
                    : isDone
                      ? 'border-[#bce5cd] bg-[#eafaf1] text-[#0e7a52]'
                      : 'border-[#dce7f6] bg-white text-[#8b9bb0]'
                }`}
              >
                {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <div>
                <p className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${isActive ? 'text-[#4f7df7]' : 'text-[#8b9bb0]'}`}>
                  Adım {s.n}
                </p>
                <p className={`text-sm font-semibold ${isActive ? 'text-[#0c1427]' : 'text-[#63758d]'}`}>
                  {s.label}
                </p>
              </div>
              {idx < steps.length - 1 && (
                <div className={`mx-2 h-px flex-1 ${isDone ? 'bg-[#bce5cd]' : 'bg-[#e5e7eb]'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Step1SitePlan({
  form,
  setForm,
  plannedUnits,
  canSubmit,
  submitting,
  onSubmit,
}: {
  form: SitePayload
  setForm: (update: SitePayload | ((prev: SitePayload) => SitePayload)) => void
  plannedUnits: number
  canSubmit: boolean
  submitting: boolean
  onSubmit: () => void
}) {
  const update = (patch: Partial<SitePayload>) => setForm((prev) => ({ ...prev, ...patch }))

  const addBlock = () => {
    setForm((prev) => ({
      ...prev,
      blocks: [...prev.blocks, { name: String.fromCharCode(65 + prev.blocks.length), floorsPerBlock: 5, unitsPerFloor: 4 }],
    }))
  }
  const removeBlock = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      blocks: prev.blocks.length === 1 ? prev.blocks : prev.blocks.filter((_, i) => i !== idx),
    }))
  }
  const updateBlock = (idx: number, patch: Partial<SitePayload['blocks'][number]>) => {
    setForm((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b, i) => (i === idx ? { ...b, ...patch } : b)),
    }))
  }

  return (
    <div className="space-y-6">
      <div className="ledger-panel overflow-hidden">
        <SectionTitle title="1. Site Bilgisi" subtitle="Yönetim hedefi binanın adres ve kapasite bilgileri." />
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <LabeledInput label="Site Adı *" value={form.name} onChange={(v) => update({ name: v })} placeholder="Güneş Apartmanı" />
          <LabeledInput label="Şehir *" value={form.city} onChange={(v) => update({ city: v })} placeholder="Kayseri" />
          <LabeledInput label="İlçe" value={form.district ?? ''} onChange={(v) => update({ district: v })} placeholder="Melikgazi" />
          <LabeledInput label="Adres *" value={form.address} onChange={(v) => update({ address: v })} placeholder="Cumhuriyet Mah. 123 Sok. No:4" />
          <label className="flex items-center gap-3 rounded-[20px] border border-white/80 bg-white/76 px-4 py-3 md:col-span-2">
            <input
              type="checkbox"
              checked={form.hasBlocks}
              onChange={(e) => update({ hasBlocks: e.target.checked })}
              className="h-4 w-4 rounded border border-[#bfd0ec] text-[#1d3b67]"
            />
            <div>
              <p className="text-sm font-semibold text-[#0c1427]">Bloklu yapı</p>
              <p className="mt-1 text-xs text-[#72839b]">Birden fazla blok varsa işaretleyin. Her blok için ayrı kat/daire planı gireceksiniz.</p>
            </div>
          </label>
        </div>
      </div>

      <div className="ledger-panel overflow-hidden">
        <SectionTitle
          title="2. Daire Planı"
          subtitle={form.hasBlocks
            ? 'Her blok için kat ve kat başına daire sayısını girin. Daireler otomatik oluşturulur.'
            : 'Toplam daire sayısını girin, sistem otomatik numaralandırarak daireleri oluşturur.'}
        />

        <div className="p-5 space-y-4">
          {!form.hasBlocks ? (
            <LabeledInput
              label="Toplam Daire"
              type="number"
              value={String(form.totalUnits || '')}
              onChange={(v) => update({ totalUnits: Number(v) || 0 })}
              placeholder="Ör: 24"
            />
          ) : (
            <>
              {form.blocks.map((block, idx) => (
                <div key={idx} className="ledger-panel-soft p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-3">
                    <LabeledInput
                      label={`Blok ${idx + 1} Adı`}
                      value={block.name}
                      onChange={(v) => updateBlock(idx, { name: v })}
                      placeholder="A"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <LabeledInput
                      label="Kat Sayısı"
                      type="number"
                      value={String(block.floorsPerBlock || '')}
                      onChange={(v) => updateBlock(idx, { floorsPerBlock: Number(v) || 0 })}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <LabeledInput
                      label="Kat Başına Daire"
                      type="number"
                      value={String(block.unitsPerFloor || '')}
                      onChange={(v) => updateBlock(idx, { unitsPerFloor: Number(v) || 0 })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8b9bb0]">Blok Toplam</div>
                    <div className="mt-1 text-sm font-semibold text-[#0c1427] tabular-nums">
                      {(block.floorsPerBlock || 0) * (block.unitsPerFloor || 0)} daire
                    </div>
                  </div>
                  <div className="md:col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={form.blocks.length === 1}
                      onClick={() => removeBlock(idx)}
                      aria-label="Bloğu kaldır"
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-[#ba1a1a]" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addBlock}>
                <Plus className="h-4 w-4" />
                Blok Ekle
              </Button>
            </>
          )}

          <div>
            <label className="text-xs font-semibold text-[#4e5d6d]">Numaralandırma Deseni</label>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
              {([
                { key: 'SEQUENTIAL' as const, label: 'Sıralı', example: '1, 2, 3 ... 24' },
                { key: 'FLOOR_PREFIX' as const, label: 'Kat Önekli', example: '101, 102 / 201, 202' },
                { key: 'BLOCK_FLOOR' as const, label: 'Blok+Kat', example: 'A11, A12 / B21, B22' },
              ]).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => update({ unitNumberingScheme: opt.key })}
                  className={`rounded-[18px] border px-3 py-2.5 text-left transition-colors ${
                    form.unitNumberingScheme === opt.key
                      ? 'border-[#4f7df7]/40 bg-[#f3f7ff] text-[#0c1427]'
                      : 'border-white/80 bg-white/66 text-[#63758d] hover:bg-white'
                  }`}
                >
                  <p className="text-sm font-semibold">{opt.label}</p>
                  <p className="text-[11px] text-[#8b9bb0]">{opt.example}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="ledger-panel-soft flex items-center justify-between px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#63758d]">Oluşturulacak</p>
          <p className="mt-1 text-lg font-semibold text-[#0c1427] tabular-nums">
            {plannedUnits} daire
            {form.hasBlocks ? ` · ${form.blocks.length} blok` : ''}
          </p>
        </div>
        <Button type="button" disabled={!canSubmit || submitting} onClick={onSubmit}>
          {submitting ? 'Oluşturuluyor...' : 'Devam — Sakin Yükle'}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function Step2Residents({
  createdUnitCount,
  mode,
  setMode,
  csvText,
  setCsvText,
  dryRun,
  dryRunLoading,
  importLoading,
  onDryRun,
  onCommit,
  onTemplate,
  onFile,
  onBack,
  onSkip,
}: {
  createdUnitCount: number
  mode: 'csv' | 'skip'
  setMode: (m: 'csv' | 'skip') => void
  csvText: string
  setCsvText: (t: string) => void
  dryRun: DryRunResponse | null
  dryRunLoading: boolean
  importLoading: boolean
  onDryRun: () => void
  onCommit: () => void
  onTemplate: () => void
  onFile: (ev: React.ChangeEvent<HTMLInputElement>) => void
  onBack: () => void
  onSkip: () => void
}) {
  return (
    <div className="space-y-6">
      <div className="ledger-panel p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#eafaf1] text-[#0e7a52]">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[#0c1427]">Site ve {createdUnitCount} daire oluşturuldu</p>
            <p className="mt-1 text-xs text-[#6b7280]">Sakin bilgilerini CSV ile toplu yükleyin veya bu adımı atlayıp sonra tek tek ekleyin.</p>
          </div>
        </div>
      </div>

      <div className="ledger-panel overflow-hidden">
        <SectionTitle
          title="Sakin Yükleme"
          subtitle="CSV şablonu indirin, doldurun, önizleyip kaydedin."
          actions={(
            <Button type="button" variant="outline" size="sm" onClick={onTemplate}>
              <Download className="h-4 w-4" />
              Şablonu İndir
            </Button>
          )}
        />
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode('csv')}
              className={`rounded-[22px] border p-4 text-left transition-all ${
                mode === 'csv'
                  ? 'border-[#4f7df7]/40 bg-[#f3f7ff]'
                  : 'border-white/80 bg-white/66 hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#4f7df7]" />
                <span className="text-sm font-semibold text-[#0c1427]">CSV Yükle</span>
              </div>
              <p className="mt-1 text-xs text-[#6b7280]">Şablonu doldurup toplu aktar.</p>
            </button>
            <button
              type="button"
              onClick={() => setMode('skip')}
              className={`rounded-[22px] border p-4 text-left transition-all ${
                mode === 'skip'
                  ? 'border-[#4f7df7]/40 bg-[#f3f7ff]'
                  : 'border-white/80 bg-white/66 hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#63758d]" />
                <span className="text-sm font-semibold text-[#0c1427]">Şimdilik Atla</span>
              </div>
              <p className="mt-1 text-xs text-[#6b7280]">Sakinleri daha sonra daire detaylarından ekle.</p>
            </button>
          </div>

          {mode === 'csv' && (
            <>
              <div className="rounded-[22px] border border-[#dce7f6] bg-[#f7faff] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#4f7df7]">CSV Format</p>
                <p className="mt-2 text-xs text-[#4e5d6d] font-mono">
                  firstName, lastName, email, phoneNumber, tckn, type, site, unit
                </p>
                <p className="mt-2 text-[11px] text-[#6b7280]">
                  type: OWNER | TENANT | CONTACT · email ve tckn boş bırakılabilir · site/unit alanları ilgili daireyle eşleşme için kullanılır
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="ledger-panel-soft flex items-center justify-center gap-2 py-6 cursor-pointer hover:bg-white transition-colors border-dashed border-[#bfd0ec]">
                  <Upload className="h-4 w-4 text-[#4f7df7]" />
                  <span className="text-sm font-semibold text-[#0c1427]">CSV Dosyası Seç</span>
                  <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
                </label>
                <div className="md:col-span-2">
                  <textarea
                    rows={6}
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    placeholder="Ya da doğrudan CSV metnini buraya yapıştırın..."
                    className="ledger-input w-full bg-white font-mono text-[12px]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" disabled={!csvText.trim() || dryRunLoading} onClick={onDryRun}>
                  {dryRunLoading ? 'Kontrol ediliyor...' : 'Önizle (Dry-Run)'}
                </Button>
                {dryRun && (
                  <Button type="button" disabled={dryRun.summary.validRows === 0 || importLoading} onClick={onCommit}>
                    {importLoading ? 'Aktarılıyor...' : `${dryRun.summary.validRows} kaydı Aktar`}
                  </Button>
                )}
              </div>

              {dryRun && (
                <div className="ledger-panel-soft p-4">
                  <div className="grid grid-cols-3 gap-3">
                    <SummaryBox label="Toplam Satır" value={dryRun.summary.totalRows} tone="neutral" />
                    <SummaryBox label="Geçerli" value={dryRun.summary.validRows} tone="success" />
                    <SummaryBox label="Hatalı" value={dryRun.summary.invalidRows} tone={dryRun.summary.invalidRows > 0 ? 'danger' : 'neutral'} />
                  </div>
                  {dryRun.preview.some((r) => !r.valid) && (
                    <div className="mt-4 max-h-48 overflow-y-auto rounded-[18px] border border-[#f3c0c0] bg-[#fff4f4] p-3">
                      <p className="text-xs font-semibold text-[#ba1a1a]">Hatalı satırlar (ilk 20)</p>
                      <ul className="mt-2 space-y-1 text-[11px] text-[#6b7280]">
                        {dryRun.preview.filter((r) => !r.valid).slice(0, 20).map((row) => (
                          <li key={row.rowIndex}>
                            Satır {row.rowIndex}: {row.errors.join(', ')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-[22px] border border-white/80 bg-white/74 px-5 py-3">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Geri
        </Button>
        <Button type="button" onClick={onSkip}>
          Devam — İlk Aidat
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function Step3Dues({
  duesAmount,
  setDuesAmount,
  duesDay,
  setDuesDay,
  skipDues,
  setSkipDues,
  submitting,
  onBack,
  onSubmit,
  summary,
}: {
  duesAmount: string
  setDuesAmount: (v: string) => void
  duesDay: string
  setDuesDay: (v: string) => void
  skipDues: boolean
  setSkipDues: (v: boolean) => void
  submitting: boolean
  onBack: () => void
  onSubmit: () => void
  summary: { unitCount: number; residentCount: number }
}) {
  const now = new Date()
  const monthLabel = now.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      <div className="ledger-panel p-5">
        <div className="grid grid-cols-3 gap-4">
          <SummaryBox label="Oluşturulan Daire" value={summary.unitCount} tone="neutral" />
          <SummaryBox label="Yüklenen Sakin" value={summary.residentCount} tone="success" />
          <SummaryBox label="Dönem" value={monthLabel} tone="neutral" />
        </div>
      </div>

      <div className="ledger-panel overflow-hidden">
        <SectionTitle title="İlk Aidat Dönemi (Opsiyonel)" subtitle="Bu ay için tüm dairelere aynı anda aidat oluşturulur." />
        <div className="p-5 space-y-4">
          <label className="flex items-center gap-3 rounded-[20px] border border-white/80 bg-white/76 px-4 py-3">
            <input
              type="checkbox"
              checked={skipDues}
              onChange={(e) => setSkipDues(e.target.checked)}
              className="h-4 w-4 rounded border border-[#bfd0ec] text-[#1d3b67]"
            />
            <div>
              <p className="text-sm font-semibold text-[#0c1427]">Şimdilik aidat oluşturma</p>
              <p className="mt-1 text-xs text-[#72839b]">Daha sonra Tahsilat sayfasından oluşturabilirsin.</p>
            </div>
          </label>

          {!skipDues && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LabeledInput
                label="Aidat Tutarı (₺) *"
                type="number"
                value={duesAmount}
                onChange={setDuesAmount}
                placeholder="500"
              />
              <LabeledInput
                label="Vade Günü (1-28)"
                type="number"
                value={duesDay}
                onChange={setDuesDay}
                placeholder="10"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-[22px] border border-white/80 bg-white/74 px-5 py-3">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Geri
        </Button>
        <Button type="button" disabled={submitting} onClick={onSubmit}>
          {submitting ? 'Tamamlanıyor...' : skipDues ? 'Sihirbazı Bitir' : 'Aidatı Oluştur ve Bitir'}
          <CheckCircle2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function LabeledInput({ label, value, onChange, placeholder, type = 'text' }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-[#4e5d6d]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="ledger-input w-full bg-white"
      />
    </div>
  )
}

function SummaryBox({ label, value, tone }: { label: string; value: string | number; tone: 'success' | 'danger' | 'neutral' }) {
  const toneClass = tone === 'success'
    ? 'bg-[#eafaf1] text-[#0e7a52]'
    : tone === 'danger'
      ? 'bg-[#fff4f4] text-[#ba1a1a]'
      : 'bg-[#f7faff] text-[#17345a]'

  return (
    <div className={`rounded-[18px] px-4 py-3 ${toneClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-80">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}
