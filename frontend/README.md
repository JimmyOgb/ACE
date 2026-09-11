# ACE Frontend

Production React client for the Academic Consensus Engine.

## Configuration

Copy `.env.example` to `.env.local` and set:

- `VITE_ACE_CONTRACT_ADDRESS`: `0x250B00B3567d6DeDaaed04d24317a3C65DFe8F0d`
- `VITE_ACE_EVALUATION_PROFILE_IDS`: optional comma-separated profile IDs shown in the upload selector. Users can also load a profile by ID through the UI.
- `VITE_STUDIO_SAFE_MODE`: set to `false` for the normal Studionet lifecycle, or `true` to disable automatic network polling and receipt waiting.

The browser wallet is connected through the provider-neutral wallet interface accepted by the ACE TypeScript SDK.

## Commands

```sh
npm install
npm run dev
npm run lint
npm run build
```

All contract reads and writes are routed through the local `sdk` package dependency.
The frontend uses the `studionet` chain exported by `genlayer-js`: chain ID `61999`, currency `GEN`, and RPC `https://studio.genlayer.com/api`.
