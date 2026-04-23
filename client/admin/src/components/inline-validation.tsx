import { AlertCircle, CheckCircle2 } from 'lucide-react'

interface InlineValidationProps {
  message?: string | null
  tone?: 'error' | 'success' | 'neutral'
}

export function InlineValidation({ message, tone = 'neutral' }: InlineValidationProps) {
  if (!message) return null
  const isError = tone === 'error'
  const isSuccess = tone === 'success'
  return (
    <p
      role={isError ? 'alert' : 'status'}
      className={`mt-1.5 inline-flex items-center gap-1.5 text-xs ${
        isError ? 'text-[#ba1a1a]' : isSuccess ? 'text-[#0f766e]' : 'text-[#617287]'
      }`}
    >
      {isError ? <AlertCircle className="h-3.5 w-3.5" /> : null}
      {isSuccess ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
      <span>{message}</span>
    </p>
  )
}
