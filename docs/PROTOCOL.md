# Academic Consensus Engine Protocol

## Overview

The Academic Consensus Engine (ACE) is a proposed GenLayer protocol for
decentralized AI-assisted academic evaluation. The protocol coordinates
submission intake, evaluator assignment, independent model-assisted review,
consensus formation, dispute handling, and public auditability without relying
on a single centralized review authority.

ACE is designed for research workflows where evaluators may include humans,
AI agents, institutions, automated checks, and domain-specific review
procedures. The protocol does not attempt to replace academic judgment.
Instead, it provides a transparent coordination layer for collecting evidence,
recording evaluations, reaching reproducible decisions, and exposing the basis
for those decisions.

## Goals

- Provide a neutral protocol for academic evaluation workflows.
- Support AI-assisted and human-assisted review without hard-coding one review
  methodology.
- Preserve a verifiable lifecycle for submissions, reviews, consensus, appeals,
  and final decisions.
- Make evaluation criteria explicit, versioned, and auditable.
- Enable open-source SDKs, frontends, and integrations around a stable protocol
  surface.

## Non-Goals

- ACE does not define final academic truth.
- ACE does not prescribe a single scoring rubric for all fields.
- ACE does not add contract business logic at the documentation stage.
- ACE does not require sensitive research data to be public.
- ACE does not assume all evaluators are AI systems.

## Core Concepts

### Submission

A submission is a research artifact or academic claim proposed for evaluation.
It may reference papers, datasets, code, peer-review packets, replication
materials, or metadata stored off-chain.

### Evaluation Request

An evaluation request defines what should be assessed, which criteria apply,
which evaluation policy governs the process, and what evidence must be
returned.

### Evaluation Policy

An evaluation policy describes the rules for a review. Policies may define
rubrics, required evaluator count, evaluator eligibility, model constraints,
confidence thresholds, dispute windows, and finalization rules.

### Evaluator

An evaluator is an authorized participant that submits an assessment. Evaluators
may be human reviewers, institutional agents, AI agents, automated validation
systems, or hybrid services.

### Review Artifact

A review artifact is the structured output of an evaluator. It may include
scores, comments, cited evidence, uncertainty, conflict disclosures, and
machine-verifiable metadata.

### Consensus Result

A consensus result is the protocol-level outcome derived from the submitted
review artifacts under the active evaluation policy.

## Evaluation Lifecycle

### 1. Registration

A requester registers a submission and selects or references an evaluation
policy. The protocol records immutable identifiers for the submission metadata,
policy, and required evidence.

### 2. Intake Validation

The system validates that the submission packet is complete. This may include
schema checks, content-addressed reference checks, duplication checks, and
policy compatibility checks.

### 3. Evaluator Assignment

Eligible evaluators are selected according to the evaluation policy. Assignment
rules may account for expertise, availability, independence, conflicts of
interest, stake, reputation, randomness, or institution-specific requirements.

### 4. Independent Evaluation

Each evaluator reviews the submission independently and produces a structured
review artifact. AI-assisted evaluators should include enough metadata to make
the evaluation process inspectable, including model family, prompt policy,
evidence references, and confidence information where appropriate.

### 5. Review Submission

Review artifacts are submitted to the protocol. Sensitive review content may be
stored off-chain while commitments, hashes, metadata, and state transitions are
recorded on-chain.

### 6. Consensus Formation

The protocol applies the active evaluation policy to aggregate reviews into a
candidate result. The consensus mechanism may combine score distributions,
threshold rules, evaluator weights, agreement analysis, or deliberation rounds.

### 7. Challenge Window

Participants may challenge procedural errors, missing evidence, evaluator
conflicts, or inconsistent review artifacts during a defined dispute period.

### 8. Finalization

If no valid challenge changes the outcome, the protocol finalizes the result.
The final state includes the submission identifier, policy identifier, review
commitments, consensus result, and finalization timestamp.

### 9. Audit and Reuse

Finalized evaluations can be referenced by frontends, SDK consumers,
institutions, ranking systems, grant workflows, replication markets, or future
evaluations.

## Trust and Verification Model

ACE separates review content from protocol coordination. The protocol should
record enough evidence to verify process integrity while allowing deployments
to choose privacy-preserving storage for sensitive academic material.

Key verification properties:

- Submissions and policies are versioned.
- Evaluator assignments are traceable.
- Review artifacts are committed before finalization.
- Consensus results are derived from declared policies.
- Challenges and final decisions are auditable.

## Privacy Considerations

Academic evaluation may involve unpublished research, confidential peer review,
personal data, and institutional constraints. ACE should support deployments
where sensitive content is encrypted, access-controlled, or stored off-chain,
with only commitments and state transitions recorded publicly.

## Governance Considerations

Protocol governance should eventually define how evaluation policies are
registered, upgraded, deprecated, and disputed. Governance should also cover
evaluator eligibility, reputation portability, audit rules, and emergency
response procedures.
