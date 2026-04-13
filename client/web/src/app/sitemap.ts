import type { MetadataRoute } from 'next'
import { navItems, siteConfig } from '@/content/site-content'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  return navItems.map((item) => ({
    url: new URL(item.href, siteConfig.url).toString(),
    lastModified: now,
    changeFrequency: item.href === '/' ? 'weekly' : 'monthly',
    priority: item.href === '/' ? 1 : 0.7,
  }))
}
