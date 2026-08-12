# Academic Consensus Engine (ACE)

## Overview

Academic Consensus Engine (ACE) is a GenLayer-based protocol for
decentralized, AI-assisted academic evaluation.

ACE is designed around a structured evaluation lifecycle in which
submissions, rubrics, evaluator profiles, evaluation reports, and
consensus results are represented as protocol state. The goal is to make
AI-assisted academic evaluation more structured, auditable, and
resistant to dependence on a single evaluator or opaque centralized
workflow.

ACE combines:

-   GenLayer smart-contract state
-   Structured academic submissions and rubrics
-   Evaluator profiles
-   AI-assisted evaluation through GenLayer nondeterministic execution
-   Multi-evaluator comparison and consensus
-   Hashes and commitments for evidence and evaluation data
-   A web frontend for submission and lifecycle tracking
-   Rate-limit-aware RPC handling for GenLayer Studio/Studionet

ACE is an evolving contribution toward decentralized and auditable
academic evaluation infrastructure.

## Why ACE

A conventional evaluation workflow can be difficult to audit: a document
is submitted to a platform, processed by an evaluator, and returned with
a score while much of the evaluation context remains opaque.

ACE instead structures the process around explicit protocol objects and
lifecycle states. A submission is associated with a rubric and, where
applicable, an evaluation profile. Evaluator reports are committed to
the submission, and a consensus result can be associated with those
reports.

The objective is not simply to put a grade on-chain. It is to make the
evaluation context and result easier to connect, inspect, and audit.

## Core Concepts

### Submission

A submission represents an academic artifact or claim being evaluated.

It can contain:

-   Submission ID
-   Requesting address
-   Title
-   Abstract commitment
-   Artifact URI and hash
-   Metadata URI and hash
-   Rubric ID
-   Evaluation type
-   Lifecycle status
-   Evaluation profile
-   Review and challenge-window metadata

Submission inputs are validated and duplicate submission identifiers are
rejected.

### Rubric

A rubric defines the evaluation policy.

It includes:

-   Rubric ID and version
-   Evaluation type
-   Criteria commitment
-   Minimum and maximum score
-   Passing threshold
-   Required evaluator count
-   Review configuration
-   Status and creation metadata

The rubric is referenced by submissions so the evaluation context
remains explicit.

### Evaluation Profile

An evaluation profile represents evaluator metadata.

It contains:

-   Profile ID
-   Owner address
-   Display name
-   Profile URI
-   Profile hash
-   Capabilities hash
-   Reputation information
-   Status
-   Creation/update metadata

Profile discovery uses the authoritative contract method
`get_latest_profile_id(owner)` rather than guessing or scanning profile
IDs.

### Evaluation Report

An evaluation report represents an evaluator's committed assessment.

It can contain:

-   Report ID
-   Submission and rubric IDs
-   Evaluator address
-   Evaluation profile
-   Criterion-score commitment
-   Total score
-   Recommendation
-   Confidence
-   Summary commitment
-   Model metadata commitment
-   Conflict-disclosure commitment
-   Report status

Duplicate reports are rejected.

### Consensus Result

A consensus result represents the protocol-level result derived from
accepted evaluator reports.

It contains:

-   Consensus result ID
-   Submission ID
-   Rubric ID
-   Evaluation profile
-   Report-set commitment
-   Decision
-   Confidence
-   Summary commitment
-   Method identifier
-   Status
-   Creation/finalization metadata

The consensus identifier is derived deterministically from the
submission so that a submission cannot receive multiple consensus
results under the same identifier.

## Evaluation Lifecycle

The user-facing lifecycle is:

``` text
Document prepared
       |
       v
Submission registered
       |
       v
Submission indexed
       |
       v
Submission frozen
       |
       v
AI consensus evaluation
       |
       v
Consensus report ready
```

The contract also defines more granular lifecycle states, including:

-   `draft`
-   `registered`
-   `validating`
-   `assigned`
-   `in_review`
-   `consensus_pending`
-   `challenge_open`
-   `disputed`
-   `finalized`
-   `cancelled`
-   `frozen`
-   `under_review`
-   `consensus_ready`

The frontend presents a simple progress flow while the protocol can
maintain more precise states.

## AI Evaluation and Consensus

ACE uses GenLayer nondeterministic execution for AI-assisted evaluation.

When a frozen submission is evaluated, the contract prepares a
structured evaluation payload containing submission metadata, evidence
commitments, the evaluation profile, and the rubric.

The evaluation prompt requests structured JSON rather than unrestricted
prose. Responses are validated against the submission and rubric context
before being accepted.

The consensus stage is designed to derive one protocol-level result from
accepted evaluator reports.

