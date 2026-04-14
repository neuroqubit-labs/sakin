import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          className={cn(
            'flex h-11 w-full rounded-xl border border-white/85 bg-white/82 px-3.5 py-2 text-sm text-[#102038] shadow-[0_12px_28px_rgba(8,17,31,0.06)] backdrop-blur-md',
            'placeholder:text-[#8a9bb0]',
            'focus:outline-none focus:ring-4 focus:ring-[#6d8ef8]/12 focus:border-[#6d8ef8]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus:ring-red-500/15',
            className,
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        {helperText && !error && <p className="text-xs text-gray-500">{helperText}</p>}
      </div>
    )
  },
)
Input.displayName = 'Input'

export { Input }
