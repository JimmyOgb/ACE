import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { ErrorState, LoadingState } from '../components/PageState'
import { StatusBadge } from '../components/StatusBadge'
import {
  useConsensusResult,
  useEvaluationProfile,
  useRubric,
  useSubmission,
  useSubmissionReports,
} from '../hooks/useAceQueries'
import { formatBasisPoints, formatDate, shortId, titleCase } from '../lib/format'

const criteria = ['Grammar', 'Reasoning', 'Structure', 'Originality'] as const

function normalizedDecision(value: string) {
  return value.trim().toLowerCase().replaceAll('-', '_').replaceAll(' ', '_')
}

function formatScore(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2)
}

export function ConsensusReportPage() {
  const params = useParams()
  const navigate = useNavigate()
  const consensusResultId = params.consensusResultId ?? ''
  const [searchId, setSearchId] = useState(consensusResultId)
  const consensus = useConsensusResult(consensusResultId)
  const submission = useSubmission(consensus.data?.submission_id ?? '')
  const profile = useEvaluationProfile(consensus.data?.evaluation_profile_id ?? '')
  const rubric = useRubric(consensus.data?.rubric_id ?? '')
  const reports = useSubmissionReports(consensus.data?.submission_id ?? '')

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = searchId.trim()
    if (value) navigate(`/consensus/${encodeURIComponent(value)}`)
  }

  const reportItems = reports.data ?? []
  const averageScore = reportItems.length
    ? reportItems.reduce((sum, report) => sum + Number(report.total_score), 0) / reportItems.length
    : null
  const agreementPercentage = reportItems.length && consensus.data
    ? reportItems.filter((report) => normalizedDecision(report.recommendation) === normalizedDecision(consensus.data.decision)).length / reportItems.length * 100
    : null
  const detailLoading = submission.isPending || profile.isPending || rubric.isPending || reports.isPending
  const detailError = submission.error ?? profile.error ?? rubric.error
  const criterionCommitments = [...new Set(reportItems.map((report) => report.criterion_scores_hash).filter(Boolean))]

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <p className="text-sm font-semibold text-brand">Consensus</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Consensus report</h1>
        <p className="mt-3 text-sm leading-6 text-muted">Review the final decision and its verifiable evaluator references.</p>
      </div>

      <form className="card flex flex-col gap-3 p-4 sm:flex-row" onSubmit={handleSearch}>
        <input className="field mt-0 flex-1 font-mono" value={searchId} onChange={(event) => setSearchId(event.target.value)} placeholder="Enter a consensus result ID" aria-label="Consensus result ID" />
        <button className="button-primary">Load report</button>
      </form>

      {!consensusResultId ? (
        <EmptyReportPrompt />
      ) : consensus.isPending ? (
        <LoadingState label="Loading consensus report…" />
      ) : consensus.isError ? (
        <ErrorState error={consensus.error} />
      ) : consensus.data ? (
        <>
          {detailLoading && <LoadingState label="Loading submission, profile, rubric, and evaluator reports…" />}
          {detailError && <ErrorState error={detailError} />}

          <section className="card overflow-hidden">
            <div className="border-b border-line bg-brand-soft/50 p-6 sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <StatusBadge status={submission.data?.status ?? consensus.data.status} />
                  <p className="mt-5 text-sm font-medium text-muted">Final decision</p>
                  <h2 className="mt-1 text-3xl font-semibold tracking-tight text-brand-dark">{titleCase(consensus.data.decision)}</h2>
                  <p className="mt-2 text-sm text-muted">Finalized {formatDate(consensus.data.finalized_at)}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Metric label="Final score" value={averageScore === null ? 'Unavailable' : `${formatScore(averageScore)} / ${rubric.data?.maximum_score.toString() ?? '—'}`} />
                  <Metric label="Agreement" value={agreementPercentage === null ? 'Unavailable' : `${agreementPercentage.toFixed(1)}%`} />
                  <Metric label="Confidence" value={formatBasisPoints(consensus.data.confidence_basis_points)} />
                </div>
              </div>
              {reportItems.length > 0 && <p className="mt-5 text-xs leading-5 text-muted">Final score is the arithmetic mean of available evaluator totals. Agreement is the share of evaluator recommendations matching the final decision; neither derived metric is stored directly on `ConsensusResult`.</p>}
            </div>

            <div className="grid gap-0 divide-y divide-line lg:grid-cols-3 lg:divide-x lg:divide-y-0">
              <InfoSection title="Submission">
                <InfoRow label="Title" value={submission.data?.title ?? 'Unavailable'} />
                <InfoRow label="Submission ID" value={shortId(consensus.data.submission_id)} mono />
                <InfoRow label="Status" value={submission.data ? titleCase(submission.data.status) : titleCase(consensus.data.status)} />
                <InfoRow label="Evaluation type" value={submission.data ? titleCase(submission.data.evaluation_type) : 'Unavailable'} />
                <InfoRow label="Submitted" value={submission.data ? formatDate(submission.data.created_at) : 'Unavailable'} />
              </InfoSection>
              <InfoSection title="Evaluation profile">
                <InfoRow label="Name" value={profile.data?.display_name ?? 'Unavailable'} />
                <InfoRow label="Profile ID" value={shortId(consensus.data.evaluation_profile_id)} mono />
                <InfoRow label="Status" value={profile.data ? titleCase(profile.data.status) : 'Unavailable'} />
                <InfoRow label="Reputation" value={profile.data ? formatBasisPoints(profile.data.reputation_basis_points) : 'Unavailable'} />
              </InfoSection>
              <InfoSection title="Rubric">
                <InfoRow label="Name" value={rubric.data?.name ?? 'Unavailable'} />
                <InfoRow label="Rubric ID" value={shortId(consensus.data.rubric_id)} mono />
                <InfoRow label="Passing threshold" value={rubric.data ? rubric.data.passing_threshold.toString() : 'Unavailable'} />
                <InfoRow label="Score range" value={rubric.data ? `${rubric.data.minimum_score.toString()}–${rubric.data.maximum_score.toString()}` : 'Unavailable'} />
              </InfoSection>
            </div>
          </section>

          <section>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Criterion breakdown</h2>
              <p className="mt-1 text-sm text-muted">Criterion-level values are displayed only when exposed by the contract ABI.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {criteria.map((criterion) => (
                <article key={criterion} className="card p-5">
                  <div className="flex items-start justify-between gap-4"><h3 className="font-semibold">{criterion}</h3><span className="rounded-lg bg-paper px-2.5 py-1 text-xs font-semibold text-muted">Committed</span></div>
                  <dl className="mt-5 grid grid-cols-2 gap-4"><div><dt className="text-xs uppercase tracking-wide text-muted">Score</dt><dd className="mt-1 text-lg font-semibold">Unavailable</dd></div><div><dt className="text-xs uppercase tracking-wide text-muted">Maximum</dt><dd className="mt-1 text-lg font-semibold">Unavailable</dd></div></dl>
                  <div className="mt-5 border-t border-line pt-4"><p className="text-xs uppercase tracking-wide text-muted">Explanation</p><p className="mt-2 text-sm leading-6 text-muted">The current SDK returns a criterion score commitment, not individual {criterion.toLowerCase()} values or explanations.</p></div>
                </article>
              ))}
            </div>
            {criterionCommitments.length > 0 && <div className="mt-4 rounded-xl border border-line bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted">Criterion score commitments</p>{criterionCommitments.map((hash) => <p key={hash} className="mt-2 break-all font-mono text-xs text-ink">{hash}</p>)}</div>}
          </section>

          <section className="card p-6 sm:p-8">
            <div className="flex items-start gap-4"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft font-bold text-brand">AI</div><div><p className="text-xs font-semibold uppercase tracking-wider text-brand">AI consensus summary</p><h2 className="mt-1 text-lg font-semibold">Verifiable summary commitment</h2></div></div>
            <p className="mt-5 text-sm leading-6 text-muted">The contract ABI exposes the consensus summary hash but does not return plaintext summary content. This commitment can be used to verify the canonical off-chain summary without substituting generated or unverified text.</p>
            <div className="mt-4 rounded-xl bg-paper p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted">Summary hash</p><p className="mt-2 break-all font-mono text-xs">{consensus.data.summary_hash}</p></div>
          </section>

          <section>
            <div className="mb-4 flex items-end justify-between gap-4"><div><h2 className="text-lg font-semibold">Evaluator report references</h2><p className="mt-1 text-sm text-muted">Reports included for this submission when available.</p></div><span className="text-sm text-muted">{reportItems.length} reports</span></div>
            {reports.isError ? <ErrorState error={reports.error} /> : reports.isPending ? <LoadingState label="Loading evaluator reports…" /> : reportItems.length === 0 ? (
              <div className="card p-6 text-sm text-muted">No evaluator report references are available for this submission.</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {reportItems.map((report) => (
                  <article key={report.report_id} className="card p-5">
                    <div className="flex items-start justify-between gap-4"><div><p className="font-semibold">{titleCase(report.recommendation)}</p><p className="mt-1 font-mono text-xs text-muted">{shortId(report.report_id)}</p></div><StatusBadge status={report.status} /></div>
                    <dl className="mt-5 grid grid-cols-2 gap-4 text-sm"><InfoCell label="Score" value={`${report.total_score.toString()} / ${rubric.data?.maximum_score.toString() ?? '—'}`} /><InfoCell label="Confidence" value={formatBasisPoints(report.confidence_basis_points)} /><InfoCell label="Evaluator" value={shortId(report.evaluator)} /><InfoCell label="Submitted" value={formatDate(report.submitted_at)} /></dl>
                    <div className="mt-5 border-t border-line pt-4"><p className="text-xs uppercase tracking-wide text-muted">Criterion commitment</p><p className="mt-2 break-all font-mono text-xs">{report.criterion_scores_hash}</p></div>
                    {report.summary_uri && <a href={report.summary_uri} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm font-semibold text-brand">Open report summary →</a>}
                  </article>
                ))}
              </div>
            )}
          </section>

          <div className="flex flex-wrap gap-3"><Link to={`/submissions/${encodeURIComponent(consensus.data.submission_id)}`} className="button-primary">View submission</Link><Link to="/" className="button-secondary">Dashboard</Link></div>
        </>
      ) : null}
    </div>
  )
}

function EmptyReportPrompt() {
  return <div className="card p-10 text-center"><div className="mx-auto grid size-12 place-items-center rounded-xl bg-brand-soft font-bold text-brand">✓</div><h2 className="mt-4 text-lg font-semibold">Enter a result identifier</h2><p className="mt-2 text-sm text-muted">Consensus data is retrieved through the ACE TypeScript SDK.</p></div>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-28 rounded-2xl bg-white p-4 text-center shadow-sm"><p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>
}

function InfoSection({ children, title }: { children: React.ReactNode; title: string }) {
  return <section className="p-6"><h3 className="font-semibold">{title}</h3><dl className="mt-5 space-y-4">{children}</dl></section>
}

function InfoRow({ label, mono = false, value }: { label: string; mono?: boolean; value: string }) {
  return <div><dt className="text-xs uppercase tracking-wide text-muted">{label}</dt><dd className={`mt-1 break-all text-sm font-medium ${mono ? 'font-mono' : ''}`}>{value}</dd></div>
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-muted">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>
}