Supported decision values include:

-   `accepted`
-   `revision_required`
-   `rejected`
-   `inconclusive`
-   `manual_review_required`

Confidence is represented as integer basis points from `0` to `10000`.

## Data Integrity

ACE uses hashes and commitments throughout the workflow, including:

-   Artifact hash
-   Metadata hash
-   Abstract commitment
-   Rubric description hash
-   Criteria hash
-   Evaluation profile hash
-   Capabilities hash
-   Criterion-score hash
-   Summary hash
-   Model metadata hash
-   Conflict-disclosure hash
-   Consensus report-set hash

These commitments associate evaluation results with a specific version
of the relevant evidence and evaluation context.

The contract also validates important boundaries such as URI lengths,
hash lengths, score ranges, passing thresholds, evaluator counts, and
required criteria.

## Frontend

The frontend provides the user-facing ACE workflow:

1.  Prepare a document.
2.  Load the applicable profile and rubric.
3.  Register the submission.
4.  Wait for transaction finalization.
5.  Detect the indexed submission.
6.  Freeze the submission.
7.  Start AI-assisted evaluation.
8.  Display the consensus result.

The frontend coordinates the user experience; contract state remains
authoritative.

## RPC Reliability

GenLayer Studio/Studionet can temporarily rate-limit RPC requests. ACE
therefore includes frontend protections intended to reduce unnecessary
traffic and prevent duplicate writes.

### Limited polling

Submission indexing and pending submission-status queries use a
15-second polling interval.

Polling stops when:

-   Indexing completes
-   The submission reaches a finalized state
-   The submission reaches a failed, rejected, cancelled, or error state
-   `VITE_STUDIO_SAFE_MODE=true`

Dashboard and upload-list queries remain one-shot.

### Shared rate-limit cooldown

A shared 30-second Studio cooldown is used after HTTP `429` or RPC
`-32005` rate-limit responses.

During cooldown, background polling pauses rather than immediately
generating another request burst.

### React Query protections

Automatic React Query retries are disabled. Focus, reconnect, and mount
refetching are disabled for the relevant ACE workflow, and
`invalidateQueries()` is not used to generate additional post-mutation
traffic.

### Single-flight writes

Submission, freeze, and evaluation writes use guards to prevent React
Strict Mode or repeated UI execution from producing duplicate
transactions.

### Receipt waiting

Receipt waiting is bounded and single-flight. Only one receipt waiter is
maintained for a given transaction hash, and the waiter uses a bounded
polling window.

### Receipt recovery

After a transaction is successfully broadcast, its transaction hash is
persisted.

If the browser is refreshed or receipt polling is interrupted, ACE can
resume waiting for the existing hash. It does not automatically submit
the transaction again.

This is important because a failed receipt lookup does not necessarily
mean that the original transaction failed.

## Safe Mode

For UI-only development:

``` env
VITE_STUDIO_SAFE_MODE=true
```

Safe mode disables the Studio-dependent submission/status polling and
receipt waiting used by the full lifecycle.

For full lifecycle testing:

``` env
VITE_STUDIO_SAFE_MODE=false
```

Safe mode is useful for frontend development where blockchain
interaction is not required.

## Local Development

### Requirements

Recommended environment:

-   Node.js
-   npm
-   Python 3.11+
-   GenLayer development tooling
-   MetaMask or another compatible wallet
-   Access to the configured GenLayer network

### Install

From the relevant package directory:

``` bash
npm install
```

### Environment

Configure the frontend with the intended GenLayer RPC endpoint and
deployed contract address.

Example:

``` env
VITE_STUDIO_SAFE_MODE=true
```

Use `false` when performing full Studio/Studionet lifecycle testing.

Never commit private keys, wallet secrets, API credentials, or other
sensitive values.

### Run

``` bash
npm run dev
```

The Vite development server normally runs at:

``` text
http://localhost:5173
```

## Testing

Run the project's validation suite before deployment.

SDK:

``` bash
npm run typecheck
npm run build
```

Frontend:

``` bash
npm run typecheck
npm run lint
npm run build
```

Python tests:

``` bash
pytest -q
```

The current validation checkpoint has passed:

-   SDK typecheck
-   SDK build
-   Frontend typecheck
-   Frontend lint
-   Frontend build
-   `pytest -q` --- 4 tests passed
-   Forbidden API search with zero matches for:
    -   `getTransactionReturn`
    -   `debugTraceTransaction`
    -   `gen_dbg_traceTransaction`

## Transaction Recovery

If the interface remains at:

``` text
Submission registered
Waiting for transaction finalization...
```

do not immediately submit the document again.

