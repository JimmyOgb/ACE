# ACE Frontend

Production React client for the Academic Consensus Engine.

## Configuration

Copy `.env.example` to `.env.local` and set:

- `VITE_ACE_CONTRACT_ADDRESS`: deployed Academic Consensus Engine address. The current GenLayer Studio deployment is `0xe64FAEb849cF96BB6E4c29487bf5Dd3DdA67FC21`.
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
If `VITE_ACE_CONTRACT_ADDRESS` is omitted, the frontend uses the SDK's current GenLayer Studio deployment address.
The frontend uses the `studionet` chain exported by `genlayer-js`, whose official RPC is `https://studio.genlayer.com/api`.
