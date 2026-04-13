import type { ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import { Manrope, Cormorant_Garamond } from 'next/font/google'
import { SiteHeader } from '@/components/marketing/site-header'
import { SiteFooter } from '@/components/marketing/site-footer'
import { siteConfig } from '@/content/site-content'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-manrope',
})

const cormorant = Cormorant_Garamond({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  variable: '--font-instrument-serif',
})

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.companyName} | ${siteConfig.productName}`,
    template: `%s | ${siteConfig.companyName}`,
  },
  description: siteConfig.description,
  icons: {
    icon: [
      { url: '/favicons/favicon.ico' },
      { url: '/favicons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/favicons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: [{ url: '/favicons/favicon.ico' }],
  },
  manifest: '/favicons/site.webmanifest',
}

export const viewport: Viewport = {
  themeColor: '#0f1d37',
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: siteConfig.companyName,
  url: siteConfig.operatorUrl,
  email: siteConfig.email,
  telephone: siteConfig.phone,
  logo: new URL(siteConfig.brand.logos.mark, siteConfig.url).toString(),
  sameAs: [siteConfig.operatorUrl],
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Kayseri',
    addressCountry: 'TR',
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" className={`${manrope.variable} ${cormorant.variable}`}>
      <body>
        <div className="site-shell">
          <div aria-hidden className="site-grid" />
          <div aria-hidden className="site-orb site-orb-left" />
          <div aria-hidden className="site-orb site-orb-right" />
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </div>
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
          type="application/ld+json"
        />
      </body>
    </html>
  )
}
