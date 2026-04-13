import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function absoluteUrl(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.sakinyonetim.tr'

  return new URL(normalizedPath, baseUrl).toString()
}
