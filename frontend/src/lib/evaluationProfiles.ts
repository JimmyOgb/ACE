const STORAGE_KEY = 'ace:evaluation-profile-ids'
const PENDING_TRANSACTION_KEY = 'ace:pending-profile-transaction'

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
    const value: unknown = JSON.parse(localStorage.getItem(PENDING_TRANSACTION_KEY) ?? 'null')
    if (!value || typeof value !== 'object') return null
    const storedAccount = (value as { account?: unknown }).account
    const hash = (value as { hash?: unknown }).hash
    return typeof storedAccount === 'string' && storedAccount.toLowerCase() === account.toLowerCase() && typeof hash === 'string' && hash.startsWith('0x')
      ? hash
      : null
  } catch {
    return null
  }
}

export function savePendingEvaluationProfileTransaction(account: string, hash: string): void {
  localStorage.setItem(PENDING_TRANSACTION_KEY, JSON.stringify({ account, hash }))
}

export function clearPendingEvaluationProfileTransaction(): void {
  localStorage.removeItem(PENDING_TRANSACTION_KEY)
}
