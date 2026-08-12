# ACE Deployment

## Current deployment

- Network: GenLayer Studio (`studionet`)
- Contract: `0x9049Ba9dd639a742c609E7D7798E023A36e462c1`
- RPC: the official `genlayer-js` `studionet` RPC

The production ACE lifecycle is: prepare a document, register the submission,
wait for indexing, freeze it, start AI consensus evaluation, and inspect the
consensus report. `VITE_STUDIO_SAFE_MODE=true` disables automatic Studio
polling and receipt waiting. In normal mode, pending lifecycle reads use the
limited 15-second interval and pause for the shared 30-second cooldown after
Studio HTTP 429 or RPC `-32005` responses.
