import {
  ACE_DEPLOYED_CONTRACT_ADDRESS,
  createAcademicConsensusEngineContract,
  createAceClient,
  type Address,
  type GenLayerClientConfig,
} from 'sdk'
import { useMemo, useState, type ReactNode } from 'react'

import { AceContext, type AceContextValue } from './AceContext'

function configuredAddress(): Address | null {
  const environmentAddress = import.meta.env.VITE_ACE_CONTRACT_ADDRESS as string | undefined
  const value = environmentAddress?.trim() || ACE_DEPLOYED_CONTRACT_ADDRESS
  return typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value)
    ? (value as Address)
    : null
}

export function AceProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Address | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const address = configuredAddress()
  const endpoint = import.meta.env.VITE_GENLAYER_RPC_URL as string | undefined

  const contract = useMemo(() => {
    if (!address) return null

    const read: GenLayerClientConfig = endpoint ? { endpoint } : {}
    let write: GenLayerClientConfig | undefined
    if (account && window.ethereum) {
      write = {
        ...(endpoint ? { endpoint } : {}),
        account,
        provider: window.ethereum as GenLayerClientConfig['provider'],
      }
    }

    const client = createAceClient({ read, ...(write ? { write } : {}) })
    return createAcademicConsensusEngineContract(client, address)
  }, [account, address, endpoint])

  async function connectWallet() {
    if (!window.ethereum) throw new Error('No compatible browser wallet was detected.')
    setIsConnecting(true)
    try {
      const result = await window.ethereum.request({ method: 'eth_requestAccounts' })
      if (!Array.isArray(result) || typeof result[0] !== 'string') {
        throw new Error('The wallet did not return an account.')
      }
      setAccount(result[0] as Address)
    } finally {
      setIsConnecting(false)
    }
  }

  function requireWritableContract() {
    if (!contract) throw new Error('VITE_ACE_CONTRACT_ADDRESS is invalid.')
    if (!account) throw new Error('Connect a wallet before submitting a transaction.')
    return contract
  }

  const value: AceContextValue = {
    account,
    configError: address ? null : 'VITE_ACE_CONTRACT_ADDRESS is invalid.',
    contract,
    connectWallet,
    isConnecting,
    requireWritableContract,
  }

  return <AceContext.Provider value={value}>{children}</AceContext.Provider>
}
