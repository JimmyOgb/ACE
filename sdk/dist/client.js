import { createClient } from "genlayer-js";
/**
 * Creates provider-neutral GenLayer clients for ACE reads and writes.
 *
 * Supply a separate `write` configuration when a React application uses a
 * wallet provider for transactions and a public RPC endpoint for reads.
 */
export function createAceClient(config = {}) {
    const read = createClient(config.read);
    const write = config.write === undefined ? read : createClient(config.write);
    return { read, write };
}
//# sourceMappingURL=client.js.map