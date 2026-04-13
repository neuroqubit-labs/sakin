import { ButtonLink } from '@/components/marketing/button'

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-7xl items-center px-4 py-20 sm:px-6 lg:px-8">
      <div className="max-w-2xl space-y-6">
        <p className="text-[11px] uppercase tracking-[0.3em] text-navy-900/42">404</p>
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-navy-950 sm:text-5xl">
          Aradığınız sayfa bu kurumsal yapı içinde bulunamadı.
        </h1>
        <p className="text-lg leading-8 text-navy-900/68">
          İsterseniz ana sayfaya dönebilir ya da demo talebi alanına geçebilirsiniz.
        </p>
        <div className="flex flex-wrap gap-4">
          <ButtonLink href="/">Ana Sayfa</ButtonLink>
          <ButtonLink href="/iletisim#demo-form" variant="secondary">
            Demo Talebi
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}