The transaction hash is persisted after broadcast. Use the **Resume
registration receipt wait** action, or refresh the progress route and
allow the application to resume using the same hash.

No new submission transaction should be created by the recovery path.

## Security and Integrity Principles

### No duplicate writes

A temporary RPC failure should not cause the application to blindly
submit the same transaction again.

### Authoritative profile discovery

Profile discovery uses `get_latest_profile_id(owner)` rather than
guessing or scanning arbitrary profile records.

### Explicit state transitions

Invalid lifecycle transitions are rejected rather than silently
accepted.

### Structured AI responses

AI responses are expected to conform to defined JSON structures.

### Frozen evaluation context

Evaluation is generated from a prepared payload associated with the
frozen submission and rubric.

### Bounded confidence

Confidence is represented using integer basis points from `0` to
`10000`.

### Separation of frontend and protocol state

The frontend tracks user experience and transaction progress, while the
contract remains the authoritative source for protocol state.

## Project Structure

A typical repository layout is:

``` text
ACE/
├── contract/
│   └── AcademicConsensusEngine.py
├── frontend/
│   ├── src/
│   │   ├── hooks/
│   │   │   └── useAceQueries.ts
│   │   ├── lib/
│   │   │   ├── uploadIntent.ts
│   │   │   └── studioCooldown.ts
│   │   └── pages/
│   │       ├── DashboardPage.tsx
│   │       ├── SubmissionPage.tsx
│   │       └── SubmissionProgressPage.tsx
│   └── ...
├── sdk/
│   └── src/
│       └── rpc.ts
├── tests/
│   └── ...
└── README.md
```

The repository layout can evolve as the project develops.

## Supported Evaluation Types

ACE defines education-focused evaluation categories including:

-   Essay
-   Research paper
-   Short answer
-   Lab report
-   Project report
-   Code assignment
-   Presentation
-   Custom evaluation

## Current Scope

The current implementation focuses on:

1.  Document preparation
2.  Profile and rubric loading
3.  Submission registration
4.  Transaction receipt handling
5.  Submission indexing
6.  Submission freezing
7.  AI-assisted evaluation and consensus
8.  Consensus-result presentation
9.  RPC-safe frontend lifecycle management

The frontend resilience work specifically addresses excessive Studio RPC
traffic, duplicate transaction risks, receipt recovery, and temporary
rate limiting.

## Development Status

ACE is an actively evolving contribution.

The current implementation establishes the contract data model,
lifecycle coordination, AI evaluation flow, consensus structures,
frontend workflow, and RPC resilience mechanisms.

Potential future work includes:

-   richer rubric management
-   evaluator authorization
-   evaluator reputation
-   challenge/dispute workflows
-   expanded audit tooling
-   additional academic evaluation formats
-   stronger production observability
-   expanded automated test coverage
-   improved result presentation

Contract storage layout and deployed interfaces should be treated as
compatibility-sensitive areas when extending the protocol.

## Deployment Checklist

Before deployment:

1.  Run SDK typecheck.
2.  Run SDK build.
3.  Run frontend typecheck.
4.  Run frontend lint.
5.  Run frontend production build.
6.  Run `pytest -q`.
7.  Verify environment variables.
8.  Verify the contract address.
9.  Verify the ABI matches the deployed contract.
10. Test wallet signing.
11. Test one complete submission lifecycle.
12. Test receipt recovery.
13. Test rate-limit cooldown behavior.
14. Confirm no duplicate transactions are generated.

The current frontend/RPC resilience work does not intentionally change:

-   Contract address
-   ABI
-   Contract semantics
-   Gas payment behavior
-   Profile discovery semantics
-   Deployment state

## Contribution Guidelines

ACE is intended to be developed openly and incrementally.

Contributions should prioritize:

-   Deterministic protocol behavior
-   Explicit lifecycle transitions
-   Auditable evaluation data
-   Safe AI integration
-   Duplicate-transaction protection
-   Efficient RPC usage
-   Backward-compatible contract evolution
-   Automated testing

For significant changes, document:

1.  The problem being solved.
2.  Affected contract/frontend components.
3.  Any ABI or storage compatibility impact.
4.  Validation performed.
5.  Any new RPC traffic or transaction writes introduced.

## License

Add the project's chosen license here before publishing the repository.

## Acknowledgment

ACE is a contribution exploring how GenLayer can coordinate AI-assisted,
decentralized, and auditable academic evaluation workflows.

The project is built around the principle that an evaluation should be
more than a single opaque score: the submission, rubric, evaluator
process, evidence commitments, and consensus should be structured so
they can be connected and inspected as part of an auditable workflow.
