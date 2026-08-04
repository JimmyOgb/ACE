# ACE TypeScript SDK

Provider-neutral TypeScript bindings for the Academic Consensus Engine.

## Deployed contract

The default GenLayer Studio deployment is:

```text
0xf069471d23A0a7701b9170Dbd88C27A8e1889d50
```

`createAcademicConsensusEngineContract(client)` uses this address by default. A different address can be supplied as the second argument for another deployment:

```ts
import {
  createAceClient,
  createAcademicConsensusEngineContract,
} from "sdk";

const client = createAceClient({ read: { endpoint: "https://rpc.example" } });
const ace = createAcademicConsensusEngineContract(client);
```
