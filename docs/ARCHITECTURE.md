# ACE Architecture

## Overview

Academic Consensus Engine follows a clean architecture model. Protocol rules,
contract interfaces, SDK clients, frontend workflows, tests, and documentation
are separated so the system can evolve without coupling user interfaces to
contract internals or protocol policy decisions.

The repository is organized around stable boundaries:

- `contracts/`: GenLayer protocol contracts and contract-adjacent interfaces.
- `sdk/`: Client libraries for applications, scripts, and integrations.
- `frontend/`: User-facing review, submission, and governance interfaces.
- `docs/`: Protocol, architecture, API, contract, and roadmap documentation.
- `examples/`: Reference integrations and workflow examples.
- `tests/`: Protocol, SDK, contract, integration, and regression tests.

No GenLayer contract business logic is defined in this documentation milestone.

## Architectural Principles

- Keep domain concepts independent from UI framework choices.
- Keep SDK types aligned with public protocol interfaces.
- Treat contracts as the source of truth for protocol state transitions once
  implementation begins.
- Prefer explicit schemas for submissions, policies, reviews, and results.
- Make privacy and auditability first-class design constraints.
- Design for multiple evaluation policies rather than one hard-coded academic
  rubric.

## Layers

### Protocol Domain

The domain layer defines ACE concepts such as submissions, evaluation policies,
evaluator assignments, review artifacts, disputes, and consensus results.

Responsibilities:

- Define lifecycle states.
- Define validation rules.
- Define policy-independent terminology.
- Define invariants that all implementations must respect.

### Contract Layer

The contract layer will eventually coordinate protocol state on GenLayer.

Responsibilities:

- Register submissions and policy references.
- Track evaluation lifecycle transitions.
- Record review commitments and result commitments.
- Enforce finalization and dispute windows.
- Emit protocol events for SDKs and indexers.

Implementation is intentionally deferred.

### SDK Layer

The SDK provides typed access to the public API and abstracts transport,
serialization, event parsing, and developer ergonomics.

Responsibilities:

- Build and validate request payloads.
- Submit protocol transactions through supported clients.
- Read protocol state.
- Decode protocol events.
- Provide integration-safe error types.

### Frontend Layer

The frontend provides workflows for requesters, evaluators, maintainers, and
observers.

Responsibilities:

- Submit evaluation requests.
- Display evaluation status.
- Support evaluator review submission flows.
- Show consensus outcomes and audit trails.
- Expose governance and dispute actions when available.

### Storage and Indexing

ACE should separate canonical protocol state from large or sensitive content.

Expected storage roles:

- On-chain state for commitments, identifiers, transitions, and events.
- Off-chain storage for papers, datasets, review packets, and encrypted review
  content.
- Indexers for query performance, analytics, and frontend-friendly views.

### Evaluation Services

Evaluation services may include AI agents, human review platforms, institutional
systems, plagiarism detectors, replication tools, and domain-specific scoring
engines. These services should interact with ACE through documented APIs and
policy-compliant review artifacts.

## Data Flow

1. A requester prepares a submission packet and selects an evaluation policy.
2. The frontend or SDK validates the packet and sends a registration request.
3. The contract layer records the submission and opens the evaluation lifecycle.
4. Evaluators are assigned according to policy.
5. Evaluators submit review artifacts or commitments.
6. The protocol derives or records a consensus result.
7. A challenge window allows procedural review.
8. The result is finalized and emitted for SDKs, indexers, and frontends.

## State Model

The expected high-level lifecycle states are:

- `Draft`: Submission metadata is being prepared off-chain.
- `Registered`: The protocol has accepted the evaluation request.
- `Validating`: Intake checks are being performed.
- `Assigned`: Evaluators have been selected.
- `InReview`: Evaluators are submitting independent assessments.
- `ConsensusPending`: Reviews are complete and aggregation is pending.
- `ChallengeOpen`: A candidate result is available for challenge.
- `Finalized`: The evaluation result is final.
- `Cancelled`: The request ended before finalization.
- `Disputed`: A challenge requires additional resolution.

Exact state names may change during contract design, but public APIs should
preserve these semantics.

## Security Architecture

Security-critical areas include:

- Submission and review integrity.
- Evaluator identity and authorization.
- Conflict-of-interest handling.
- Policy versioning and upgrade safety.
- Protection of confidential academic data.
- Prevention of premature review disclosure.
- Resistance to evaluator collusion and spam.
- Reproducibility of AI-assisted review metadata.

## Testing Strategy

Testing should evolve in layers:

- Unit tests for schemas and SDK helpers.
- Direct contract tests for state transitions and invariants.
- Integration tests for full evaluation lifecycles.
- Regression tests for policy compatibility.
- Security tests for authorization, privacy, and dispute handling.

## Extensibility

ACE should support multiple evaluation policies, different storage backends,
multiple frontends, and third-party evaluator networks. Extensions should be
introduced through documented interfaces rather than ad hoc coupling between
contracts, frontend code, and external services.
