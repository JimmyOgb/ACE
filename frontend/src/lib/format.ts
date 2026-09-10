export function shortId(value: string, visible = 8) {
  if (value.length <= visible * 2 + 1) return value
  return `${value.slice(0, visible)}…${value.slice(-visible)}`
}

/**
 * Detects whether a string value represents a contract sequence counter rather than a timestamp.
 * In the ACE contract, sequential counters (1, 2, 3...) are small integers (< 1,000,000,000).
 * Any real Unix timestamp in seconds for the ACE protocol is >= 1,000,000,000 (year 2001+).
 */
export function isSequenceId(value: string | undefined | null): boolean {
  if (!value) return false
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) return false
  const num = Number(trimmed)
  return num > 0 && num < 1_000_000_000
}

/**
 * Formats a sequence ID for display, kept strictly separate from timestamp rendering.
 */
export function formatSequenceId(value: string | undefined | null): string {
  if (!value) return '—'
  const trimmed = value.trim()
  if (/^\d+$/.test(trimmed)) return `#${trimmed}`
  return trimmed
}

/**
 * Format a true timestamp value for display in UTC.
 *
 * Supported timestamp units:
 * - Unix timestamp in seconds (10 digits, e.g. "1725936000"): converted from seconds to ms, rendered in UTC.
 * - Unix timestamp in milliseconds (13 digits, e.g. "1725936000000"): parsed and rendered in UTC.
 * - UTC ISO-8601 strings (e.g. "2026-09-10T12:00:00Z"): parsed and rendered in UTC.
 *
 * Contract sequence counters (< 1,000,000,000) are NOT timestamps and return '—'.
 * This prevents the "Jan 2001" display bug where new Date("1") was mistakenly interpreted
 * as year 2001.
 */
export function formatDate(value: string | undefined | null): string {
  if (!value) return '—'
  const trimmed = value.trim()
  if (!trimmed) return '—'

  // Pure integer strings
  if (/^\d+$/.test(trimmed)) {
    const num = Number(trimmed)
    // Values < 1,000,000,000 are contract sequence counters, not timestamps.
    if (num < 1_000_000_000) {
      return '—'
    }
    // Unix timestamp in seconds (10 digits: ~1e9 to ~1e11) -> convert to milliseconds
    if (num < 100_000_000_000) {
      return formatUtcDate(new Date(num * 1000))
    }
    // Unix timestamp in milliseconds (13 digits)
    return formatUtcDate(new Date(num))
  }

  // Parse ISO-8601 or other standard date string
  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }
  return formatUtcDate(date)
}

function formatUtcDate(date: Date): string {
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(date)
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
