'use client'

import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        style: {
          fontFamily: 'var(--font-inter, Inter, sans-serif)',
        },
        classNames: {
          success: 'border-green-200 bg-green-50 text-green-800',
          error: 'border-red-200 bg-red-50 text-red-800',
        },
      }}
      richColors
      closeButton
    />
  )
}
