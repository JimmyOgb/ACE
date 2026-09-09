import {
  ACE_CHAIN_ID,
  ACE_CHAIN_ID_HEX,
  ACE_DEPLOYED_CONTRACT_ADDRESS,
  ACE_NETWORK_NAME,
  ACE_RPC_URL,
  createAcademicConsensusEngineContract,
  createAceReadClient,
  createAceWriteClient,
  type AcademicConsensusEngineContract,
  type Address,
  type GenLayerClientConfig,
} from 'sdk'

const readClient = createAceReadClient()
const writeClients = new Map<string, ReturnType<typeof createAceWriteClient>>()
let writeClientInitializations = 0

export function getAceContract(address: Address, account: Address | null, provider: GenLayerClientConfig['provider'] | undefined): AcademicConsensusEngineContract {
  const key = `${address}:${account?.toLowerCase() ?? 'unconnected'}`
  let writeClient = writeClients.get(key)
  if (!writeClient) {
    writeClient = createAceWriteClient(account && provider ? { account, provider } : {})
    writeClients.set(key, writeClient)
    writeClientInitializations += 1
  }
  return createAcademicConsensusEngineContract({ read: readClient, write: writeClient }, address)
}

export function getAceClientDiagnostics(walletChainId: string | null, contractAddress?: Address | null) {
  return {
    network: ACE_NETWORK_NAME,
    chainId: ACE_CHAIN_ID,
    rpcUrl: ACE_RPC_URL,
    contractAddress: contractAddress ?? ACE_DEPLOYED_CONTRACT_ADDRESS,
    readClientInitialized: true,
    writeClientInitialized: writeClientInitializations > 0,
    walletChainId,
    expectedChainId: ACE_CHAIN_ID,
  }
}

export { ACE_CHAIN_ID, ACE_CHAIN_ID_HEX, ACE_DEPLOYED_CONTRACT_ADDRESS, ACE_NETWORK_NAME, ACE_RPC_URL }
