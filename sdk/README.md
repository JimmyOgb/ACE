# ACE TypeScript SDK

Provider-neutral TypeScript bindings for the Academic Consensus Engine.

## Deployed contract

The default GenLayer Studio deployment is:

```text
0xe64FAEb849cF96BB6E4c29487bf5Dd3DdA67FC21
```

`createAcademicConsensusEngineContract(client)` uses this address by default. A different address can be supplied as the second argument for another deployment:

```ts
import {
  createAceClient,
  createAcademicConsensusEngineContract,
} from "sdk";

// createAceClient defaults to the official genlayer-js `studionet` chain.
const client = createAceClient();
const ace = createAcademicConsensusEngineContract(client);
```
