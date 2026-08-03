# ACE Contract Specification

## Overview

This document defines the intended contract responsibilities for Academic
Consensus Engine. It is a specification, not an implementation. No GenLayer
contract code is included here.

The contract layer should coordinate protocol state, enforce lifecycle
transitions, record commitments, and emit auditable events for SDKs, frontends,
and indexers.

## Design Goals

- Keep protocol state transitions explicit and verifiable.
- Support multiple evaluation policies.
- Avoid storing large or sensitive academic content directly on-chain.
- Emit events that allow reliable indexing and audit trails.
- Preserve upgrade and governance paths without compromising historical
  evaluations.

## Contract Responsibilities

### Submission Registry

The submission registry records evaluation requests.

Expected responsibilities:

- Accept new submission registrations.
- Store submission identifiers, metadata commitments, policy references, and
  requester accounts.
- Track lifecycle status.
- Prevent unauthorized or malformed state transitions.

### Policy Registry

The policy registry records evaluation policy metadata.

Expected responsibilities:

- Register policy identifiers and versions.
- Track active, deprecated, and retired policies.
- Store rubric or criteria commitments.
- Expose policy metadata for clients and contracts.

### Evaluator Registry

The evaluator registry records evaluator identity and eligibility metadata.

Expected responsibilities:

- Track evaluator accounts.
- Store capability or credential references.
- Support activation, suspension, and retirement.
- Provide eligibility checks for evaluation policies.

### Evaluation Coordinator

The evaluation coordinator manages lifecycle transitions.

Expected responsibilities:

- Move submissions through validation, assignment, review, consensus,
  challenge, and finalization states.
- Track assigned evaluators.
- Accept review commitments from eligible evaluators.
- Determine when consensus calculation or finalization is allowed.

### Dispute Coordinator

The dispute coordinator manages challenge and resolution state.

Expected responsibilities:

- Accept challenges during valid challenge windows.
- Record evidence commitments.
- Track challenge status.
- Prevent finalization while blocking challenges remain active.

## State Transitions

Expected transition model:

| From | To | Trigger |
| ---- | -- | ------- |
| None | Registered | Submission is accepted |
| Registered | Validating | Intake validation begins |
| Validating | Assigned | Submission passes intake checks |
| Assigned | InReview | Evaluators are notified or review window opens |
| InReview | ConsensusPending | Required reviews are submitted or review window closes |
| ConsensusPending | ChallengeOpen | Candidate result is recorded |
| ChallengeOpen | Finalized | Challenge window closes with no blocking challenge |
| ChallengeOpen | Disputed | Valid challenge is accepted |
| Disputed | ChallengeOpen | Challenge is resolved and candidate result remains active |
| Any non-final state | Cancelled | Authorized cancellation or terminal failure |

Exact state names may be refined during implementation, but the lifecycle
semantics should remain stable.

## Data Commitments

Contracts should prefer commitments over raw content for large or sensitive
academic data.

Expected commitment fields:

- URI or storage reference.
- Content hash.
- Schema version.
- Optional encryption or access-control metadata reference.
- Timestamp or block reference.

## Public Events

The contract layer should emit events for all material lifecycle transitions:

- `SubmissionRegistered`
- `SubmissionValidated`
- `EvaluatorsAssigned`
- `ReviewSubmitted`
- `ConsensusCalculated`
- `ChallengeOpened`
- `ChallengeResolved`
- `EvaluationFinalized`
- `EvaluationCancelled`
- `PolicyRegistered`
- `PolicyStatusChanged`
- `EvaluatorRegistered`
- `EvaluatorStatusChanged`

Events should be stable enough for SDKs and indexers to consume across minor
versions.

## Access Control

The contract design should define permissions for:

- Requesters registering or cancelling submissions.
- Evaluators submitting reviews.
- Policy maintainers registering or retiring policies.
- Dispute participants opening or resolving challenges.
- Governance actors performing privileged administrative actions.

Privileged actions should be minimized and auditable.

## Invariants

Future implementations should preserve these invariants:

- A finalized evaluation cannot be modified.
- A review cannot be accepted from an unassigned evaluator unless the policy
  explicitly permits open review.
- A submission cannot be finalized while a blocking challenge is active.
- A consensus result must reference the policy version used to derive it.
- Content hashes must remain associated with the lifecycle record they support.
- Deprecated policies must remain readable for historical evaluations.

## Privacy Requirements

Contracts should not require confidential paper contents, unpublished datasets,
private reviewer comments, or personal data to be stored directly on-chain.
Where public verification is required, the contract should store commitments
and allow authorized systems to resolve protected content off-chain.

## Upgrade Considerations

Future contract upgrades should:

- Preserve historical evaluation records.
- Keep old policy versions readable.
- Provide migration paths for SDKs and indexers.
- Emit versioned events when behavior changes.
- Require governance review for changes affecting finalization, disputes, or
  evaluator eligibility.

## Open Questions

- Which governance process controls policy registration?
- Which evaluator reputation model should be used?
- Which storage backends are supported for confidential content?
- Which consensus algorithms should be included in the first implementation?
- How should cross-institution review policies be represented?
