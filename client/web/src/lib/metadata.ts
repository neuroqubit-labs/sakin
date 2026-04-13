import type { Metadata } from 'next'
import { siteConfig } from '@/content/site-content'
import { absoluteUrl } from '@/lib/utils'

type MetadataInput = {
  path: string
  title: string
  description: string
}

export function buildMetadata({ path, title, description }: MetadataInput): Metadata {
  const canonical = absoluteUrl(path)

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      locale: 'tr_TR',
      siteName: siteConfig.siteName,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}
