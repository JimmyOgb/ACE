# ACE Public API

## Overview

This document defines the intended public API surface for Academic Consensus
Engine. The API is described at the protocol and SDK boundary level. It does not
define or implement GenLayer contract code.

The public API should allow clients to:

- Register academic evaluation requests.
- Read submission and evaluation state.
- Submit review artifacts or review commitments.
- Track consensus and dispute lifecycle events.
- Query finalized evaluation results.

## API Design Principles

- Use stable identifiers for submissions, policies, evaluators, and reviews.
- Return structured errors with actionable codes.
- Keep write operations explicit and auditable.
- Avoid exposing private review content unless the caller is authorized.
- Prefer typed schemas over loosely shaped payloads.
- Preserve compatibility through versioned request and response formats.

## Core Resources

### Submission

Represents the academic artifact under evaluation.

Expected fields:

- `submissionId`: Protocol identifier.
- `metadataUri`: URI for off-chain metadata.
- `metadataHash`: Content hash for metadata integrity.
- `policyId`: Evaluation policy identifier.
- `requester`: Address or account that created the request.
- `status`: Current lifecycle status.
- `createdAt`: Registration timestamp.
- `updatedAt`: Last protocol state transition timestamp.

### Evaluation Policy

Represents rules governing an evaluation.

Expected fields:

- `policyId`: Policy identifier.
- `version`: Policy version.
- `name`: Human-readable policy name.
- `criteriaUri`: URI for rubric or criteria details.
- `criteriaHash`: Content hash for criteria integrity.
- `requiredEvaluatorCount`: Minimum evaluator count.
- `challengeWindow`: Time available for challenges.
- `status`: Active, deprecated, or retired.

### Evaluator

Represents a participant eligible to submit reviews.

Expected fields:

- `evaluatorId`: Evaluator identifier.
- `account`: Address or account controlled by the evaluator.
- `profileUri`: Optional profile metadata.
- `capabilities`: Domains, methods, or credential claims.
- `status`: Active, suspended, or retired.

### Review Artifact

Represents an evaluator's assessment.

Expected fields:

- `reviewId`: Review identifier.
- `submissionId`: Related submission.
- `evaluatorId`: Submitting evaluator.
- `artifactUri`: URI for review content, if stored off-chain.
- `artifactHash`: Content hash for review integrity.
- `scores`: Structured score fields defined by policy.
- `confidence`: Evaluator confidence signal, if required by policy.
- `disclosures`: Conflict or limitation disclosures.
- `submittedAt`: Submission timestamp.

### Consensus Result

Represents the protocol-level outcome.

Expected fields:

- `resultId`: Result identifier.
- `submissionId`: Related submission.
- `policyId`: Policy used to derive the result.
- `decision`: Final or candidate decision.
- `summaryUri`: Optional off-chain summary.
- `summaryHash`: Content hash for the summary.
- `reviewIds`: Included reviews.
- `finalizedAt`: Finalization timestamp, if final.

## Write Operations

### Register Submission

Creates a new evaluation request.

Input:

- `metadataUri`
- `metadataHash`
- `policyId`
- `requester`
- Optional policy-specific parameters

Output:

- `submissionId`
- `status`
- `createdAt`

Expected errors:

- `INVALID_METADATA`
- `UNKNOWN_POLICY`
- `POLICY_NOT_ACTIVE`
- `DUPLICATE_SUBMISSION`
- `UNAUTHORIZED_REQUESTER`

### Submit Review

Submits a review artifact or commitment for an assigned evaluator.

Input:

- `submissionId`
- `evaluatorId`
- `artifactUri`
- `artifactHash`
- `scores`
- `confidence`
- `disclosures`

Output:

- `reviewId`
- `submissionId`
- `status`
- `submittedAt`

Expected errors:

- `SUBMISSION_NOT_IN_REVIEW`
- `EVALUATOR_NOT_ASSIGNED`
- `REVIEW_ALREADY_SUBMITTED`
- `INVALID_REVIEW_SCHEMA`
- `UNAUTHORIZED_EVALUATOR`

### Open Challenge

Raises a procedural or evidentiary challenge during the challenge window.

Input:

- `submissionId`
- `challenger`
- `reasonCode`
- `evidenceUri`
- `evidenceHash`

Output:

- `challengeId`
- `status`
- `openedAt`

Expected errors:

- `CHALLENGE_WINDOW_CLOSED`
- `INVALID_CHALLENGE_REASON`
- `UNAUTHORIZED_CHALLENGER`
- `INVALID_EVIDENCE`

### Finalize Evaluation

Finalizes an eligible evaluation result.

Input:

- `submissionId`

Output:

- `resultId`
- `decision`
- `finalizedAt`

Expected errors:

- `CONSENSUS_NOT_READY`
- `ACTIVE_CHALLENGE_EXISTS`
- `ALREADY_FINALIZED`
- `FINALIZATION_NOT_ALLOWED`

## Read Operations

### Get Submission

Returns submission metadata, lifecycle state, and related identifiers.

### List Submissions

Returns paginated submissions with filters for requester, status, policy, and
date range.

### Get Evaluation Policy

Returns policy metadata and status.

### List Evaluators

Returns evaluators filtered by status, capability, or policy eligibility.

### Get Review

Returns review metadata. Private review content should only be returned when
the caller is authorized.

### Get Consensus Result

Returns candidate or finalized consensus result data.

### List Events

Returns protocol events for indexers, SDK consumers, and audit tools.

## Event Model

Expected public events:

- `SubmissionRegistered`
- `SubmissionValidated`
- `EvaluatorsAssigned`
- `ReviewSubmitted`
- `ConsensusCalculated`
- `ChallengeOpened`
- `ChallengeResolved`
- `EvaluationFinalized`
- `EvaluationCancelled`

Each event should include:

- Event name.
- Protocol version.
- Submission identifier, if applicable.
- Actor account, if applicable.
- Timestamp or block reference.
- Content hashes or related identifiers.

## Versioning

The API should use semantic versioning once packages are released. Breaking
changes must be documented with migration notes. Protocol-level schemas should
include version fields so historical evaluations remain interpretable.

## Authentication and Authorization

Authorization rules depend on the final protocol design, but the API should
distinguish at least these roles:

- Requester.
- Assigned evaluator.
- Challenger.
- Policy maintainer.
- Protocol administrator or governance process.
- Public observer.

Sensitive content must require explicit authorization.
