import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { ErrorState } from '../components/PageState'
import { StatusBadge } from '../components/StatusBadge'
import {
  useEvaluateSubmission,
  useFreezeSubmission,
  useSubmission,
  useSubmissions,
  useTransactionReceipt,
  useTransactionReturn,
} from '../hooks/useAceQueries'
import { shortId, titleCase } from '../lib/format'
import { loadUploadIntent, updateUploadIntent } from '../lib/uploadIntent'
import { useAce } from '../providers/AceContext'

export function SubmissionProgressPage() {
  const { transactionHash = '' } = useParams()
  const navigate = useNavigate()
  const { account, connectWallet, isConnecting } = useAce()
  const [intent, setIntent] = useState(() => loadUploadIntent(transactionHash))
  const freezeStarted = useRef(false)
  const evaluationStarted = useRef(false)

  const registrationReceipt = useTransactionReceipt(transactionHash)
  const submissions = useSubmissions(registrationReceipt.isSuccess && !intent?.submissionId ? 2_000 : false)
  const discoveredSubmission = submissions.data?.find((item) => {
    if (!intent) return false
    return !intent.existingSubmissionIds.includes(item.submission_id)
      && item.artifact_hash === intent.artifactHash
      && item.title === intent.title
  })
  const submissionId = intent?.submissionId ?? discoveredSubmission?.submission_id ?? ''
  const submission = useSubmission(submissionId, submissionId ? 2_000 : false)
  const refetchSubmission = submission.refetch
  const freeze = useFreezeSubmission()
  const evaluate = useEvaluateSubmission()
  const freezeReceipt = useTransactionReceipt(intent?.freezeTransactionHash ?? '')
  const evaluationReceipt = useTransactionReceipt(intent?.evaluationTransactionHash ?? '')
  const evaluationReturn = useTransactionReturn(intent?.evaluationTransactionHash ?? '', evaluationReceipt.isSuccess)
  const returnedConsensusResultId = typeof evaluationReturn.data === 'string' ? evaluationReturn.data : ''
  const consensusResultId = intent?.consensusResultId ?? returnedConsensusResultId

  useEffect(() => {
    if (!intent?.submissionId && discoveredSubmission) {
      updateUploadIntent(transactionHash, { submissionId: discoveredSubmission.submission_id })
    }
  }, [discoveredSubmission, intent?.submissionId, transactionHash])

  useEffect(() => {
    if (!intent || !submissionId || !account || intent.freezeTransactionHash || freezeStarted.current) return
    if (submission.data?.status.toLowerCase() !== 'registered') return
    freezeStarted.current = true
    void freeze.mutateAsync(submissionId).then((hash) => {
      const updated = updateUploadIntent(transactionHash, { freezeTransactionHash: hash })
      if (updated) setIntent(updated)
    }).catch(() => { freezeStarted.current = false })
  }, [account, freeze, intent, submission.data?.status, submissionId, transactionHash])

  useEffect(() => {
    if (freezeReceipt.isSuccess) void refetchSubmission()
  }, [freezeReceipt.isSuccess, refetchSubmission])

  useEffect(() => {
    if (!intent || !submissionId || !account || intent.evaluationTransactionHash || evaluationStarted.current) return
    if (submission.data?.status.toLowerCase() !== 'frozen') return
    evaluationStarted.current = true
    void evaluate.mutateAsync({ submission_id: submissionId, profile_id: intent.profileId }).then((hash) => {
      const updated = updateUploadIntent(transactionHash, { evaluationTransactionHash: hash })
      if (updated) setIntent(updated)
    }).catch(() => { evaluationStarted.current = false })
  }, [account, evaluate, intent, submission.data?.status, submissionId, transactionHash])

  useEffect(() => {
    if (evaluationReceipt.isSuccess) void refetchSubmission()
  }, [evaluationReceipt.isSuccess, refetchSubmission])

  useEffect(() => {
    if (!returnedConsensusResultId || intent?.consensusResultId) return
    updateUploadIntent(transactionHash, { consensusResultId: returnedConsensusResultId })
  }, [intent?.consensusResultId, returnedConsensusResultId, transactionHash])

  useEffect(() => {
    if (submission.data?.status.toLowerCase() === 'finalized' && consensusResultId) {
      navigate(`/consensus/${encodeURIComponent(consensusResultId)}`, { replace: true })
    }
  }, [consensusResultId, navigate, submission.data?.status])

  const registrationFailed = registrationReceipt.data?.txExecutionResultName === 'FINISHED_WITH_ERROR'
  const freezeFailed = freezeReceipt.data?.txExecutionResultName === 'FINISHED_WITH_ERROR'
  const evaluationFailed = evaluationReceipt.data?.txExecutionResultName === 'FINISHED_WITH_ERROR'
  const lifecycleError = freeze.error ?? evaluate.error ?? evaluationReturn.error
  const currentStatus = submission.data?.status ?? discoveredSubmission?.status

  if (!intent) {
    return <div className="mx-auto max-w-3xl"><ErrorState error={new Error('Upload progress metadata is unavailable for this transaction.')} /></div>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <div>
        <p className="text-sm font-semibold text-brand">Submission progress</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Academic consensus workflow</h1>
        <p className="mt-3 text-sm leading-6 text-muted">The page refreshes contract state automatically and opens the consensus report after finalization.</p>
      </div>

      <section className="card p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-medium uppercase tracking-wide text-muted">Registration transaction</p><p className="mt-2 break-all font-mono text-sm">{transactionHash}</p></div>
          {currentStatus ? <StatusBadge status={currentStatus} /> : registrationReceipt.isPending ? <StatusBadge status="confirming" /> : null}
        </div>
        {submissionId && <p className="mt-4 text-xs text-muted">Submission <span className="font-mono text-ink">{shortId(submissionId)}</span></p>}
      </section>

      {(registrationReceipt.isError || lifecycleError) && <ErrorState error={registrationReceipt.error ?? lifecycleError} />}
      {(registrationFailed || freezeFailed || evaluationFailed) && <ErrorState error={new Error('A lifecycle transaction finalized with a contract execution error.')} />}

      {!account && registrationReceipt.isSuccess && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">Wallet connection required</p>
          <p className="mt-1">Reconnect the submitting wallet so ACE can freeze and evaluate the registered submission.</p>
          <button type="button" className="button-primary mt-3" onClick={() => void connectWallet()} disabled={isConnecting}>{isConnecting ? 'Connecting…' : 'Connect wallet'}</button>
        </div>
      )}

      <section className="card p-5 sm:p-7">
        <h2 className="text-lg font-semibold">Lifecycle</h2>
        <ol className="mt-6 space-y-5">
          <ProgressStep complete title="Document prepared" detail="Profile and rubric loaded from the contract." />
          <ProgressStep active={registrationReceipt.isPending} complete={registrationReceipt.isSuccess && !registrationFailed} title="Submission registered" detail={registrationReceipt.isPending ? 'Waiting for transaction finalization…' : transactionHash} />
          <ProgressStep active={submissions.isFetching && !submissionId} complete={Boolean(submissionId)} title="Submission indexed" detail={submissionId ? shortId(submissionId) : 'Refreshing contract submissions…'} />
          <ProgressStep active={freeze.isPending || freezeReceipt.isPending} complete={Boolean(currentStatus && currentStatus.toLowerCase() !== 'registered')} title="Submission frozen" detail={intent.freezeTransactionHash ? shortId(intent.freezeTransactionHash) : account ? 'Preparing freeze transaction…' : 'Wallet required'} />
          <ProgressStep active={evaluate.isPending || evaluationReceipt.isPending || ['under_review', 'consensus_ready'].includes(currentStatus?.toLowerCase() ?? '')} complete={currentStatus?.toLowerCase() === 'finalized'} title="AI consensus evaluation" detail={intent.evaluationTransactionHash ? shortId(intent.evaluationTransactionHash) : currentStatus === 'frozen' ? 'Preparing evaluation transaction…' : 'Starts after freezing'} />
          <ProgressStep active={currentStatus?.toLowerCase() === 'finalized' && !consensusResultId} complete={Boolean(consensusResultId)} title="Consensus report ready" detail={consensusResultId ? shortId(consensusResultId) : 'Waiting for finalized result…'} />
        </ol>
      </section>

      <div className="flex items-center justify-between gap-4 text-sm">
        <Link to="/" className="font-semibold text-brand">← Dashboard</Link>
        <span className="text-muted">{currentStatus ? titleCase(currentStatus) : 'Confirming registration'}</span>
      </div>
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
