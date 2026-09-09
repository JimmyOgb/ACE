import { ACE_DEPLOYED_CONTRACT_ADDRESS } from 'sdk'

const configuredContractAddress = (import.meta.env.VITE_ACE_CONTRACT_ADDRESS as string | undefined)?.trim().toLowerCase()
  || ACE_DEPLOYED_CONTRACT_ADDRESS.toLowerCase()
// Profile sequences are deployment-local, so cached IDs must never cross
// contract deployments. This also prevents a prior ACE deployment's ID from
// being sent to get_profile on the current deployment.
const STORAGE_KEY = `ace:evaluation-profile-ids:${configuredContractAddress}`
function pendingTransactionKey(kind: 'profile' | 'rubric', account: string): string {
  return `ace:pending-${kind}-transaction:${configuredContractAddress}:${account.toLowerCase()}`
}

export function loadSavedEvaluationProfileIds(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && id.trim() !== '') : []
  } catch {
    return []
  }
}

export function saveEvaluationProfileId(profileId: string): void {
  const ids = loadSavedEvaluationProfileIds()
  if (!ids.includes(profileId)) localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids, profileId]))
}

export function loadPendingEvaluationProfileTransaction(account: string): string | null {
  try {
    const value: unknown = localStorage.getItem(pendingTransactionKey('profile', account))
    return typeof value === 'string' && value.startsWith('0x') ? value : null
  } catch {
    return null
  }
}

export function savePendingEvaluationProfileTransaction(account: string, hash: string): void {
  localStorage.setItem(pendingTransactionKey('profile', account), hash)
}

export function clearPendingEvaluationProfileTransaction(account: string): void {
  localStorage.removeItem(pendingTransactionKey('profile', account))
}

export function loadPendingEvaluationRubricTransaction(account: string): string | null {
  try {
    const value: unknown = localStorage.getItem(pendingTransactionKey('rubric', account))
    return typeof value === 'string' && value.startsWith('0x') ? value : null
  } catch {
    return null
  }
}

export function savePendingEvaluationRubricTransaction(account: string, hash: string): void {
  localStorage.setItem(pendingTransactionKey('rubric', account), hash)
}

export function clearPendingEvaluationRubricTransaction(account: string): void {
  localStorage.removeItem(pendingTransactionKey('rubric', account))
}
