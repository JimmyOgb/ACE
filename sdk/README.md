# ACE TypeScript SDK

Provider-neutral TypeScript bindings for the Academic Consensus Engine.

## Studionet contract deployment

The Studionet deployment address is:

```text
const aceAddress = "0x250B00B3567d6DeDaaed04d24317a3C65DFe8F0d";
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
