import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'

import { ErrorState, LoadingState } from '../components/PageState'
import { StatusBadge } from '../components/StatusBadge'
import { useEvaluateSubmission, useFreezeSubmission, useSubmission, useSubmissionReports } from '../hooks/useAceQueries'
import { formatBasisPoints, formatDate, shortId, titleCase } from '../lib/format'
import { useAce } from '../providers/AceContext'

export function SubmissionPage() {
  const { submissionId = '' } = useParams()
  const [profileId, setProfileId] = useState('')
  const [transactionHash, setTransactionHash] = useState<string | null>(null)
  const { account, connectWallet, isConnecting } = useAce()
  const submission = useSubmission(submissionId)
  const reports = useSubmissionReports(submissionId)
  const freeze = useFreezeSubmission()
  const evaluate = useEvaluateSubmission()

  async function handleFreeze() {
    setTransactionHash(await freeze.mutateAsync(submissionId))
  }

  async function handleEvaluate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTransactionHash(await evaluate.mutateAsync({ submission_id: submissionId, profile_id: profileId }))
  }

  if (submission.isPending) return <LoadingState label="Loading submission…" />
  if (submission.isError) return <ErrorState error={submission.error} />
  if (!submission.data) return <ErrorState error={new Error('Submission not found.')} />

  const item = submission.data
  const status = item.status.toLowerCase()
  const actionError = freeze.error ?? evaluate.error

  return (
    <div className="space-y-8">
      <div>
        <Link to="/" className="text-sm font-semibold text-brand hover:text-brand-dark">← Dashboard</Link>
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div><div className="mb-3"><StatusBadge status={item.status} /></div><h1 className="text-3xl font-semibold tracking-tight">{item.title}</h1><p className="mt-2 break-all font-mono text-xs text-muted">{item.submission_id}</p></div>
          <a className="button-secondary" href={item.artifact_uri} target="_blank" rel="noreferrer">Open artifact</a>
        </div>
      </div>

      {transactionHash && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><p className="font-semibold">Transaction submitted</p><p className="mt-1 break-all font-mono text-xs">{transactionHash}</p></div>}
      {actionError && <ErrorState error={actionError} />}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="card p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Submission details</h2>
          <dl className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2">
            {[
              ['Evaluation type', titleCase(item.evaluation_type)],
              ['Rubric ID', shortId(item.rubric_id)],
              ['Requester', shortId(item.requester)],
              ['Created', formatDate(item.created_at)],
              ['Updated', formatDate(item.updated_at)],
              ['Profile ID', item.evaluation_profile_id ? shortId(item.evaluation_profile_id) : 'Not assigned'],
              ['Artifact hash', shortId(item.artifact_hash)],
              ['Metadata hash', shortId(item.metadata_hash)],
            ].map(([label, value]) => <div key={label}><dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt><dd className="mt-1.5 text-sm font-medium text-ink">{value}</dd></div>)}
          </dl>
          <div className="mt-6 border-t border-line pt-5"><p className="text-xs font-medium uppercase tracking-wide text-muted">Abstract commitment</p><p className="mt-2 break-words text-sm leading-6">{item.abstract_commitment}</p></div>
        </section>

        <aside className="card h-fit p-5">
          <h2 className="text-lg font-semibold">Evaluation workflow</h2>
          <ol className="mt-5 space-y-4 text-sm">
            {['registered', 'frozen', 'under_review', 'consensus_ready', 'finalized'].map((step, index) => {
              const steps = ['registered', 'frozen', 'under_review', 'consensus_ready', 'finalized']
              const complete = steps.indexOf(status) >= index
              return <li key={step} className="flex items-center gap-3"><span className={`grid size-6 place-items-center rounded-full text-xs font-bold ${complete ? 'bg-brand text-white' : 'bg-paper text-muted'}`}>{index + 1}</span><span className={complete ? 'font-medium text-ink' : 'text-muted'}>{titleCase(step)}</span></li>
            })}
          </ol>

          {!account && <button type="button" className="button-secondary mt-6 w-full" onClick={() => void connectWallet()} disabled={isConnecting}>{isConnecting ? 'Connecting…' : 'Connect wallet for actions'}</button>}
          {account && status === 'registered' && <button type="button" className="button-primary mt-6 w-full" onClick={() => void handleFreeze()} disabled={freeze.isPending}>{freeze.isPending ? 'Freezing…' : 'Freeze submission'}</button>}
          {account && status === 'frozen' && (
            <form className="mt-6" onSubmit={(event) => void handleEvaluate(event)}>
              <label><span className="label">Evaluation profile ID</span><input required className="field font-mono" value={profileId} onChange={(event) => setProfileId(event.target.value)} placeholder="profile identifier" /></label>
              <button className="button-primary mt-3 w-full" disabled={evaluate.isPending}>{evaluate.isPending ? 'Running consensus…' : 'Evaluate submission'}</button>
            </form>
          )}
          {status === 'finalized' && <Link to="/consensus" className="button-primary mt-6 w-full">Find consensus report</Link>}
        </aside>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Evaluation reports</h2><span className="text-sm text-muted">{reports.data?.length ?? 0} reports</span></div>
        {reports.isPending ? <LoadingState label="Loading reports…" /> : reports.isError ? <ErrorState error={reports.error} /> : reports.data?.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {reports.data.map((report) => <article key={report.report_id} className="card p-5"><div className="flex items-start justify-between gap-4"><div><p className="font-semibold">{titleCase(report.recommendation)}</p><p className="mt-1 font-mono text-xs text-muted">{shortId(report.report_id)}</p></div><StatusBadge status={report.status} /></div><dl className="mt-5 grid grid-cols-2 gap-4 text-sm"><div><dt className="text-muted">Total score</dt><dd className="mt-1 font-semibold">{report.total_score.toString()}</dd></div><div><dt className="text-muted">Confidence</dt><dd className="mt-1 font-semibold">{formatBasisPoints(report.confidence_basis_points)}</dd></div></dl><a href={report.summary_uri} target="_blank" rel="noreferrer" className="mt-5 inline-block text-sm font-semibold text-brand">Open summary →</a></article>)}
          </div>
        ) : <div className="card p-6 text-sm text-muted">No evaluation reports have been recorded yet.</div>}
      </section>
    </div>
  )
}
