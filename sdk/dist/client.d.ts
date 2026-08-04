import type { AceClient, AceClientConfig } from "./types.js";
/**
 * Creates provider-neutral GenLayer clients for ACE reads and writes.
 *
 * Supply a separate `write` configuration when a React application uses a
 * wallet provider for transactions and a public RPC endpoint for reads.
 */
export declare function createAceClient(config?: AceClientConfig): AceClient;
//# sourceMappingURL=client.d.ts.map