import { Link } from 'react-router-dom'

import { EmptyState, ErrorState, LoadingState } from '../components/PageState'
import { StatusBadge } from '../components/StatusBadge'
import { useSubmissions } from '../hooks/useAceQueries'
import { clearStaleAceUploadEvaluationState } from '../lib/uploadIntent'
import { formatDate, shortId } from '../lib/format'
import { useAce } from '../providers/AceContext'

export function DashboardPage() {
  const { contract } = useAce()
  const submissions = useSubmissions()
  const items = submissions.data ?? []
  const finalized = items.filter((item) => item.status.toLowerCase() === 'finalized').length
  const inReview = items.filter((item) => ['frozen', 'under_review', 'consensus_ready'].includes(item.status.toLowerCase())).length

  function clearDevelopmentState() {
    if (!import.meta.env.DEV || !window.confirm('Clear all saved ACE upload/evaluation test sessions?')) return
    clearStaleAceUploadEvaluationState()
    window.location.reload()
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand">Overview</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Academic evaluations</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Track submissions from registration through AI consensus and finalization.</p>
        </div>
        <Link to="/upload" className="button-primary">New submission</Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ['Total submissions', items.length],
          ['In evaluation', inReview],
          ['Finalized', finalized],
        ].map(([label, value]) => (
          <div key={label} className="card p-5">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent submissions</h2>
          {submissions.isFetching && <span className="text-xs text-muted">Refreshing…</span>}
        </div>
        {!contract ? (
          <EmptyState title="Configure your ACE contract">Set `VITE_ACE_CONTRACT_ADDRESS` to display live submissions.</EmptyState>
        ) : submissions.isPending ? (
          <LoadingState />
        ) : submissions.isError ? (
          <ErrorState error={submissions.error} />
        ) : items.length === 0 ? (
          <EmptyState title="No submissions yet">Create the first evaluation request to start the consensus workflow.</EmptyState>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-180 text-left text-sm">
                <thead className="border-b border-line bg-paper/70 text-xs font-semibold uppercase tracking-wide text-muted">
                  <tr><th className="px-5 py-3.5">Submission</th><th className="px-5 py-3.5">Rubric</th><th className="px-5 py-3.5">Status</th><th className="px-5 py-3.5">Created</th><th className="px-5 py-3.5" /></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {items.map((submission) => (
                    <tr key={submission.submission_id} className="transition hover:bg-paper/60">
                      <td className="px-5 py-4"><p className="font-medium text-ink">{submission.title}</p><p className="mt-1 font-mono text-xs text-muted">{shortId(submission.submission_id)}</p></td>
                      <td className="px-5 py-4 font-mono text-xs text-muted">{shortId(submission.rubric_id)}</td>
                      <td className="px-5 py-4"><StatusBadge status={submission.status} /></td>
                      <td className="px-5 py-4 text-muted">{formatDate(submission.created_at)}</td>
                      <td className="px-5 py-4 text-right"><Link className="font-semibold text-brand hover:text-brand-dark" to={`/submissions/${encodeURIComponent(submission.submission_id)}`}>View</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
      {import.meta.env.DEV && <button type="button" className="button-secondary text-xs" onClick={clearDevelopmentState}>Clear stale ACE test state</button>}
    </div>
  )
}
