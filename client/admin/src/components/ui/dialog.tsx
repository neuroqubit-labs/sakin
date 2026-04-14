'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  align?: 'center' | 'top'
}

function Dialog({ open, onClose, children, className, align = 'center' }: DialogProps) {
  React.useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center overflow-y-auto p-4 sm:p-6 ${
        align === 'top' ? 'items-start' : 'items-start sm:items-center'
      }`}
    >
      <div
        className="fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(79,125,247,0.16),transparent_28%),rgba(8,17,31,0.56)] backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          'relative z-10 w-full max-w-lg rounded-[28px] bg-white shadow-[0_30px_80px_rgba(8,17,31,0.18)]',
          'max-h-[calc(100vh-2rem)] overflow-y-auto',
          className,
        )}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  )
}

function DialogHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center justify-between px-6 py-4 border-b', className)}
      {...props}
    >
      {children}
    </div>
  )
}

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-lg font-semibold', className)} {...props} />
}

function DialogContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 py-4', className)} {...props} />
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center justify-end gap-3 px-6 py-4 border-t', className)}
      {...props}
    />
  )
}

export { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter }
