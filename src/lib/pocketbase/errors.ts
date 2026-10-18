import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function extractFieldErrors(error: unknown): FieldErrors {
  const errObj = error as any
  const data = errObj?.response?.data || errObj?.data
  if (!data || typeof data !== 'object') return {}
  const errors: FieldErrors = {}
  for (const [field, detail] of Object.entries(data)) {
    if (
      detail &&
      typeof detail === 'object' &&
      'message' in (detail as any) &&
      typeof (detail as { message: unknown }).message === 'string'
    ) {
      errors[field] = (detail as { message: string }).message
    } else if (typeof detail === 'string') {
      errors[field] = detail
    }
  }
  return errors
}

export function getErrorMessage(error: unknown): string {
  const errObj = error as any
  const msgs = Object.entries(extractFieldErrors(error)).map(([field, msg]) => `${field}: ${msg}`)
  if (msgs.length > 0) {
    return msgs.join(', ')
  }
  return (
    errObj?.message ||
    errObj?.response?.message ||
    (error instanceof Error ? error.message : 'Ocorreu um erro inesperado ao salvar.')
  )
}
