# ACE TypeScript SDK

Provider-neutral TypeScript bindings for the Academic Consensus Engine.

## Studionet contract deployment

The Studionet deployment address is:

```text
const aceAddress = "0x5B837123100078EB312cdcEbD1af675c6A8234be";
```

`createAcademicConsensusEngineContract(client, aceAddress)` binds the wrapper to the deployment:

```ts
import {
  createAceClient,
  createAcademicConsensusEngineContract,
} from "sdk";

// createAceClient defaults to GenLayer Studionet (chain 61999).
const client = createAceClient();
const ace = createAcademicConsensusEngineContract(client, aceAddress);
```
