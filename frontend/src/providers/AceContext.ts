import { createContext, useContext } from 'react'
import type { AcademicConsensusEngineContract, Address } from 'sdk'

export interface AceContextValue {
  account: Address | null
  configError: string | null
  contract: AcademicConsensusEngineContract | null
  connectWallet: () => Promise<void>
  isConnecting: boolean
  requireWritableContract: () => AcademicConsensusEngineContract
}

export const AceContext = createContext<AceContextValue | null>(null)

export function useAce() {
  const value = useContext(AceContext)
  if (!value) throw new Error('useAce must be used within AceProvider')
  return value
}
