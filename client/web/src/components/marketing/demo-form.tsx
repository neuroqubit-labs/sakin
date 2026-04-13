'use client'

import type { FormEvent, HTMLInputTypeAttribute } from 'react'
import { startTransition, useState } from 'react'
import { CheckCircle2, Send, Sparkles } from 'lucide-react'
import { contactChannels } from '@/content/site-content'
import { demoFormSchema, type DemoFormValues } from '@/lib/demo-form-schema'
import { Button } from '@/components/marketing/button'
import { cn } from '@/lib/utils'

type ErrorState = Partial<Record<keyof DemoFormValues, string>>

const initialValues: DemoFormValues = {
  companyName: '',
  contactName: '',
  email: '',
  phone: '',
  portfolioSize: '',
  message: '',
}

export function DemoForm() {
  const [values, setValues] = useState<DemoFormValues>(initialValues)
  const [errors, setErrors] = useState<ErrorState>({})
  const [submitted, setSubmitted] = useState(false)
  const [isPending, setIsPending] = useState(false)

  function updateValue<K extends keyof DemoFormValues>(field: K, value: DemoFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = demoFormSchema.safeParse(values)

    if (!result.success) {
      const nextErrors: ErrorState = {}

      for (const issue of result.error.issues) {
        const field = issue.path[0]

        if (typeof field === 'string' && !nextErrors[field as keyof DemoFormValues]) {
          nextErrors[field as keyof DemoFormValues] = issue.message
        }
      }

      setErrors(nextErrors)
      return
    }

    startTransition(() => {
      setIsPending(true)
      window.setTimeout(() => {
        setSubmitted(true)
        setIsPending(false)
      }, 500)
    })
  }

  if (submitted) {
    return (
      <div className="rounded-[2rem] border border-white/70 bg-white/94 p-8 shadow-halo backdrop-blur-md">
        <div className="flex items-start gap-4">
          <span className="mt-1 flex h-12 w-12 items-center justify-center rounded-full bg-[#e3efe5] text-[#255334]">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-navy-900/42">Şeffaf Bilgilendirme</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-navy-950">
                Demo talep formu tasarlandı, ancak gönderim altyapısı henüz yayında değil.
              </h3>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-navy-900/68">
              Girdiğiniz bilgiler şu anda sistemde saklanmıyor. İsterseniz aşağıdaki iletişim kanallarından bize
              doğrudan ulaşabilir, portföy yapınızı ve demo beklentinizi iletebilirsiniz.
            </p>

            <div className="grid gap-3 md:grid-cols-3">
              {contactChannels.map((channel) => (
                <a
                  key={channel.title}
                  className="rounded-[1.4rem] border border-navy-900/8 bg-[#fbfaf8] p-4 transition hover:-translate-y-0.5 hover:border-navy-900/18"
                  href={channel.href}
                  rel="noreferrer"
                  target={channel.href.startsWith('http') ? '_blank' : undefined}
                >
                  <p className="text-[11px] uppercase tracking-[0.26em] text-navy-900/38">{channel.title}</p>
                  <p className="mt-3 text-sm font-semibold text-navy-950">{channel.value}</p>
                  <p className="mt-2 text-xs leading-6 text-navy-900/56">{channel.detail}</p>
                </a>
              ))}
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSubmitted(false)
                setValues(initialValues)
                setErrors({})
              }}
            >
              Formu yeniden düzenle
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form className="rounded-[2rem] border border-white/70 bg-white/94 p-6 shadow-halo backdrop-blur-md sm:p-8" onSubmit={handleSubmit}>
      <div className="flex items-start justify-between gap-6 border-b border-navy-900/8 pb-6">
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-navy-900/42">Demo Talebi</p>
          <h3 className="text-2xl font-semibold tracking-tight text-navy-950">Firmanız için kısa bir tanıtım akışı planlayalım.</h3>
          <p className="max-w-xl text-sm leading-7 text-navy-900/68">
            Portföy yapınızı ve öncelikli ihtiyacınızı paylaşın. Form, V1 kapsamında client-side doğrulama ile
            çalışır ve gönderim sonrasında şeffaf placeholder durumu gösterir.
          </p>
        </div>

        <div className="hidden rounded-full border border-[#dbe3ef] bg-[#eef3fb] px-3 py-2 text-xs font-semibold text-navy-950 md:flex md:items-center md:gap-2">
          <Sparkles className="h-4 w-4" />
          V1 placeholder akışı
        </div>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <Field
          error={errors.companyName}
          label="Firma adı"
          name="companyName"
          onChange={(value) => updateValue('companyName', value)}
          placeholder="Ör. ABC Bina Yönetim"
          value={values.companyName}
        />
        <Field
          error={errors.contactName}
          label="Yetkili adı"
          name="contactName"
          onChange={(value) => updateValue('contactName', value)}
          placeholder="Ad Soyad"
          value={values.contactName}
        />
        <Field
          error={errors.email}
          label="E-posta"
          name="email"
          onChange={(value) => updateValue('email', value)}
          placeholder="ornek@firma.com"
          type="email"
          value={values.email}
        />
        <Field
          error={errors.phone}
          label="Telefon"
          name="phone"
          onChange={(value) => updateValue('phone', value)}
          placeholder="05xx xxx xx xx"
          type="tel"
          value={values.phone}
        />

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-navy-950">Portföy büyüklüğü</span>
          <select
            className={cn(
              'min-h-12 rounded-[1.2rem] border bg-[#fbfaf8] px-4 text-sm text-navy-950 outline-none transition focus:border-navy-900/20 focus:bg-white',
              errors.portfolioSize ? 'border-[#ba5a4a]' : 'border-navy-900/10',
            )}
            name="portfolioSize"
            onChange={(event) => updateValue('portfolioSize', event.target.value)}
            value={values.portfolioSize}
          >
            <option value="">Seçin</option>
            <option value="1-5 bina">1-5 bina</option>
            <option value="6-20 bina">6-20 bina</option>
            <option value="20+ bina">20+ bina</option>
            <option value="karma portföy">Karma portföy / farklı yapı tipleri</option>
          </select>
          {errors.portfolioSize ? <span className="text-xs text-[#9b3b2a]">{errors.portfolioSize}</span> : null}
        </label>

        <div className="rounded-[1.4rem] border border-dashed border-navy-900/14 bg-[#f7f2ea] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-navy-900/38">Not</p>
          <p className="mt-2 text-sm leading-7 text-navy-900/64">
            Canlı entegrasyon yerine şimdilik deneyim, içerik akışı ve form doğrulama seviyesi hazırlanıyor.
          </p>
        </div>
      </div>

      <label className="mt-5 grid gap-2">
        <span className="text-sm font-semibold text-navy-950">Kısa ihtiyaç notu</span>
        <textarea
          className={cn(
            'min-h-36 rounded-[1.2rem] border bg-[#fbfaf8] px-4 py-4 text-sm text-navy-950 outline-none transition focus:border-navy-900/20 focus:bg-white',
            errors.message ? 'border-[#ba5a4a]' : 'border-navy-900/10',
          )}
          name="message"
          onChange={(event) => updateValue('message', event.target.value)}
          placeholder="Yönettiğiniz yapı tipi, öncelikli ihtiyaç ve görmek istediğiniz akış..."
          value={values.message}
        />
        {errors.message ? <span className="text-xs text-[#9b3b2a]">{errors.message}</span> : null}
      </label>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-xl text-xs leading-6 text-navy-900/52">
          Submit sonrası girilen bilgiler kaydedilmez. Bu davranış bilerek şeffaf tutulur.
        </p>
        <Button className="min-w-[12rem]" disabled={isPending} type="submit">
          {isPending ? 'Hazırlanıyor...' : 'Talebi Görüntüle'}
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}

type FieldProps = {
  error?: string
  label: string
  name: string
  onChange: (value: string) => void
  placeholder: string
  type?: HTMLInputTypeAttribute
  value: string
}

function Field({ error, label, name, onChange, placeholder, type = 'text', value }: FieldProps) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-navy-950">{label}</span>
      <input
        className={cn(
          'min-h-12 rounded-[1.2rem] border bg-[#fbfaf8] px-4 text-sm text-navy-950 outline-none transition focus:border-navy-900/20 focus:bg-white',
          error ? 'border-[#ba5a4a]' : 'border-navy-900/10',
        )}
        name={name}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
      {error ? <span className="text-xs text-[#9b3b2a]">{error}</span> : null}
    </label>
  )
}
