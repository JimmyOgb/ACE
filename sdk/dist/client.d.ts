import type { AceClient, AceClientConfig } from "./types.js";
/**
 * Creates provider-neutral GenLayer clients for ACE reads and writes.
 *
 * Defaults both clients to the official GenLayer Studio network. Supply a
 * separate `write` configuration when a React application uses a wallet
 * provider for transactions.
 */
export declare function createAceClient(config?: AceClientConfig): AceClient;
/** Creates the single read-only client used by an application. */
export declare function createAceReadClient(config?: AceClientConfig["read"]): import("genlayer-js/types").GenLayerClient<import("genlayer-js/types").GenLayerChain>;
/** Creates a wallet-backed client; pass the connected wallet account/provider. */
export declare function createAceWriteClient(config?: AceClientConfig["write"]): import("genlayer-js/types").GenLayerClient<import("genlayer-js/types").GenLayerChain>;
//# sourceMappingURL=client.d.ts.map