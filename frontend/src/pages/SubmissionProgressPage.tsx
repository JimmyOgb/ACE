import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'

import { ErrorState } from '../components/PageState'
import { StatusBadge } from '../components/StatusBadge'
import { useSubmissions, useTransactionReceipt } from '../hooks/useAceQueries'
import { shortId } from '../lib/format'
import { loadUploadIntent } from '../lib/uploadIntent'

export function SubmissionProgressPage() {
  const { transactionHash = '' } = useParams()
  const intent = loadUploadIntent(transactionHash)
  const receipt = useTransactionReceipt(transactionHash)
  const submissions = useSubmissions()
  const refetchSubmissions = submissions.refetch

  useEffect(() => {
    if (receipt.isSuccess) void refetchSubmissions()
  }, [receipt.isSuccess, refetchSubmissions])

  const submission = submissions.data?.find((item) => {
    if (!intent) return false
    return !intent.existingSubmissionIds.includes(item.submission_id)
      && item.artifact_hash === intent.artifactHash
      && item.title === intent.title
  })
  const executionFailed = receipt.data?.txExecutionResultName === 'FINISHED_WITH_ERROR'

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <div>
        <p className="text-sm font-semibold text-brand">Submission progress</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Registering your document</h1>
        <p className="mt-3 text-sm leading-6 text-muted">ACE is confirming the transaction and indexing the new submission.</p>
      </div>

      <section className="card p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-medium uppercase tracking-wide text-muted">Transaction hash</p><p className="mt-2 break-all font-mono text-sm">{transactionHash}</p></div>
          {receipt.isPending ? <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-600/20">Confirming</span> : receipt.isSuccess ? <StatusBadge status={receipt.data.statusName ?? 'confirmed'} /> : null}
        </div>
      </section>

      {receipt.isError && <ErrorState error={receipt.error} />}
      {executionFailed && <ErrorState error={new Error('The transaction reached consensus but contract execution did not succeed.')} />}

      <section className="card p-5 sm:p-7">
        <h2 className="text-lg font-semibold">Progress</h2>
        <ol className="mt-6 space-y-5">
          <ProgressStep complete title="Document prepared" detail="Text extracted and commitments generated locally." />
          <ProgressStep complete title="Transaction submitted" detail={shortId(transactionHash)} />
          <ProgressStep active={receipt.isPending} complete={receipt.isSuccess && !executionFailed} title="Network confirmation" detail={receipt.isPending ? 'Waiting for GenLayer consensus…' : receipt.data?.statusName ?? 'Pending'} />
          <ProgressStep active={receipt.isSuccess && submissions.isFetching} complete={Boolean(submission)} title="Submission indexed" detail={submission ? shortId(submission.submission_id) : receipt.isSuccess ? 'Locating the registered submission…' : 'Starts after confirmation'} />
        </ol>
      </section>

      {submission ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
          <p className="font-semibold text-emerald-900">Submission registered successfully</p>
          <p className="mt-1 text-sm text-emerald-800">Your selected evaluation profile has been retained for the review stage.</p>
          <Link className="button-primary mt-5" to={`/submissions/${encodeURIComponent(submission.submission_id)}`} state={{ profileId: intent?.profileId }}>Continue to submission</Link>
        </section>
      ) : receipt.isSuccess && !executionFailed ? (
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>The transaction is confirmed, but the submission is not visible in the current page of results yet.</span>
          <button type="button" className="button-secondary shrink-0" onClick={() => void submissions.refetch()} disabled={submissions.isFetching}>{submissions.isFetching ? 'Refreshing…' : 'Refresh submissions'}</button>
        </div>
      ) : null}

      <Link to="/" className="inline-block text-sm font-semibold text-brand">← Return to dashboard</Link>
    </div>
  )
}

function ProgressStep({ active = false, complete = false, detail, title }: { active?: boolean; complete?: boolean; detail: string; title: string }) {
  return (
    <li className="flex gap-4">
      <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${complete ? 'bg-brand text-white' : active ? 'bg-brand-soft text-brand ring-2 ring-brand/20' : 'bg-paper text-muted'}`}>{complete ? '✓' : active ? '…' : '·'}</span>
      <div><p className={complete || active ? 'font-medium text-ink' : 'font-medium text-muted'}>{title}</p><p className="mt-1 break-all text-xs text-muted">{detail}</p></div>
    </li>
  )
}
