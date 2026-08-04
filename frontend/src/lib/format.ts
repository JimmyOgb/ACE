export function shortId(value: string, visible = 8) {
  if (value.length <= visible * 2 + 1) return value
  return `${value.slice(0, visible)}…${value.slice(-visible)}`
}

export function formatDate(value: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function formatBasisPoints(value: bigint) {
  return `${(Number(value) / 100).toFixed(2)}%`
}

export function titleCase(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function statusTone(status: string) {
  switch (status.toLowerCase()) {
    case 'finalized':
    case 'accepted':
    case 'active':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
    case 'under_review':
    case 'consensus_ready':
    case 'submitted':
      return 'bg-blue-50 text-blue-700 ring-blue-600/20'
    case 'frozen':
      return 'bg-amber-50 text-amber-700 ring-amber-600/20'
    default:
      return 'bg-slate-50 text-slate-700 ring-slate-600/20'
  }
}
