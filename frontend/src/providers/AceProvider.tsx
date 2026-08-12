import { ACE_DEPLOYED_CONTRACT_ADDRESS, type Address, type GenLayerClientConfig } from 'sdk'
import { getAceClientDiagnostics, getAceContract } from '../lib/aceClients'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { AceContext, type AceContextValue } from './AceContext'

function configuredAddress(): Address | null {
  const environmentAddress = import.meta.env.VITE_ACE_CONTRACT_ADDRESS as string | undefined
  const value = environmentAddress?.trim() || ACE_DEPLOYED_CONTRACT_ADDRESS
  return typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value)
    ? (value as Address)
    : null
}

const STUDIONET_CHAIN_ID = '0xf22f'

function walletErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? (error as { code?: unknown }).code
    : undefined
  if (code === 4001 || code === '4001') return 'MetaMask rejected the request. Connect to GenLayer Studionet before writing to ACE.'
  const message = error instanceof Error ? error.message : String(error)
  const normalized = message.toLowerCase()
  if (normalized.includes('rate limit') || normalized.includes('too many requests') || normalized.includes('429')) {
    return 'Studionet is temporarily rate limited. Please wait a moment and try again.'
  }
  if (normalized.includes('wrong network') || normalized.includes('chain')) {
    return 'MetaMask is on the wrong network. Switch to GenLayer Studionet (chain 61999).'
  }
  return error instanceof Error ? error.message : 'The wallet request could not be completed.'
}

export function AceProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Address | null>(null)
  const [walletChainId, setWalletChainId] = useState<string | null>(null)
  const [walletError, setWalletError] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const address = configuredAddress()
  const contract = useMemo(() => {
    if (!address) return null
    return getAceContract(address, account, window.ethereum as GenLayerClientConfig['provider'] | undefined)
  }, [account, address])

  const refreshWalletState = useCallback(async () => {
    if (!window.ethereum) {
      setAccount(null)
      setWalletChainId(null)
      return
    }
    const [accounts, chainId] = await Promise.all([
      window.ethereum.request({ method: 'eth_accounts' }),
      window.ethereum.request({ method: 'eth_chainId' }),
    ])
    setAccount(Array.isArray(accounts) && typeof accounts[0] === 'string' ? accounts[0] as Address : null)
    setWalletChainId(typeof chainId === 'string' ? chainId.toLowerCase() : null)
  }, [])

  useEffect(() => {
    void Promise.resolve().then(refreshWalletState)
    const provider = window.ethereum
    if (!provider?.on) return
    const onAccountsChanged = () => { void refreshWalletState() }
    const onChainChanged = () => { void refreshWalletState() }
    provider.on('accountsChanged', onAccountsChanged)
    provider.on('chainChanged', onChainChanged)
    return () => {
      provider.removeListener?.('accountsChanged', onAccountsChanged)
      provider.removeListener?.('chainChanged', onChainChanged)
    }
  }, [refreshWalletState])

  const connectToStudionet = useCallback(async (connectedAccount: Address) => {
    if (!window.ethereum) throw new Error('No compatible browser wallet was detected.')
    const configured = configuredAddress()
    if (!configured) throw new Error('VITE_ACE_CONTRACT_ADDRESS is invalid.')
    await getAceContract(configured, connectedAccount, window.ethereum as GenLayerClientConfig['provider']).client.write.connect('studionet')
  }, [])

  async function connectWallet() {
    if (!window.ethereum) {
      setWalletError('No compatible browser wallet was detected.')
      return
    }
    setIsConnecting(true)
    setWalletError(null)
    try {
      const result = await window.ethereum.request({ method: 'eth_requestAccounts' })
      if (!Array.isArray(result) || typeof result[0] !== 'string') {
        throw new Error('The wallet did not return an account.')
      }
      const connectedAccount = result[0] as Address
      setAccount(connectedAccount)
      await connectToStudionet(connectedAccount)
      await refreshWalletState()
    } catch (error) {
      setWalletError(walletErrorMessage(error))
    } finally {
      setIsConnecting(false)
    }
  }

  async function switchToStudionet() {
    if (!account) {
      await connectWallet()
      return
    }
    setIsConnecting(true)
    setWalletError(null)
    try {
      await connectToStudionet(account)
      await refreshWalletState()
    } catch (error) {
      setWalletError(walletErrorMessage(error))
      await refreshWalletState().catch(() => undefined)
    } finally {
      setIsConnecting(false)
    }
  }

  function requireWritableContract() {
    if (!contract) throw new Error('VITE_ACE_CONTRACT_ADDRESS is invalid.')
    if (!account) throw new Error('Connect a wallet before submitting a transaction.')
    if (walletChainId !== STUDIONET_CHAIN_ID) throw new Error('Switch MetaMask to GenLayer Studionet before submitting an ACE transaction.')
    return contract
  }

  const value: AceContextValue = {
    account,
    walletChainId,
    isStudionet: walletChainId === STUDIONET_CHAIN_ID,
    walletError,
    configError: address ? null : 'VITE_ACE_CONTRACT_ADDRESS is invalid.',
    contract,
    connectWallet,
    switchToStudionet,
    isConnecting,
    requireWritableContract,
    diagnostics: getAceClientDiagnostics(walletChainId),
  }

  return <AceContext.Provider value={value}>{children}</AceContext.Provider>
}
