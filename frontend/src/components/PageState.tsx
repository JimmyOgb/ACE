import type { ReactNode } from 'react'

export function LoadingState({ label = 'Loading ACE data…' }: { label?: string }) {
  return (
    <div className="card flex min-h-48 items-center justify-center p-8 text-sm text-muted">
      <span className="mr-3 size-4 animate-spin rounded-full border-2 border-brand/20 border-t-brand" />
      {label}
    </div>
  )
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="card flex min-h-52 flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-4 grid size-11 place-items-center rounded-xl bg-brand-soft font-bold text-brand">ACE</div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-2 max-w-md text-sm leading-6 text-muted">{children}</div>
    </div>
  )
}

export function ErrorState({ error }: { error: unknown }) {
  const rawMessage = error instanceof Error ? error.message : String(error)
  const normalized = rawMessage.toLowerCase()
  const isInsufficientFunds = normalized.includes('insufficient funds') || normalized.includes('exceeds balance') || normalized.includes('insufficient gen')
  const isRateLimited = normalized.includes('429') || normalized.includes('rate limit') || normalized.includes('failed to fetch') || normalized.includes('too many requests')
  
  let message = rawMessage || 'An unexpected error occurred.'
  if (isInsufficientFunds) {
    message = 'Insufficient GEN for transaction gas. Add GEN to this wallet and try again.'
  } else if (isRateLimited) {
    message = 'Studionet RPC is temporarily rate-limited. Your GEN balance is not the problem. Please wait and retry.'
  }

  return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{message}</div>
}
