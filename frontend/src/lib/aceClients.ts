import {
  ACE_DEPLOYED_CONTRACT_ADDRESS,
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

export function getAceClientDiagnostics(walletChainId: string | null) {
  return {
    readClientInitialized: true,
    writeClientInitialized: writeClientInitializations > 0,
    walletChainId,
    expectedChainId: 61999,
  }
}

export { ACE_DEPLOYED_CONTRACT_ADDRESS }
