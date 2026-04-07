'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { apiClient } from '@/lib/api'

interface SiteOption {
  id: string
  name: string
  city: string
  totalUnits: number
}

interface SiteContextValue {
  selectedSiteId: string | null
  setSelectedSiteId: (siteId: string) => void
  availableSites: SiteOption[]
  hydrated: boolean
  error: string | null
}

const STORAGE_KEY = 'active_site_id'
const COOKIE_KEY = 'active_site_id'

const SiteContext = createContext<SiteContextValue>({
  selectedSiteId: null,
  setSelectedSiteId: () => {},
  availableSites: [],
  hydrated: false,
  error: null,
})

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
  return match?.[1] ?? null
}

function writeCookie(name: string, value: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=${value}; path=/; SameSite=Lax; max-age=${30 * 24 * 60 * 60}`
}

function syncSiteIdToUrl(siteId: string) {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  url.searchParams.set('siteId', siteId)
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [selectedSiteId, setSelectedSiteIdState] = useState<string | null>(null)
  const [availableSites, setAvailableSites] = useState<SiteOption[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSites = async () => {
      try {
        setError(null)
        const sites = await apiClient<SiteOption[]>('/sites')
        setAvailableSites(sites)

        if (sites.length === 0) {
          setHydrated(true)
          return
        }

        const urlSiteId = typeof window !== 'undefined' ? new URL(window.location.href).searchParams.get('siteId') : null
        const storageSiteId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
        const cookieSiteId = readCookie(COOKIE_KEY)

        const candidate = [urlSiteId, storageSiteId, cookieSiteId].find((id) => id && sites.some((s) => s.id === id))
        const nextSiteId = candidate ?? sites[0]!.id
        setSelectedSiteIdState(nextSiteId)
        if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, nextSiteId)
        writeCookie(COOKIE_KEY, nextSiteId)
        syncSiteIdToUrl(nextSiteId)
      } catch (err) {
        setAvailableSites([])
        setSelectedSiteIdState(null)
        setError(err instanceof Error ? err.message : 'Site listesi alınamadı')
      } finally {
        setHydrated(true)
      }
    }

    void loadSites()
  }, [])

  const setSelectedSiteId = (siteId: string) => {
    setSelectedSiteIdState(siteId)
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, siteId)
    writeCookie(COOKIE_KEY, siteId)
    syncSiteIdToUrl(siteId)
  }

  const value = useMemo<SiteContextValue>(
    () => ({ selectedSiteId, setSelectedSiteId, availableSites, hydrated, error }),
    [selectedSiteId, availableSites, hydrated, error],
  )

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>
}

export function useSiteContext() {
  return useContext(SiteContext)
}
