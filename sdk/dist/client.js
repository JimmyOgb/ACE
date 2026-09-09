import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
export const ACE_CHAIN_ID = 61999;
export const ACE_CHAIN_ID_HEX = "0xf22f";
export const ACE_NETWORK_NAME = "GenLayer Studionet";
export const ACE_RPC_URL = "https://studio.genlayer.com/api";
const studioChain = studionet;
/**
 * Creates provider-neutral GenLayer clients for ACE reads and writes.
 *
 * Defaults both clients to the official GenLayer Studionet. Supply a
 * separate `write` configuration when a React application uses a wallet
 * provider for transactions.
 */
export function createAceClient(config = {}) {
    const read = createAceReadClient(config.read);
    const write = createAceWriteClient(config.write ?? config.read);
    return { read, write };
}
/** Creates the single read-only client used by an application. */
export function createAceReadClient(config = {}) {
    return createClient({ ...config, chain: studioChain });
}
/** Creates a wallet-backed client; pass the connected wallet account/provider. */
export function createAceWriteClient(config = {}) {
    return createClient({ ...config, chain: studioChain });
}
//# sourceMappingURL=client.js.map