# ACE TypeScript SDK

Provider-neutral TypeScript bindings for the Academic Consensus Engine.

## Deployed contract

The default GenLayer Studio deployment is:

```text
0x9049Ba9dd639a742c609E7D7798E023A36e462c1
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
