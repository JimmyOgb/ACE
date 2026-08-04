import { createClient } from "genlayer-js";

import type { AceClient, AceClientConfig } from "./types.js";

/**
 * Creates provider-neutral GenLayer clients for ACE reads and writes.
 *
 * Supply a separate `write` configuration when a React application uses a
 * wallet provider for transactions and a public RPC endpoint for reads.
 */
export function createAceClient(config: AceClientConfig = {}): AceClient {
  const read = createClient(config.read);
  const write = config.write === undefined ? read : createClient(config.write);

  return { read, write };
}
