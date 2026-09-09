import {
  ACE_CHAIN_ID,
  ACE_CHAIN_ID_HEX,
  ACE_NETWORK_NAME,
  ACE_RPC_URL,
  type Address,
  type GenLayerClientConfig,
} from 'sdk'
import { getAceClientDiagnostics, getAceContract } from '../lib/aceClients'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { AceContext, type AceContextValue } from './AceContext'

function configuredAddress(): Address | null {
  const environmentAddress = import.meta.env.VITE_ACE_CONTRACT_ADDRESS as string | undefined
  const value = environmentAddress?.trim()
  return typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value)
    ? (value as Address)
    : null
}

const STUDIONET_CHAIN_ID_DECIMAL = ACE_CHAIN_ID
const STUDIONET_CHAIN_ID_HEX = ACE_CHAIN_ID_HEX

const STUDIONET_CHAIN_PARAMS = {
  chainId: STUDIONET_CHAIN_ID_HEX,
  chainName: ACE_NETWORK_NAME,
  rpcUrls: [ACE_RPC_URL],
  nativeCurrency: {
    name: 'GEN',
    symbol: 'GEN',
    decimals: 18,
  },
}

function isStudionetChain(chainId: string | null | undefined): boolean {
  if (!chainId) return false
  const trimmed = chainId.trim().toLowerCase()
  if (trimmed === STUDIONET_CHAIN_ID_HEX || trimmed === '61999') return true
  try {
    const hexVal = parseInt(trimmed, 16)
    if (hexVal === STUDIONET_CHAIN_ID_DECIMAL) return true
    const decVal = parseInt(trimmed, 10)
    if (decVal === STUDIONET_CHAIN_ID_DECIMAL) return true
  } catch {
    // ignore parsing failure
  }
  return false
}

async function ensureStudionetNetwork(): Promise<void> {
  if (!window.ethereum) {
    throw new Error('No compatible browser wallet was detected.')
  }

  // 1. Detect connected wallet/network
  let currentChain: unknown
  try {
    currentChain = await window.ethereum.request({ method: 'eth_chainId' })
  } catch (err) {
    console.warn('[ACE] Could not detect eth_chainId', err)
  }

  if (typeof currentChain === 'string' && isStudionetChain(currentChain)) {
    return
  }

  // 2. If the wallet is NOT on Studionet (chain ID 61999), automatically request MetaMask to switch
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: STUDIONET_CHAIN_ID_HEX }],
    })
  } catch (switchError: unknown) {
    const errObj = switchError as { code?: unknown; message?: unknown; data?: { originalError?: { code?: unknown } } }
    const code = errObj?.code ?? errObj?.data?.originalError?.code
    const msg = typeof errObj?.message === 'string' ? errObj.message.toLowerCase() : ''

    // 6. If user rejected the switch request
    if (code === 4001 || code === '4001' || msg.includes('user rejected') || msg.includes('user denied')) {
      throw new Error('MetaMask switch request was rejected. ACE requires GenLayer Studionet.', { cause: switchError })
    }

    // 3. If Studionet is not already added to MetaMask, automatically request to add it
    if (code === 4902 || code === '4902' || msg.includes('unrecognized') || msg.includes('wallet_addethereumchain') || msg.includes('not found')) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [STUDIONET_CHAIN_PARAMS],
        })
      } catch (addError: unknown) {
        const addErrObj = addError as { code?: unknown; message?: unknown }
        if (addErrObj?.code === 4001 || addErrObj?.code === '4001' || String(addErrObj?.message).toLowerCase().includes('user rejected')) {
          throw new Error('MetaMask add-network request was rejected. ACE requires GenLayer Studionet.', { cause: addError })
        }
        throw addError
      }
    } else {
      throw switchError
    }
  }

  // 4. After switching, verify that the active chain is 61999 before allowing interactions
  const verifiedChain = await window.ethereum.request({ method: 'eth_chainId' })
  if (typeof verifiedChain !== 'string' || !isStudionetChain(verifiedChain)) {
    throw new Error('Active network verification failed. ACE requires GenLayer Studionet (Chain 61999).')
  }
}

function walletErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? (error as { code?: unknown }).code
    : undefined
  const message = error instanceof Error ? error.message : String(error)
  const normalized = message.toLowerCase()
  if (
    code === 4001 ||
    code === '4001' ||
    normalized.includes('user rejected') ||
    normalized.includes('user denied') ||
    normalized.includes('rejected the request')
  ) {
    return 'MetaMask request was rejected. ACE requires GenLayer Studionet.'
  }
  if (normalized.includes('requires genlayer studionet')) {
    return message
  }
  if (normalized.includes('rate limit') || normalized.includes('too many requests') || normalized.includes('429')) {
    return 'Studionet RPC is temporarily rate limited. Please wait a moment and try again.'
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
      await ensureStudionetNetwork()
      await refreshWalletState()
    } catch (error) {
      setWalletError(walletErrorMessage(error))
      await refreshWalletState().catch(() => undefined)
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
      await ensureStudionetNetwork()
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
    if (!isStudionetChain(walletChainId)) throw new Error('Switch MetaMask to GenLayer Studionet (chain 61999) before submitting an ACE transaction.')
    return contract
  }

  const isStudionet = isStudionetChain(walletChainId)

  const value: AceContextValue = {
    account,
    walletChainId,
    isStudionet,
    walletError,
    configError: address ? null : 'VITE_ACE_CONTRACT_ADDRESS is invalid.',
    contract,
    connectWallet,
    switchToStudionet,
    isConnecting,
    requireWritableContract,
    diagnostics: getAceClientDiagnostics(walletChainId, address),
  }

  return <AceContext.Provider value={value}>{children}</AceContext.Provider>
}
