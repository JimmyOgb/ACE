# ACE Deployment

## Studionet deployment

- Network: GenLayer Studionet (`studionet`)
- Chain ID: `61999` / `0xf22f`
- Currency: `GEN`
- Contract: `0x250B00B3567d6DeDaaed04d24317a3C65DFe8F0d`
- RPC: `https://studio.genlayer.com/api`

The ACE lifecycle is: prepare a document, register the submission,
wait for indexing, freeze it, start AI consensus evaluation, and inspect the
consensus report. `VITE_STUDIO_SAFE_MODE=true` disables automatic Studionet
polling and receipt waiting. In normal mode, pending lifecycle reads use the
limited 15-second interval and pause for the shared 30-second cooldown after
Studionet HTTP 429 or RPC `-32005` responses.
