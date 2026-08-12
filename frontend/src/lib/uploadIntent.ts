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

/**
 * Explicit development reset for abandoned upload/evaluation sessions.
 * This only touches session-scoped ACE upload intents; saved profiles, wallet
 * state, contract configuration, and the deployed address are not involved.
 */
export function clearStaleAceUploadEvaluationState(): number {
  const keysToRemove: string[] = []
  for (let index = 0; index < sessionStorage.length; index += 1) {
    const key = sessionStorage.key(index)
    if (key?.startsWith(PREFIX)) keysToRemove.push(key)
  }
  keysToRemove.forEach((key) => sessionStorage.removeItem(key))
  return keysToRemove.length
}

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
