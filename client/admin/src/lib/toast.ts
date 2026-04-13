import { toast } from 'sonner'

export function toastSuccess(message: string) {
  toast.success(message)
}

export function toastError(error: string | Error) {
  const message = error instanceof Error ? error.message : error
  toast.error(message)
}

export function toastLoading(message: string) {
  return toast.loading(message)
}

export function toastDismiss(toastId: string | number) {
  toast.dismiss(toastId)
}
