# ACE Frontend

Production React client for the Academic Consensus Engine.

## Configuration

Copy `.env.example` to `.env.local` and set:

- `VITE_ACE_CONTRACT_ADDRESS`: deployed Academic Consensus Engine address.
- `VITE_GENLAYER_RPC_URL`: GenLayer JSON-RPC endpoint. This is optional when the SDK's default endpoint is appropriate.
- `VITE_ACE_EVALUATION_PROFILE_IDS`: optional comma-separated profile IDs shown in the upload selector. Users can also load a profile by ID through the UI.

The browser wallet is connected through the provider-neutral wallet interface accepted by the ACE TypeScript SDK.

## Commands

```sh
npm install
npm run dev
npm run lint
npm run build
```

All contract reads and writes are routed through the local `sdk` package dependency.
