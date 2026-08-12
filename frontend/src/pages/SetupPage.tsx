import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { EvaluationProfile } from 'sdk'

import { ErrorState } from '../components/PageState'
import { useCreateSetupProfile, useCreateSetupRubric, useRubric, useSetupStatus } from '../hooks/useAceQueries'
import { saveEvaluationProfileId } from '../lib/evaluationProfiles'
import { shortId } from '../lib/format'
import { useAce } from '../providers/AceContext'

function Status({ present, missingLabel = 'Not found' }: { present: boolean; missingLabel?: string }) {
  return <span className={present ? 'font-semibold text-emerald-700' : 'font-semibold text-amber-700'}>{present ? 'Exists' : missingLabel}</span>
}

export function SetupPage() {
  const { account, contract, connectWallet, switchToStudionet, isConnecting, isStudionet, walletChainId, walletError, diagnostics } = useAce()
  const status = useSetupStatus()
  const createProfile = useCreateSetupProfile()
  const createRubric = useCreateSetupRubric()
  const [createdProfileId, setCreatedProfileId] = useState<string | null>(null)
  const [verifiedProfile, setVerifiedProfile] = useState<EvaluationProfile | null>(null)
  const [profileRateLimited, setProfileRateLimited] = useState(false)
  const [profileTransactionHash, setProfileTransactionHash] = useState<string | null>(null)
  const [createdRubricId, setCreatedRubricId] = useState<string | null>(null)
  const createdRubric = useRubric(createdRubricId ?? '')
  const profile = verifiedProfile
  const rubric = createdRubric.data ?? status.existingRubric

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <div>
        <p className="text-sm font-semibold text-brand">Development setup</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Initialize ACE records</h1>
        <p className="mt-3 text-sm leading-6 text-muted">Create the first real evaluation profile and rubric on the connected Studio deployment. Nothing is written until you press a button.</p>
      </div>

      <section className="card divide-y divide-line">
        <div className="flex flex-col gap-2 p-5 sm:flex-row sm:justify-between"><span className="text-sm text-muted">Connected wallet</span><span className="font-mono text-sm">{account ? account : 'Not connected'}</span></div>
        <div className="flex flex-col gap-2 p-5 sm:flex-row sm:justify-between"><span className="text-sm text-muted">Current wallet chain</span><span className="font-mono text-sm">{walletChainId ?? 'Unavailable'}{walletChainId && <span className="ml-2 font-sans text-xs text-muted">{isStudionet ? 'GenLayer Studionet' : 'Wrong network'}</span>}</span></div>
        <div className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between"><span className="text-sm text-muted">Expected network</span><span className="flex items-center gap-3"><span className="text-sm font-semibold text-brand">GenLayer Studionet</span>{account && !isStudionet && <button type="button" className="button-secondary" onClick={() => void switchToStudionet()} disabled={isConnecting}>{isConnecting ? 'Switching…' : 'Switch to Studionet'}</button>}</span></div>
        <div className="flex flex-col gap-2 p-5 sm:flex-row sm:justify-between"><span className="text-sm text-muted">Contract address</span><span className="break-all font-mono text-sm">{contract?.address ?? 'Unavailable'}</span></div>
        <div className="flex flex-col gap-2 p-5 sm:flex-row sm:justify-between"><span className="text-sm text-muted">SDK diagnostics</span><span className="text-right text-xs text-muted">read client: {diagnostics.readClientInitialized ? 'initialized once' : 'not initialized'} · write client: {diagnostics.writeClientInitialized ? 'initialized once' : 'waiting for wallet'} · wallet chain: {diagnostics.walletChainId ?? 'unavailable'} · expected: {diagnostics.expectedChainId}</span></div>
        <div className="flex flex-col gap-2 p-5 sm:flex-row sm:justify-between"><span className="text-sm text-muted">Evaluation Profile</span><span><Status present={Boolean(profile)} missingLabel={profileRateLimited ? 'Transaction confirmed — verification temporarily rate-limited' : 'Not created'} />{profile && <span className="ml-2 font-mono text-xs text-muted">{shortId(profile.profile_id, 8)}</span>}</span></div>
        <div className="flex flex-col gap-2 p-5 sm:flex-row sm:justify-between"><span className="text-sm text-muted">Rubric</span><span><Status present={Boolean(rubric)} />{rubric && <span className="ml-2 font-mono text-xs text-muted">{shortId(rubric.rubric_id, 8)}</span>}</span></div>
      </section>

      {(walletError || createProfile.isError || createRubric.isError || createdRubric.isError || status.rubrics.isError) && <ErrorState error={walletError ?? createProfile.error ?? createRubric.error ?? createdRubric.error ?? status.rubrics.error} />}

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="card flex flex-col p-5">
          <h2 className="font-semibold">Academic General Evaluation</h2>
          <p className="mt-2 flex-1 text-sm leading-6 text-muted">Creates the default evaluator profile for this wallet.</p>
          {!account ? <button type="button" className="button-primary mt-5" onClick={() => void connectWallet()} disabled={isConnecting}>{isConnecting ? 'Connecting…' : 'Connect wallet'}</button> : !isStudionet ? <button type="button" className="button-primary mt-5" onClick={() => void switchToStudionet()} disabled={isConnecting}>{isConnecting ? 'Switching…' : 'Switch to Studionet'}</button> : <button type="button" className="button-primary mt-5" onClick={() => { void createProfile.mutateAsync().then((result) => { setProfileRateLimited(result.verificationRateLimited); setProfileTransactionHash(String(result.transactionHash)); if (result.profile) { saveEvaluationProfileId(result.profile.profile_id); setVerifiedProfile(result.profile); setCreatedProfileId(result.profile.profile_id) } }).catch(() => undefined) }} disabled={Boolean(profile) || Boolean(createdProfileId) || profileRateLimited || createProfile.isPending}>{createProfile.isPending ? 'Finalizing…' : profile ? 'Profile already exists' : profileRateLimited ? 'Verification temporarily rate-limited' : 'Create default Evaluation Profile'}</button>}
          {createdProfileId && <p className="mt-3 break-all text-xs text-emerald-700">Verified: {createdProfileId}</p>}
          {profileRateLimited && profileTransactionHash && <p className="mt-3 break-all text-xs text-amber-700">Transaction confirmed: {profileTransactionHash}</p>}
        </div>
        <div className="card flex flex-col p-5">
          <h2 className="font-semibold">Academic General Rubric</h2>
          <p className="mt-2 flex-1 text-sm leading-6 text-muted">100-point research-paper rubric with four criteria and three evaluators.</p>
          <button type="button" className="button-primary mt-5" onClick={() => { void createRubric.mutateAsync().then((rubricId) => setCreatedRubricId(rubricId)).catch(() => undefined) }} disabled={!account || !isStudionet || Boolean(rubric) || Boolean(createdRubricId) || status.rubrics.isPending || createRubric.isPending}>{createRubric.isPending ? 'Finalizing…' : rubric ? 'Rubric already exists' : !account ? 'Connect wallet first' : !isStudionet ? 'Switch to Studionet first' : 'Create default Rubric'}</button>
        </div>
      </section>

      <p className="text-sm text-muted"><Link className="font-semibold text-brand hover:text-brand-dark" to="/upload">Return to New submission</Link> after both records are verified.</p>
    </div>
  )
}
