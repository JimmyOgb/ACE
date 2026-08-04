export interface UploadIntent {
  artifactHash: string
  createdAt: string
  existingSubmissionIds: string[]
  profileId: string
  title: string
  transactionHash: string
  submissionId?: string
  freezeTransactionHash?: string
  evaluationTransactionHash?: string
  consensusResultId?: string
}

const PREFIX = 'ace:upload:'

export function saveUploadIntent(intent: UploadIntent) {
  sessionStorage.setItem(`${PREFIX}${intent.transactionHash}`, JSON.stringify(intent))
}

export function loadUploadIntent(transactionHash: string): UploadIntent | null {
  const value = sessionStorage.getItem(`${PREFIX}${transactionHash}`)
  if (!value) return null
  try {
    return JSON.parse(value) as UploadIntent
  } catch {
    return null
  }
}

export function updateUploadIntent(transactionHash: string, updates: Partial<UploadIntent>) {
  const current = loadUploadIntent(transactionHash)
  if (!current) return null
  const updated = { ...current, ...updates }
  saveUploadIntent(updated)
  return updated
}
