import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { ErrorState, LoadingState } from '../components/PageState'
import { StatusBadge } from '../components/StatusBadge'
import { useConsensusResult } from '../hooks/useAceQueries'
import { formatBasisPoints, formatDate, shortId, titleCase } from '../lib/format'

export function ConsensusReportPage() {
  const params = useParams()
  const navigate = useNavigate()
  const consensusResultId = params.consensusResultId ?? ''
  const [searchId, setSearchId] = useState(consensusResultId)
  const result = useConsensusResult(consensusResultId)

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (searchId.trim()) navigate(`/consensus/${encodeURIComponent(searchId.trim())}`)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <p className="text-sm font-semibold text-brand">Consensus</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Consensus report</h1>
        <p className="mt-3 text-sm leading-6 text-muted">Inspect the final, verifiable decision produced for an academic submission.</p>
      </div>

      <form className="card flex flex-col gap-3 p-4 sm:flex-row" onSubmit={handleSearch}>
        <input className="field mt-0 flex-1 font-mono" value={searchId} onChange={(event) => setSearchId(event.target.value)} placeholder="Enter a consensus result ID" aria-label="Consensus result ID" />
        <button className="button-primary">Load report</button>
      </form>

      {!consensusResultId ? (
        <div className="card p-10 text-center"><div className="mx-auto grid size-12 place-items-center rounded-xl bg-brand-soft font-bold text-brand">✓</div><h2 className="mt-4 text-lg font-semibold">Enter a result identifier</h2><p className="mt-2 text-sm text-muted">Consensus results are retrieved directly through the ACE TypeScript SDK.</p></div>
      ) : result.isPending ? (
        <LoadingState label="Loading consensus result…" />
      ) : result.isError ? (
        <ErrorState error={result.error} />
      ) : result.data ? (
        <article className="card overflow-hidden">
          <div className="border-b border-line bg-brand-soft/50 p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><StatusBadge status={result.data.status} /><p className="mt-5 text-sm font-medium text-muted">Consensus decision</p><h2 className="mt-1 text-3xl font-semibold tracking-tight text-brand-dark">{titleCase(result.data.decision)}</h2></div><div className="rounded-2xl bg-white p-4 text-center shadow-sm"><p className="text-xs font-medium uppercase tracking-wide text-muted">Confidence</p><p className="mt-1 text-2xl font-semibold">{formatBasisPoints(result.data.confidence_basis_points)}</p></div></div>
          </div>
          <div className="p-6 sm:p-8">
            <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {[
                ['Result ID', shortId(result.data.consensus_result_id)],
                ['Submission ID', shortId(result.data.submission_id)],
                ['Rubric ID', shortId(result.data.rubric_id)],
                ['Evaluation profile', shortId(result.data.evaluation_profile_id)],
                ['Consensus method', result.data.method_id],
                ['Created', formatDate(result.data.created_at)],
                ['Finalized', formatDate(result.data.finalized_at)],
                ['Schema version', result.data.schema_version],
              ].map(([label, value]) => <div key={label}><dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt><dd className="mt-1.5 break-all text-sm font-medium">{value}</dd></div>)}
            </dl>
            <div className="mt-8 grid gap-4 border-t border-line pt-6 sm:grid-cols-2"><div className="rounded-xl bg-paper p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted">Report set commitment</p><p className="mt-2 break-all font-mono text-xs">{result.data.report_ids_hash}</p></div><div className="rounded-xl bg-paper p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted">Summary commitment</p><p className="mt-2 break-all font-mono text-xs">{result.data.summary_hash}</p></div></div>
            <Link to={`/submissions/${encodeURIComponent(result.data.submission_id)}`} className="button-secondary mt-6">View submission</Link>
          </div>
        </article>
      ) : null}
    </div>
  )
}
