import type { AceClient, AceClientConfig } from "./types.js";
export declare const ACE_CHAIN_ID = 61999;
export declare const ACE_CHAIN_ID_HEX = "0xf22f";
export declare const ACE_NETWORK_NAME = "GenLayer Studionet";
export declare const ACE_RPC_URL = "https://studio.genlayer.com/api";
/**
 * Creates provider-neutral GenLayer clients for ACE reads and writes.
 *
 * Defaults both clients to the official GenLayer Studionet. Supply a
 * separate `write` configuration when a React application uses a wallet
 * provider for transactions.
 */
export declare function createAceClient(config?: AceClientConfig): AceClient;
/** Creates the single read-only client used by an application. */
export declare function createAceReadClient(config?: AceClientConfig["read"]): import("genlayer-js/types").GenLayerClient<import("genlayer-js/types").GenLayerChain>;
/** Creates a wallet-backed client; pass the connected wallet account/provider. */
export declare function createAceWriteClient(config?: AceClientConfig["write"]): import("genlayer-js/types").GenLayerClient<import("genlayer-js/types").GenLayerChain>;
//# sourceMappingURL=client.d.ts.map