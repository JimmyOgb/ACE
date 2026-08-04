import { statusTone, titleCase } from '../lib/format'

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusTone(status)}`}>
      {titleCase(status)}
    </span>
  )
}
