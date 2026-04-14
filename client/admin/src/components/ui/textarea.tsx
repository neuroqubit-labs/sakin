import * as React from 'react'
import { cn } from '@/lib/utils'

function Textarea({ className, ref, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: React.Ref<HTMLTextAreaElement> }) {
  return (
    <textarea
      className={cn(
        'flex min-h-[112px] w-full rounded-2xl border border-white/85 bg-white/82 px-3.5 py-3 text-sm text-[#102038] shadow-[0_12px_28px_rgba(8,17,31,0.06)] backdrop-blur-md placeholder:text-[#8a9bb0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#6d8ef8]/12 focus-visible:border-[#6d8ef8] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  )
}
Textarea.displayName = 'Textarea'

export { Textarea }
