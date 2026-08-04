import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { SubmitForEvaluationArgs } from 'sdk'

import { useAce } from '../providers/AceContext'

export const aceKeys = {
  all: ['ace'] as const,
  submissions: () => [...aceKeys.all, 'submissions'] as const,
  submission: (id: string) => [...aceKeys.submissions(), id] as const,
  reports: (id: string) => [...aceKeys.submission(id), 'reports'] as const,
  report: (id: string) => [...aceKeys.all, 'report', id] as const,
  consensus: (id: string) => [...aceKeys.all, 'consensus', id] as const,
  rubrics: () => [...aceKeys.all, 'rubrics'] as const,
}

export function useSubmissions() {
  const { contract } = useAce()
  return useQuery({
    queryKey: aceKeys.submissions(),
    queryFn: () => contract!.list_submissions({ offset: 0n, limit: 50n }),
    enabled: Boolean(contract),
  })
}

export function useSubmission(submissionId: string) {
  const { contract } = useAce()
  return useQuery({
    queryKey: aceKeys.submission(submissionId),
    queryFn: () => contract!.get_submission(submissionId),
    enabled: Boolean(contract && submissionId),
  })
}

export function useSubmissionReports(submissionId: string) {
  const { contract } = useAce()
  return useQuery({
    queryKey: aceKeys.reports(submissionId),
    queryFn: async () => {
      const ids = await contract!.list_reports({ submission_id: submissionId, offset: 0n, limit: 50n })
      return Promise.all(ids.map((id) => contract!.get_evaluation_report(id)))
    },
    enabled: Boolean(contract && submissionId),
  })
}

export function useRubrics() {
  const { contract } = useAce()
  return useQuery({
    queryKey: aceKeys.rubrics(),
    queryFn: () => contract!.list_rubrics({ offset: 0n, limit: 100n }),
    enabled: Boolean(contract),
  })
}

export function useConsensusResult(consensusResultId: string) {
  const { contract } = useAce()
  return useQuery({
    queryKey: aceKeys.consensus(consensusResultId),
    queryFn: () => contract!.get_consensus_result(consensusResultId),
    enabled: Boolean(contract && consensusResultId),
  })
}

export function useSubmitForEvaluation() {
  const { requireWritableContract } = useAce()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: SubmitForEvaluationArgs) => requireWritableContract().submit_for_evaluation(args),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: aceKeys.submissions() }),
  })
}

export function useEvaluateSubmission() {
  const { requireWritableContract } = useAce()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ submission_id, profile_id }: { submission_id: string; profile_id: string }) =>
      requireWritableContract().evaluate_submission({ submission_id, profile_id }),
    onSuccess: (_hash, variables) => {
      void queryClient.invalidateQueries({ queryKey: aceKeys.submission(variables.submission_id) })
      void queryClient.invalidateQueries({ queryKey: aceKeys.reports(variables.submission_id) })
    },
  })
}

export function useFreezeSubmission() {
  const { requireWritableContract } = useAce()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (submission_id: string) => requireWritableContract().freeze_submission({ submission_id }),
    onSuccess: (_hash, submissionId) => {
      void queryClient.invalidateQueries({ queryKey: aceKeys.submission(submissionId) })
      void queryClient.invalidateQueries({ queryKey: aceKeys.submissions() })
    },
  })
}
