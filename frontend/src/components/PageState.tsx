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
  const message = error instanceof Error ? error.message : 'An unexpected error occurred.'
  return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{message}</div>
}
