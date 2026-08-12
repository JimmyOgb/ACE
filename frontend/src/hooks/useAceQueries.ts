import { useMutation, useQueries, useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { ACE_FINALIZATION_INTERVAL_MS, ACE_FINALIZATION_RETRIES, isStudionetRateLimitError, type AceTransaction, type CreateProfileArgs, type CreateRubricArgs, type EvaluationProfile, type SubmitForEvaluationArgs, type WriteTransactionResult } from 'sdk'

import { useAce } from '../providers/AceContext'
import { clearPendingEvaluationProfileTransaction, loadPendingEvaluationProfileTransaction, loadSavedEvaluationProfileIds, saveEvaluationProfileId, savePendingEvaluationProfileTransaction } from '../lib/evaluationProfiles'
import { enterStudioCooldown, studioCooldownDelay } from '../lib/studioCooldown'
import { STUDIO_SAFE_MODE } from '../lib/studioConfig'

export const aceKeys = {
  all: ['ace'] as const,
  submissions: () => [...aceKeys.all, 'submissions'] as const,
  submission: (id: string) => [...aceKeys.submissions(), id] as const,
  reports: (id: string) => [...aceKeys.submission(id), 'reports'] as const,
  report: (id: string) => [...aceKeys.all, 'report', id] as const,
  consensus: (id: string) => [...aceKeys.all, 'consensus', id] as const,
  rubrics: () => [...aceKeys.all, 'rubrics'] as const,
  rubric: (id: string) => [...aceKeys.rubrics(), id] as const,
  profile: (id: string) => [...aceKeys.all, 'profile', id] as const,
  transaction: (hash: string) => [...aceKeys.all, 'transaction', hash] as const,
}

const PROFILE_ID_PATTERN = /^ace-profile-\d+-0x[0-9a-fA-F]{40}$/
const RUBRIC_ID_PATTERN = /^ace-rubric-\d+-[a-z0-9-]+$/
const submissionWritePromises = new Map<string, Promise<WriteTransactionResult>>()

function singleFlightWrite(key: string, operation: () => Promise<WriteTransactionResult>): Promise<WriteTransactionResult> {
  const existing = submissionWritePromises.get(key)
  if (existing) return existing
  const promise = operation()
  submissionWritePromises.set(key, promise)
  void promise.catch(() => {
    if (submissionWritePromises.get(key) === promise) submissionWritePromises.delete(key)
  })
  return promise
}

async function callAce<T>(method: string, args: unknown, call: () => Promise<T>): Promise<T> {
  try {
    return await call()
  } catch (error) {
    console.error(`[ACE] ${method} failed`, { args, error })
    throw error
  }
}

function isLifecyclePendingStatus(status: string | undefined): boolean {
  return !status || ['registered', 'frozen', 'under_review', 'consensus_ready'].includes(status.toLowerCase())
}

async function callPollingAce<T>(method: string, args: unknown, call: () => Promise<T>): Promise<T> {
  try {
    return await callAce(method, args, call)
  } catch (error) {
    if (isStudionetRateLimitError(error)) enterStudioCooldown()
    throw error
  }
}

export function useEvaluationProfile(profileId: string) {
  const { contract } = useAce()
  const validProfileId = PROFILE_ID_PATTERN.test(profileId.trim())
  return useQuery({
    queryKey: aceKeys.profile(profileId),
    queryFn: () => callAce('get_profile', { profile_id: profileId }, () => contract!.get_profile(profileId, { retryAttempts: 0 })),
    enabled: Boolean(contract && validProfileId),
    retry: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60_000,
  })
}

export function useRubric(rubricId: string) {
  const { contract } = useAce()
  const validRubricId = RUBRIC_ID_PATTERN.test(rubricId.trim())
  return useQuery({
    queryKey: aceKeys.rubric(rubricId),
    queryFn: () => callAce('get_rubric', { rubric_id: rubricId }, () => contract!.get_rubric(rubricId, { retryAttempts: 0 })),
    enabled: Boolean(contract && validRubricId),
    retry: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60_000,
  })
}

export function useEvaluationProfiles(profileIds: string[]) {
  const { contract } = useAce()
  return useQueries({
    queries: profileIds.map((profileId) => ({
      queryKey: aceKeys.profile(profileId),
      queryFn: () => callAce('get_profile', { profile_id: profileId }, () => contract!.get_profile(profileId, { retryAttempts: 0 })),
      enabled: Boolean(contract && PROFILE_ID_PATTERN.test(profileId.trim())),
      retry: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60_000,
    })),
  })
}

const receiptPromises = new Map<string, Promise<AceTransaction>>()

function waitForReceiptOnce(contract: NonNullable<ReturnType<typeof useAce>['contract']>, transactionHash: string): Promise<AceTransaction> {
  const existing = receiptPromises.get(transactionHash)
  if (existing) return existing
  const promise = contract.waitForTransaction(transactionHash as WriteTransactionResult, {
    interval: ACE_FINALIZATION_INTERVAL_MS,
    retries: ACE_FINALIZATION_RETRIES,
  })
  receiptPromises.set(transactionHash, promise)
  void promise.catch(() => {
    if (receiptPromises.get(transactionHash) === promise) receiptPromises.delete(transactionHash)
  })
  return promise
}

export function useTransactionReceipt(transactionHash: string, enabled = true) {
  const { contract } = useAce()
  const [result, setResult] = useState<{ hash: string; data?: AceTransaction; error?: unknown }>({ hash: '' })
  const [retryNonce, setRetryNonce] = useState(0)
  useEffect(() => {
    if (!contract || !transactionHash || !enabled || STUDIO_SAFE_MODE) return
    let active = true
    void waitForReceiptOnce(contract, transactionHash).then(
      (data) => { if (active) queueMicrotask(() => setResult({ hash: transactionHash, data })) },
      (error) => { if (active) queueMicrotask(() => setResult({ hash: transactionHash, error })) },
    )
    return () => { active = false }
  }, [contract, enabled, retryNonce, transactionHash])
  const current = result.hash === transactionHash ? result : undefined
  const active = Boolean(contract && transactionHash && enabled && !STUDIO_SAFE_MODE)
  return {
    data: current?.data,
    error: current?.error,
    isPending: active && !current,
    isSuccess: Boolean(current?.data),
    isError: Boolean(current?.error),
    retry: () => {
      if (transactionHash && !receiptPromises.has(transactionHash)) {
        setResult({ hash: '' })
        setRetryNonce((value) => value + 1)
      }
    },
  }
}

export function useSubmissions(pollingEnabled = false) {
  const { contract } = useAce()
  return useQuery({
    queryKey: aceKeys.submissions(),
    queryFn: () => callPollingAce('list_submissions', { offset: 0n, limit: 50n }, () => contract!.list_submissions({ offset: 0n, limit: 50n }, { retryAttempts: 0 })),
    enabled: Boolean(contract && !STUDIO_SAFE_MODE),
    refetchInterval: () => {
      if (!pollingEnabled || STUDIO_SAFE_MODE) return false
      return studioCooldownDelay() || 15_000
    },
    retry: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  })
}

export function useSubmission(submissionId: string, pollingEnabled = false) {
  const { contract } = useAce()
  return useQuery({
    queryKey: aceKeys.submission(submissionId),
    queryFn: () => callPollingAce('get_submission', { submission_id: submissionId }, () => contract!.get_submission(submissionId, { retryAttempts: 0 })),
    enabled: Boolean(contract && submissionId && !STUDIO_SAFE_MODE),
    refetchInterval: (query) => {
      if (!pollingEnabled || STUDIO_SAFE_MODE || !isLifecyclePendingStatus(query.state.data?.status)) return false
      return studioCooldownDelay() || 15_000
    },
    retry: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  })
}

export function useSubmissionReports(submissionId: string) {
  const { contract } = useAce()
  return useQuery({
    queryKey: aceKeys.reports(submissionId),
    queryFn: async () => {
      const ids = await contract!.list_reports({ submission_id: submissionId, offset: 0n, limit: 50n }, { retryAttempts: 0 })
      return Promise.all(ids.map((id) => contract!.get_evaluation_report(id, { retryAttempts: 0 })))
    },
    enabled: Boolean(contract && submissionId),
    retry: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  })
}

export function useRubrics() {
  const { contract } = useAce()
  return useQuery({
    queryKey: aceKeys.rubrics(),
    queryFn: () => callAce('list_rubrics', { offset: 0n, limit: 50n }, () => contract!.list_rubrics({ offset: 0n, limit: 50n }, { retryAttempts: 0 })),
    enabled: Boolean(contract),
    retry: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60_000,
  })
}

export function useSetupStatus() {
  const { contract } = useAce()
  const rubrics = useRubrics()
  const existingRubric = rubrics.data?.find((rubric) => rubric.name === 'Academic General Rubric' && rubric.description_uri === DEFAULT_RUBRIC.description_uri)

  return {
    existingRubric,
    rubrics,
    enabled: Boolean(contract),
  }
}

const DEFAULT_PROFILE: CreateProfileArgs = {
  display_name: 'Academic General Evaluation',
  profile_uri: 'ace://profiles/academic-general-v1',
  profile_hash: 'sha256:0d78fde099749783885401ddb9140391090b47bd60ae1fb4d4ff997137463844',
  capabilities_hash: 'sha256:c738ad04cefd20ee3efb3a17f853c9ad6d419efc49e65931bc71d2be9ef9686c',
}

const DEFAULT_RUBRIC: CreateRubricArgs = {
  name: 'Academic General Rubric',
  description_uri: 'ace://rubrics/academic-general-v1',
  description_hash: 'sha256:26459fb81a875907b6d4eb4886ea5505540b346acb53e1d5b9a396c7ba4fe764',
  evaluation_type: 'research_paper',
  criteria_hash: 'sha256:331a83ec0029d819c9306b6df8e9f7775eabeae6983550a0c0b0010d5de4407a',
  minimum_score: 0n,
  maximum_score: 100n,
  passing_threshold: 60n,
  required_evaluator_count: 3n,
  allow_open_review: false,
  criteria_count: 4n,
  supersedes_rubric_id: '',
}

export function useCreateSetupProfile() {
  const { account, requireWritableContract } = useAce()
  const activeSetupRef = useRef<Promise<{ profile: EvaluationProfile | null; transactionHash: WriteTransactionResult; verificationRateLimited: boolean }> | null>(null)
  return useMutation({
    mutationFn: async (): Promise<{ profile: EvaluationProfile | null; transactionHash: WriteTransactionResult; verificationRateLimited: boolean }> => {
      if (activeSetupRef.current) return activeSetupRef.current

      const run = (async (): Promise<{ profile: EvaluationProfile | null; transactionHash: WriteTransactionResult; verificationRateLimited: boolean }> => {
      const contract = requireWritableContract()
      if (!account) throw new Error('Connect a wallet before creating an evaluation profile.')
      const savedProfileId = loadSavedEvaluationProfileIds().find((id) => id.toLowerCase().endsWith(`-0x${account.slice(2).toLowerCase()}`))
      if (savedProfileId) {
        const profile = await callAce('get_profile', { profile_id: savedProfileId }, () => contract.get_profile(savedProfileId, { retryAttempts: 0 }))
        clearPendingEvaluationProfileTransaction()
        return { profile, transactionHash: '' as WriteTransactionResult, verificationRateLimited: false }
      }
      const pendingHash = loadPendingEvaluationProfileTransaction(account) as WriteTransactionResult | null
      const hash = pendingHash ?? await callAce('create_profile', DEFAULT_PROFILE, () => contract.create_profile(DEFAULT_PROFILE))
      if (!pendingHash) savePendingEvaluationProfileTransaction(account, hash)
      console.info(pendingHash ? '[ACE] resuming profile transaction' : '[ACE] create_profile tx hash', hash)
      console.info('[ACE] waiting for finalization', hash)
      try {
        await callAce('waitForTransaction', { hash }, () => contract.waitForTransaction(hash, { interval: ACE_FINALIZATION_INTERVAL_MS, retries: ACE_FINALIZATION_RETRIES }))
        console.info('[ACE] transaction finalized', hash)
      } catch (error) {
        console.error('[ACE] transaction finalization failed', { hash, error })
        throw error
      }

      console.info('[ACE] discovering latest profile for owner', account)
      let profileId: string
      try {
        profileId = await callAce('get_latest_profile_id', { owner: account }, () => contract.getLatestProfileId(account, { retryAttempts: 0 }))
      } catch (error) {
        if (isStudionetRateLimitError(error)) {
          return { profile: null, transactionHash: hash, verificationRateLimited: true }
        }
        throw error
      }
      if (!profileId) {
        throw new Error('Transaction confirmed, but no evaluator profile is currently discoverable for this wallet.')
      }

      console.info('[ACE] verifying profile', profileId)
      let profile: EvaluationProfile
      try {
        profile = await callAce('get_profile', { profile_id: profileId }, () => contract.get_profile(profileId, { retryAttempts: 0 }))
      } catch (error) {
        console.error('[ACE] profile verification failed', { profileId, error })
        if (isStudionetRateLimitError(error)) {
          return { profile: null, transactionHash: hash, verificationRateLimited: true }
        }
        throw error
      }
      if (profile.owner.toLowerCase() !== account.toLowerCase()) {
        throw new Error('The discovered evaluator profile does not belong to the connected wallet.')
      }
      console.info('[ACE] profile verified', profile.profile_id)
      saveEvaluationProfileId(profile.profile_id)
      clearPendingEvaluationProfileTransaction()
      return { profile, transactionHash: hash, verificationRateLimited: false }
      })()

      activeSetupRef.current = run
      try {
        return await run
      } finally {
        if (activeSetupRef.current === run) activeSetupRef.current = null
      }
    },
  })
}

export function useCreateSetupRubric() {
  const { requireWritableContract } = useAce()
  const activeSetupRef = useRef<Promise<string> | null>(null)
  return useMutation({
    mutationFn: async () => {
      if (activeSetupRef.current) return activeSetupRef.current
      const run = (async () => {
      const contract = requireWritableContract()
      const hash = await callAce('create_rubric', DEFAULT_RUBRIC, () => contract.create_rubric(DEFAULT_RUBRIC))
      await callAce('waitForTransaction', { hash }, () => contract.waitForTransaction(hash, { interval: ACE_FINALIZATION_INTERVAL_MS, retries: ACE_FINALIZATION_RETRIES }))
      const rubrics = await callAce('list_rubrics', { offset: 0n, limit: 50n }, () => contract.list_rubrics({ offset: 0n, limit: 50n }, { retryAttempts: 0 }))
      const rubric = rubrics.find((item) => item.name === DEFAULT_RUBRIC.name && item.description_uri === DEFAULT_RUBRIC.description_uri)
      if (!rubric || !RUBRIC_ID_PATTERN.test(rubric.rubric_id)) throw new Error('The finalized rubric could not be verified using list_rubrics.')
      return rubric.rubric_id
      })()
      activeSetupRef.current = run
      try {
        return await run
      } finally {
        if (activeSetupRef.current === run) activeSetupRef.current = null
      }
    },
    retry: false,
  })
}

export function useConsensusResult(consensusResultId: string) {
  const { contract } = useAce()
  return useQuery({
    queryKey: aceKeys.consensus(consensusResultId),
    queryFn: () => contract!.get_consensus_result(consensusResultId, { retryAttempts: 0 }),
    enabled: Boolean(contract && consensusResultId),
    retry: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export function useSubmitForEvaluation() {
  const { requireWritableContract } = useAce()
  return useMutation({
    mutationFn: (args: SubmitForEvaluationArgs) => singleFlightWrite(
      `submit:${args.title}:${args.artifact_hash}:${args.metadata_hash}`,
      () => requireWritableContract().submit_for_evaluation(args),
    ),
    retry: false,
  })
}

export function useEvaluateSubmission() {
  const { requireWritableContract } = useAce()
  return useMutation({
    mutationFn: ({ submission_id, profile_id }: { submission_id: string; profile_id: string }) => singleFlightWrite(
      `evaluate:${submission_id}:${profile_id}`,
      () => requireWritableContract().evaluate_submission({ submission_id, profile_id }),
    ),
    retry: false,
  })
}

export function useFreezeSubmission() {
  const { requireWritableContract } = useAce()
  return useMutation({
    mutationFn: (submission_id: string) => singleFlightWrite(
      `freeze:${submission_id}`,
      () => requireWritableContract().freeze_submission({ submission_id }),
    ),
    retry: false,
  })
}
