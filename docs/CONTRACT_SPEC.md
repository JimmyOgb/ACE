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

The ACE smart contract should act as the canonical coordination layer for
academic evaluation state. It should not attempt to store full research papers,
private reviews, model transcripts, or large datasets. Those artifacts belong in
content-addressed or access-controlled storage, while the contract records
identifiers, commitments, lifecycle state, and events.

This separation is intentional: GenLayer contract state should remain compact,
auditable, and deterministic from the protocol perspective, while academic
content can evolve through storage systems that are better suited for size,
privacy, and access control.

### Submission Coordination

Responsibilities:

- Register evaluation requests.
- Bind each request to a submission commitment, rubric, requester, and
  evaluation type.
- Track lifecycle state from registration through finalization or cancellation.
- Emit events for every material state change.

Why: submissions are the root aggregate of the protocol. Keeping submission
coordination centralized in one contract boundary gives SDKs, indexers, and
frontends a single source of truth for evaluation progress.

### Rubric and Policy Referencing

Responsibilities:

- Reference rubric identifiers and content commitments.
- Enforce that a submission uses an active or policy-approved rubric.
- Preserve historical rubric references for finalized evaluations.
- Support rubric versioning without mutating past records.

Why: academic evaluation criteria must be explicit and reproducible. A
finalized evaluation is only meaningful if observers can identify the exact
criteria used at the time of review.

### Evaluator Authorization

Responsibilities:

- Track assigned evaluator identifiers or references.
- Validate whether a report is submitted by an eligible evaluator.
- Support policy-controlled open review when explicitly allowed.
- Prevent duplicate reports where the policy requires one report per evaluator.

Why: evaluator eligibility is a core security boundary. The contract should
make unauthorized or duplicate evaluation attempts detectable and rejectable.

### Report Commitment Registry

Responsibilities:

- Accept structured evaluation report commitments.
- Bind each report to a submission, rubric, evaluator, and schema version.
- Track report status for consensus eligibility.
- Emit report submission events for indexers and audit tools.

Why: full review text may be confidential or large. The contract should record
enough information to verify existence, authorship, timing, and integrity
without forcing sensitive content on-chain.

### Consensus Coordination

Responsibilities:

- Determine whether a submission has enough valid reports to enter consensus.
- Record the candidate consensus result commitment.
- Open and close challenge windows.
- Finalize eligible evaluations.

Why: the contract should coordinate consensus state, not hard-code every future
consensus algorithm. This keeps ACE extensible across peer review, replication
review, grant review, and future academic workflows.

### Dispute and Challenge Coordination

Responsibilities:

- Accept challenge commitments during valid challenge windows.
- Track whether any challenge blocks finalization.
- Record challenge resolution outcomes.
- Ensure finalization cannot occur while blocking disputes remain active.

Why: academic evaluation needs procedural accountability. A challenge mechanism
creates a clear path for contesting conflicts, missing evidence, malformed
reports, or policy violations.

## Storage Layout

The storage layout should be designed around stable identifiers and compact
records. Field names below describe logical storage, not a mandated Python or
GenLayer SDK implementation.

| Storage Area | Logical Contents | Access Pattern | Architectural Decision |
| ------------ | ---------------- | -------------- | ---------------------- |
| Submission records | `submissionId`, requester, artifact commitment, rubric reference, evaluation type, status, timestamps, lifecycle deadlines | Frequent reads by SDKs, frontends, and indexers; writes on lifecycle transitions | Store a compact root record per submission because it is the main aggregate and status source. |
| Rubric references | `rubricId`, version, criteria commitment, status, supersession link | Read during registration, report validation, and audit | Store references and commitments instead of full rubric text so rubric definitions remain verifiable without large state growth. |
| Evaluator assignments | Submission-to-evaluator mapping or compact assignment set | Read during report submission; written during assignment | Keep assignment data separate from submission metadata so assignment policy can evolve without changing the submission record shape. |
| Report commitments | `reportId`, submission, evaluator, rubric, report hash, status, timestamp | Written during review; read during consensus and audit | Store report commitments rather than full reports to support confidential peer review and reduce storage cost. |
| Consensus records | Candidate or final result commitment, included report references, decision metadata, finalization timestamp | Written after review; read by public consumers | Store the result separately from the submission so future consensus versions can add metadata without rewriting submission records. |
| Challenge records | `challengeId`, submission, challenger, evidence commitment, status, timestamp | Written during challenge window; read before finalization | Track challenges independently so multiple challenges can exist without bloating the submission record. |
| Counters and indexes | Monotonic counters, enumerable identifiers, optional reverse indexes | Used for deterministic identifiers, pagination, and indexing | Keep indexes minimal; events should carry most data needed by off-chain indexers. |
| Governance configuration | Maintainer or governance references, supported schema versions, active evaluation types | Read during privileged actions and validation | Isolate configuration so future governance changes do not require changing core evaluation records. |

Storage decisions should favor append-only history for finalized evaluations.
Mutable fields should be limited to lifecycle status, deadlines, report status,
challenge status, and governance-controlled configuration.

## Public Methods

Public methods are the externally callable protocol surface. Names are
illustrative and should be finalized during SDK and contract interface design.
This section defines responsibilities, inputs, outputs, and rationale without
specifying Python code.

| Method | Purpose | Expected Inputs | Expected Outputs | Access Control | Why This Exists |
| ------ | ------- | --------------- | ---------------- | -------------- | --------------- |
| Register submission | Create a new evaluation request. | Submission metadata commitment, rubric identifier, evaluation type, requester account, optional deadline parameters. | `submissionId`, initial status, registration event. | Authorized requester or open registration policy. | Provides a single canonical entry point for evaluations. |
| Register or update rubric reference | Add or update a rubric version reference. | Rubric identifier, schema version, criteria commitment, status, supersession reference. | Rubric registration or status event. | Governance or approved policy maintainer. | Keeps scoring criteria explicit, versioned, and auditable. |
| Assign evaluators | Attach evaluator identifiers to a submission. | Submission identifier, evaluator identifiers, assignment metadata commitment. | Assignment event and updated submission status. | Governance, coordinator, or policy-authorized actor. | Separates evaluator selection from report submission and makes assignment auditable. |
| Submit evaluation report | Record an evaluator report commitment. | Submission identifier, evaluator identifier, report commitment, criterion score commitment or summary commitment, schema version. | `reportId`, report status, report submission event. | Assigned evaluator or eligible open reviewer. | Captures review integrity while allowing confidential content off-chain. |
| Mark review complete | Move a submission from review to consensus readiness when policy conditions are met. | Submission identifier. | Updated status and lifecycle event. | Protocol coordinator, governance, or permissionless caller if conditions are objectively checkable. | Allows progress once required reports or deadlines are satisfied. |
| Record consensus result | Store a candidate consensus result commitment. | Submission identifier, result commitment, included report identifiers, consensus metadata. | Candidate result event and challenge window state. | Consensus coordinator or policy-authorized actor. | Decouples consensus derivation from storage of the result commitment. |
| Open challenge | Register a procedural or evidentiary challenge. | Submission identifier, reason code, evidence commitment, challenger account. | `challengeId`, challenge event, possibly disputed status. | Eligible challenger under the active policy. | Prevents silent finalization when process defects are alleged. |
| Resolve challenge | Record challenge outcome. | Challenge identifier, resolution code, resolution evidence commitment. | Challenge resolution event and updated status. | Governance, arbitrator, or policy-authorized resolver. | Gives disputes a documented terminal outcome. |
| Finalize evaluation | Make the evaluation result immutable. | Submission identifier. | Final result event and finalized status. | Permissionless if objective conditions are met, otherwise authorized coordinator. | Ensures completed evaluations have a clear, stable terminal state. |
| Cancel evaluation | End a non-final evaluation. | Submission identifier, cancellation reason commitment. | Cancellation event and terminal cancelled status. | Requester before review begins, or governance/policy actor after defined failures. | Provides a controlled escape path for invalid or abandoned requests. |
| Read submission | Return submission state and commitments. | Submission identifier. | Submission record. | Public, except protected metadata resolution remains off-chain. | Enables SDKs, frontends, and indexers to display lifecycle state. |
| Read rubric | Return rubric reference and status. | Rubric identifier. | Rubric record. | Public. | Enables reproducibility and compatibility checks. |
| Read report commitment | Return report commitment metadata. | Report identifier. | Report commitment record. | Public for commitments; private report content remains off-chain. | Enables audit without exposing confidential review text. |
| Read consensus result | Return candidate or final result metadata. | Submission identifier or result identifier. | Consensus record. | Public. | Enables consumers to verify and display outcomes. |

Read methods should avoid returning large dynamic data where events or
pagination are better suited. Public write methods should emit structured
events for every successful state transition.

## Internal Helper Methods

Internal helpers should keep validation and lifecycle logic centralized. Method
names are descriptive placeholders, not implementation requirements.

| Helper | Responsibility | Architectural Decision |
| ------ | -------------- | ---------------------- |
| Validate submission packet | Check required submission fields, rubric compatibility, artifact commitments, and schema version. | Central validation prevents inconsistent registration paths. |
| Validate rubric status | Confirm that a rubric exists, is active or explicitly allowed, and supports the requested evaluation type. | Rubric validation protects reproducibility and prevents evaluations under unknown criteria. |
| Validate evaluator eligibility | Check assignment, open-review policy, evaluator status, and duplicate report constraints. | Eligibility logic is a security boundary and should not be duplicated across public methods. |
| Validate report schema | Confirm report commitment structure, schema version, criterion coverage, and score bounds. | Report validation protects consensus inputs from malformed or incomplete reviews. |
| Validate state transition | Enforce allowed lifecycle movement and terminal-state immutability. | A single transition gate reduces accidental bypasses and makes invariant testing easier. |
| Compute or verify lifecycle deadlines | Determine review and challenge windows from policy and timestamps. | Deadline logic must be consistent across review completion, challenges, and finalization. |
| Check consensus readiness | Determine whether required report count, review window, and report status conditions are satisfied. | Consensus should begin only from valid, policy-compliant inputs. |
| Check finalization eligibility | Confirm candidate result existence, challenge window closure, and absence of blocking disputes. | Finalization is irreversible, so the guard should be narrow and explicit. |
| Build event payloads | Normalize event fields and schema versions before emission. | Consistent events reduce SDK and indexer fragility. |
| Resolve content commitments | Normalize URI, hash, schema version, and optional encryption metadata references. | Commitment normalization supports multiple storage backends without changing lifecycle logic. |

Internal helpers should not depend on frontend assumptions. They should operate
on protocol concepts and documented schemas so SDKs and tests can reason about
contract behavior consistently.

## Evaluation Lifecycle

Expected transition model:

| From | To | Trigger | Required Conditions | Why |
| ---- | -- | ------- | ------------------- | --- |
| None | Registered | Submission is accepted. | Valid requester, supported schema version, active rubric, valid artifact commitment. | Establishes a canonical evaluation record. |
| Registered | Validating | Intake validation begins. | Submission exists and is not terminal. | Keeps validation visible rather than hiding it inside registration. |
| Validating | Assigned | Submission passes intake checks. | Required metadata and policy checks succeed. | Separates content completeness from evaluator selection. |
| Assigned | InReview | Evaluators are notified or review window opens. | Assignment policy is satisfied or open review is enabled. | Makes report submission eligibility explicit. |
| InReview | ConsensusPending | Required reports are submitted or review window closes. | Required report count, report validity, or deadline conditions are met. | Prevents premature aggregation. |
| ConsensusPending | ChallengeOpen | Candidate result is recorded. | Consensus result commitment exists and references eligible reports. | Gives participants a defined review window before finalization. |
| ChallengeOpen | Disputed | Valid challenge is accepted. | Challenge is within window and satisfies policy requirements. | Blocks finalization when procedure is contested. |
| Disputed | ChallengeOpen | Challenge is resolved without invalidating candidate result. | Resolution commitment exists and no blocking challenge remains. | Allows evaluation to continue after dispute resolution. |
| ChallengeOpen | Finalized | Challenge window closes with no blocking challenge. | Candidate result exists, deadline passed, no active blocking disputes. | Produces immutable public outcome. |
| Any non-final state | Cancelled | Authorized cancellation or terminal validation failure. | Caller is authorized and cancellation policy permits it. | Provides a controlled terminal path for invalid or abandoned evaluations. |

Exact status labels may be refined during implementation, but the lifecycle
semantics should remain stable because SDKs, indexers, and governance processes
will depend on them.

## Consensus Workflow

ACE should coordinate consensus without embedding a single permanent academic
scoring algorithm into the base contract.

The recommended workflow is:

1. Collect valid report commitments during the review window.
2. Verify that each report references the correct submission, rubric, evaluator,
   and schema version.
3. Determine consensus readiness from the active rubric or policy.
4. Record a candidate result commitment and the report identifiers included in
   the candidate.
5. Open a challenge window.
6. Resolve any valid challenges.
7. Finalize the result when the challenge window has closed and no blocking
   dispute remains.

Why: consensus algorithms may differ across peer review, replication review,
grant review, and post-publication review. The contract should enforce the
integrity of inputs, outputs, and lifecycle gates while allowing policy-specific
consensus derivation to evolve.

Consensus result commitments should include:

- Submission identifier.
- Rubric identifier and version.
- Included report identifiers.
- Decision or recommendation.
- Aggregate score or structured outcome, if applicable.
- Consensus method identifier.
- Schema version.
- Content hash for any off-chain summary.

## AI Evaluation Pipeline

The AI evaluation pipeline defines how validator-operated AI systems should
produce reproducible academic assessments. The design is independent of any
specific LLM provider, model family, hosting environment, or GenLayer runtime
API. Implementations should treat AI output as evidence submitted by validators,
not as unquestioned truth.

Recommended pipeline:

1. Freeze the evaluation context: submission commitment, rubric commitment,
   criterion definitions, allowed reference material, policy version, and
   output schema version.
2. Build a provider-neutral prompt packet from the frozen context.
3. Run independent validator evaluations without sharing intermediate answers.
4. Require each validator to return deterministic structured JSON conforming to
   the active schema.
5. Validate JSON syntax, schema compliance, score bounds, criterion coverage,
   evidence references, and confidence fields.
6. Reject malformed responses or route them through the retry policy.
7. Compare valid reports for score agreement, recommendation agreement,
   evidence consistency, and explanation quality.
8. Derive consensus confidence from validator agreement, individual confidence,
   response validity, and evidence support.
9. Record report commitments and a candidate consensus commitment.
10. Open the challenge window before finalization.

Why: academic evaluation must be reproducible and transparent. Freezing the
context and requiring structured outputs makes validator responses comparable,
auditable, and easier to challenge.

## Validator Responsibilities

Validators are responsible for producing policy-compliant assessments and for
disclosing enough metadata to make their review process auditable.

| Responsibility | Requirement | Rationale |
| -------------- | ----------- | --------- |
| Context integrity | Evaluate only the submission, rubric, and references identified by the frozen evaluation context. | Prevents validators from silently relying on different materials. |
| Independent judgment | Produce an assessment without coordinating with other validators during the independent review phase. | Reduces correlated errors and collusion risk. |
| Structured output | Return only schema-valid JSON for machine-checked fields. | Enables deterministic validation and consensus comparison. |
| Evidence grounding | Cite artifact sections, dataset references, code paths, or source commitments for material claims. | Supports transparency and educational fairness. |
| Conflict disclosure | Report conflicts, uncertainty, missing information, and scope limitations. | Allows the protocol to discount or challenge compromised reviews. |
| Fairness review | Avoid penalizing writing style, institution, geography, identity, or non-native language patterns unless directly relevant to the rubric. | Aligns evaluation with academic merit rather than status or presentation bias. |
| Metadata disclosure | Commit to provider-neutral metadata such as model class, prompt template version, retrieval policy, tool policy, and schema version. | Improves reproducibility without requiring a specific LLM provider. |
| Confidentiality | Respect access rules for unpublished or private academic material. | Protects researchers, reviewers, and institutions. |

Validators should be accountable for malformed, unsupported, or low-quality
responses through policy-defined retry limits, report exclusion, reputation
effects, or dispute review.

## Consensus Decision Flow

The consensus decision flow compares validated reports and produces a candidate
outcome.

1. Exclude reports that fail schema validation or authorization checks.
2. Exclude or flag reports with invalid score ranges, missing required
   criterion scores, unsupported recommendation values, or unverifiable
   evidence references.
3. Normalize criterion scores according to the rubric.
4. Compute per-criterion agreement across validators.
5. Compute recommendation agreement across validators.
6. Identify outlier reports that materially deviate from the validator set.
7. Apply policy-defined quorum and agreement thresholds.
8. Produce one of the policy-supported candidate outcomes:
   `accepted`, `revision_required`, `rejected`, `inconclusive`, or
   `manual_review_required`.
9. Derive consensus confidence.
10. Commit the candidate result and open the challenge window.

Inconsistent validator responses should not be averaged blindly. If disagreement
exceeds policy thresholds, the workflow should either reduce consensus
confidence, require additional validators, route to re-evaluation, or mark the
result as requiring manual review.

Why: disagreement is informative in academic review. Treating inconsistency as
a first-class signal improves fairness and reduces false certainty.

## Prompt Design Principles

Prompts should be provider-neutral, versioned, and reproducible. The contract
specification should not prescribe a model API, but the protocol should require
prompt packets to follow stable design principles.

Prompt packets should:

- Identify the submission commitment, rubric commitment, schema version, and
  evaluation type.
- Include only policy-approved context and references.
- Instruct validators to assess against the rubric rather than prestige,
  authorship, affiliation, writing fluency, or expected citation impact.
- Require criterion-by-criterion scoring.
- Require evidence references for every material criticism or positive claim.
- Require explicit uncertainty and limitation disclosures.
- Prohibit hidden chain-of-thought disclosure while requiring concise,
  inspectable rationales.
- Require deterministic JSON output with no prose outside the JSON object.
- Include formatting rules for numbers, enum values, missing evidence, and
  abstentions.
- Include a prompt template identifier and version.

Why: consistent prompts reduce avoidable validator variance while preserving
independent academic judgment.

## Structured JSON Response Schema

Validator responses must be deterministic structured JSON. The schema below is
logical and provider-neutral; implementations may serialize it differently as
long as the fields and validation semantics are preserved.

| Field | Type | Required | Validation Rules | Purpose |
| ----- | ---- | -------- | ---------------- | ------- |
| `schemaVersion` | String | Yes | Must match a supported report schema version. | Allows deterministic parsing and migrations. |
| `submissionId` | Identifier | Yes | Must match the evaluated submission. | Prevents cross-submission report reuse. |
| `rubricId` | Identifier | Yes | Must match the active rubric. | Ensures scores are interpreted under the correct criteria. |
| `validatorId` | Identifier | Yes | Must identify the submitting validator. | Binds response to validator authorization. |
| `evaluationType` | `EvaluationType` | Yes | Must match the submission evaluation type. | Prevents applying the wrong workflow. |
| `criterionScores` | Array of objects | Yes | Must include every required criterion exactly once unless policy permits abstention. | Provides comparable per-criterion assessments. |
| `criterionScores[].criterionId` | Identifier | Yes | Must reference a rubric criterion. | Links score to rubric definition. |
| `criterionScores[].score` | Number | Yes | Must be within criterion bounds. | Supports aggregation and agreement checks. |
| `criterionScores[].confidence` | Number | Yes | Must be in the normalized range `0.0` to `1.0`. | Captures criterion-level certainty. |
| `criterionScores[].rationale` | String or commitment | Yes | Must be concise, evidence-grounded, and within length limits if stored directly. | Provides explainability without exposing hidden reasoning. |
| `criterionScores[].evidenceRefs` | Array | Conditional | Required when the criterion requires evidence; each reference must map to approved context. | Grounds claims in submitted artifacts. |
| `criterionScores[].flags` | Array of enum strings | No | Must use registered flags or namespaced custom flags. | Identifies concerns for disputes or manual review. |
| `overallRecommendation` | Enum string | Yes | Must be one of the rubric-supported recommendation values. | Captures validator decision. |
| `overallConfidence` | Number | Yes | Must be in the normalized range `0.0` to `1.0`. | Supports consensus confidence. |
| `summary` | String or commitment | Yes | Must be concise, respectful, and rubric-grounded. | Provides human-readable explanation. |
| `limitations` | Array of strings or commitments | Yes | Must disclose missing data, uncertainty, scope limits, or abstention reasons. | Supports fair interpretation. |
| `fairnessChecklist` | Object | Yes | Must confirm that protected or irrelevant status signals were not used as scoring criteria. | Promotes educational fairness. |
| `modelMetadata` | Object or commitment | Yes | Must include provider-neutral metadata such as prompt version, model class, retrieval policy, and tool policy. | Supports reproducibility and audit. |
| `responseHash` | Content hash | Conditional | Required when the response is stored off-chain. | Verifies response integrity. |

Malformed AI responses should be rejected before consensus. A response is
malformed if it is not valid JSON, fails schema validation, omits required
fields, includes non-deterministic prose outside the JSON object, uses invalid
enum values, produces out-of-range scores, references unknown criteria, or cites
unapproved evidence.

## Confidence Scoring

Consensus confidence should be derived from multiple signals rather than from a
single model's self-reported certainty.

Recommended confidence inputs:

- Validator-level confidence from each valid report.
- Per-criterion confidence across validators.
- Score variance per criterion.
- Recommendation agreement rate.
- Evidence coverage and evidence consistency.
- Number of valid reports relative to required quorum.
- Validator reliability or reputation if the active policy supports it.
- Presence of unresolved flags, limitations, abstentions, or disputes.
- Retry count and whether retries changed material conclusions.

A provider-neutral confidence derivation can use this conceptual model:

```text
consensusConfidence =
  agreementSignal
  x evidenceSignal
  x quorumSignal
  x validatorReliabilitySignal
  x responseValiditySignal
  x disputePenalty
```

The exact formula should be defined by the active rubric or evaluation policy
and committed with the consensus method identifier. Confidence should decrease
when validators disagree, evidence is weak, retries are required, reports are
excluded, or material limitations are disclosed.

Why: self-reported model confidence is not calibrated across providers.
Consensus confidence must therefore be based primarily on cross-validator
agreement and evidence quality.

## Consensus Agreement Rules

Agreement rules should be explicit in the active policy and reproducible from
valid report commitments.

Recommended rule categories:

| Rule | Description | Handling |
| ---- | ----------- | -------- |
| Quorum rule | Minimum number of valid reports required. | If unmet, request retry, additional validators, or mark inconclusive. |
| Recommendation agreement | Required agreement level for final recommendation. | If unmet, lower confidence or route to manual review. |
| Criterion variance | Maximum allowed score spread for each criterion or weighted total. | High variance triggers outlier analysis or re-evaluation. |
| Evidence agreement | Validators should cite compatible evidence for major claims. | Conflicting evidence triggers flags or dispute eligibility. |
| Outlier rule | Reports far outside the validator distribution require review. | Outliers may be excluded only under documented policy rules. |
| Fairness rule | Reports relying on irrelevant identity, prestige, or language fluency signals are invalid or flagged. | Exclude, retry, or escalate depending on severity. |
| Abstention rule | Validators may abstain when evidence is insufficient or conflicts exist. | Abstentions reduce quorum unless policy counts them separately. |

Inconsistent responses should be handled as follows:

- Minor score differences within tolerance: aggregate under the policy formula.
- Criterion-specific disagreement: lower criterion confidence and preserve the
  disagreement in the explanation.
- Recommendation disagreement: lower overall confidence and consider additional
  validators.
- Evidence contradiction: flag for re-evaluation or manual review.
- Policy violation: exclude the report and record the exclusion reason.

## Retry / Re-evaluation Strategy

Retries should improve robustness without allowing validators to keep sampling
until a desired answer appears.

Recommended strategy:

- Retry only for malformed output, transient evaluator failure, missing required
  fields, or policy-defined inconsistency.
- Use the same frozen evaluation context for retries unless the protocol records
  a new context version.
- Limit retry count per validator and per submission.
- Preserve commitments to failed or excluded attempts when policy requires
  auditability.
- Do not allow a validator to see other validators' reports before completing a
  retry in the independent phase.
- If retries materially change scores or recommendations, lower confidence or
  require additional review.
- If retry limits are exhausted, mark the report invalid, request a replacement
  validator, or move the submission to `manual_review_required` or
  `inconclusive` under the policy.

Why: retries are necessary for malformed AI output, but unbounded retries reduce
reproducibility and can bias the final decision.

## Failure Modes

The workflow should define explicit handling for foreseeable failures.

| Failure Mode | Detection | Handling |
| ------------ | --------- | -------- |
| Invalid JSON | Parser fails or extra prose appears outside the object. | Reject response and retry if retry budget remains. |
| Schema violation | Required field missing, wrong type, unknown enum, unsupported version. | Reject response and retry or exclude. |
| Score bounds violation | Score outside criterion range or invalid normalized confidence. | Reject response; do not include in consensus. |
| Missing criterion | Required criterion omitted or duplicated. | Reject response unless policy permits partial review. |
| Unapproved evidence | Evidence reference not in frozen context. | Reject, retry, or flag depending on policy severity. |
| Hallucinated claim | Claim lacks evidence or contradicts provided artifacts. | Flag criterion, reduce confidence, and consider re-evaluation. |
| Validator disagreement | Scores, recommendations, or evidence diverge beyond thresholds. | Lower confidence, request more validators, or route to manual review. |
| Low confidence | Validator or consensus confidence below threshold. | Mark inconclusive, request more review, or require manual review. |
| Bias or unfair criterion use | Report references irrelevant status signals or protected attributes. | Exclude or escalate under fairness policy. |
| Provider outage or timeout | Validator cannot produce a response within policy window. | Retry, replace validator, or extend only under documented policy. |
| Confidentiality violation | Response exposes protected content beyond allowed scope. | Exclude response, open incident review, and prevent public disclosure. |

Failure handling should be visible in audit metadata. Excluded reports should
not silently disappear from the process; the protocol should preserve enough
commitment-level information to explain why they were not counted.

## Explainability Requirements

ACE should require explanations that are useful for learning, review, and audit
without requiring hidden chain-of-thought or provider-specific reasoning traces.

Required explainability properties:

- Each criterion score must include a concise rationale.
- Material claims must cite approved evidence references.
- Negative assessments should identify actionable issues where possible.
- Reports should distinguish evidence-backed findings from uncertainty.
- Summaries should be respectful and suitable for educational feedback.
- Consensus output should explain agreement, disagreement, excluded reports,
  confidence drivers, and any limitations.
- Finalized results should reference the rubric version, consensus method, valid
  report commitments, and challenge outcomes.
- Fairness checks should state whether irrelevant prestige, identity,
  geography, or language fluency signals were excluded from scoring.

Consensus explanations should preserve disagreement rather than hiding it. If
validators materially diverge on a criterion, the final explanation should state
that the criterion had low agreement and describe the evidence conflict or score
spread at a high level.

Why: ACE is intended for academic and educational evaluation. Transparent
feedback is necessary for trust, reproducibility, and fair improvement by
authors.

## Error Handling Strategy

The contract design should use explicit, stable error categories. Exact error
mechanics depend on the final GenLayer SDK and runtime conventions, so this
document defines semantic errors rather than implementation syntax.

| Error Category | Example Conditions | Recommended Handling | Why |
| -------------- | ------------------ | -------------------- | --- |
| Authorization errors | Caller cannot register, assign, submit, challenge, resolve, or finalize. | Reject the operation and preserve current state. | Prevents unauthorized state changes. |
| Validation errors | Missing field, invalid hash, unsupported schema version, incompatible rubric. | Reject before writing state. | Keeps stored records well-formed. |
| Lifecycle errors | Invalid transition, terminal state mutation, premature finalization. | Reject and expose current status where possible. | Protects protocol invariants. |
| Eligibility errors | Evaluator not assigned, duplicate report, evaluator suspended. | Reject report submission. | Protects consensus input integrity. |
| Deadline errors | Review window closed, challenge window closed, finalization too early. | Reject or route to the policy-defined late path. | Makes time-bound workflows predictable. |
| Conflict errors | Submission already exists, report already submitted, challenge already resolved. | Reject idempotency-breaking writes. | Prevents accidental overwrites. |
| Governance errors | Unsupported policy update, retired rubric activation, invalid configuration. | Reject privileged operation and emit no state change. | Protects upgrade and policy safety. |

Errors should be stable enough for SDKs to map them to typed client exceptions.
Where possible, read methods should allow clients to inspect the current state
needed to recover from a failed write.

## Security Considerations

### State Integrity

All lifecycle transitions should pass through a single validation path. This
reduces the chance that one public method bypasses checks enforced by another.

### Finalization Immutability

Finalized evaluations should be immutable. Any post-finalization correction
should be represented as a new linked record, amendment, or governance action
rather than modifying the finalized result.

### Confidential Review Content

The contract should store commitments to private reports, not private report
text. This design reduces disclosure risk while preserving auditability through
hash verification and controlled off-chain access.

### Evaluator Abuse

The contract should prevent duplicate reports, unauthorized reports, and reports
from ineligible evaluators. Future versions may add staking, reputation, or
slashing, but the base architecture should not require those mechanisms.

### Rubric Integrity

Rubric versions should be immutable once used by a submission. Deprecated or
retired rubrics must remain readable so historical evaluations can be
interpreted.

### Challenge Safety

Challenges should block finalization only when they satisfy policy-defined
requirements. This avoids both premature finalization and denial-of-service
through invalid challenges.

### Event Reliability

Every successful state transition should emit an event containing protocol
version, relevant identifiers, actor, and timestamp or block reference. Events
are the primary integration surface for indexers and audit tools.

### Minimal Privilege

Privileged actors should have narrow responsibilities: rubric governance,
assignment coordination, dispute resolution, or emergency pause if one is later
approved. Concentrating all powers in a single operator should be avoided.

## Upgrade Strategy

ACE should be designed for long-term schema and policy evolution while
preserving historical evaluation records.

Recommended strategy:

- Version all externally interpreted records with `schemaVersion`.
- Treat finalized submissions, reports, and results as append-only history.
- Add new fields through namespaced `extensions` before changing core schemas.
- Keep retired rubrics and old consensus method identifiers readable.
- Emit versioned events when event payloads change.
- Use governance review for changes affecting finalization, evaluator
  eligibility, challenge handling, or rubric activation.
- Prefer additive public methods over breaking changes to existing methods.

Why: academic records may be cited, audited, or reused long after a protocol
upgrade. Backward readability is therefore a correctness requirement, not just a
developer convenience.

## Gas/Storage Optimization Considerations

GenLayer execution cost and storage behavior should be validated against the
actual runtime before implementation. At the design level, ACE should minimize
persistent state and avoid storing large dynamic artifacts.

Recommended considerations:

- Store hashes and URIs instead of full documents, reviews, model outputs, or
  datasets.
- Keep submission root records compact and move unbounded lists into separate
  mappings or event-indexed records.
- Use events for integration data that does not need synchronous contract reads.
- Avoid rewriting historical arrays when appending reports or challenges.
- Prefer stable identifiers over copying full nested objects into multiple
  records.
- Keep extension fields optional and commitment-based to avoid forcing every
  submission to pay for rarely used metadata.
- Archive or mark inactive configuration instead of deleting records needed for
  auditability.
- Design pagination-friendly read surfaces for any enumerable collections.

Why: ACE evaluation records can accumulate over time, and academic artifacts are
often large. Storage discipline protects protocol sustainability and keeps the
contract usable as evaluation volume grows.

## Data Commitments

Contracts should prefer commitments over raw content for large or sensitive
academic data.

Expected commitment fields:

- URI or storage reference.
- Content hash.
- Schema version.
- Optional encryption or access-control metadata reference.
- Timestamp or block reference.

## Data Model

The ACE data model is specified as protocol-facing schema guidance. It is not
contract code. Implementations should preserve these fields semantically while
allowing storage-specific representations, versioned extensions, and
privacy-preserving commitments.

### Submission

A `Submission` represents an academic artifact or claim submitted for
evaluation.

| Field | Type | Description | Validation Rules | Required | Relationships |
| ----- | ---- | ----------- | ---------------- | -------- | ------------- |
| `submissionId` | `bytes32` or canonical string identifier | Unique protocol identifier for the submission. | Must be globally unique within the protocol; should be deterministic or collision-resistant; immutable after creation. | Yes | Referenced by `EvaluationReport.submissionId` and lifecycle events. |
| `schemaVersion` | Semantic version string | Version of the submission schema used to interpret the record. | Must be a supported schema version; immutable after creation. | Yes | Used by SDKs, indexers, and future migration tooling. |
| `requester` | Address or account identifier | Account that registered the evaluation request. | Must be a valid account; must be authorized to create the request. | Yes | May control cancellation or amendment actions before review begins. |
| `title` | String | Human-readable submission title. | Must be non-empty; should have a protocol-defined maximum length. | Yes | Displayed by frontends and indexers. |
| `abstract` | String or off-chain commitment | Short description of the academic work or claim. | Must be present directly or through a valid content commitment; should avoid confidential content if public. | Yes | Included in evaluation context for assigned evaluators. |
| `artifactUri` | URI string | Location of the submitted paper, dataset, code, claim packet, or metadata bundle. | Must use an approved URI scheme; should resolve to immutable or versioned content. | Yes | Paired with `artifactHash`; consumed by evaluators. |
| `artifactHash` | Content hash | Integrity commitment for the primary submitted artifact. | Must match the referenced artifact bytes or canonical metadata representation. | Yes | Used to verify evaluator inputs and audit records. |
| `metadataUri` | URI string | Location of extended submission metadata. | Must use an approved URI scheme when present. | No | May include authorship, field, keywords, institution, or funding metadata. |
| `metadataHash` | Content hash | Integrity commitment for extended metadata. | Required when `metadataUri` is present; must match referenced metadata. | Conditional | Verifies off-chain metadata consumed by SDKs and indexers. |
| `rubricId` | Identifier | Rubric selected for the evaluation. | Must reference an active or explicitly allowed rubric version. | Yes | References `Rubric.rubricId`. |
| `evaluationType` | `EvaluationType` | Category of evaluation requested. | Must be one of the supported evaluation type values for the selected rubric. | Yes | Determines eligible rubric and lifecycle rules. |
| `status` | `EvaluationStatus` | Current lifecycle state of the submission evaluation. | Must transition only through allowed lifecycle transitions. | Yes | Updated by the evaluation coordinator. |
| `createdAt` | Timestamp or block reference | Time the submission was registered. | Must be set by protocol execution; immutable after creation. | Yes | Used for ordering, time windows, and audit trails. |
| `updatedAt` | Timestamp or block reference | Time of the latest state transition. | Must be greater than or equal to `createdAt`; updated on state changes. | Yes | Used by indexers and lifecycle monitors. |
| `reviewWindowEndsAt` | Timestamp or block reference | Deadline for evaluator report submission. | Must be after `createdAt` when present; required for time-bounded evaluations. | Conditional | Governs when consensus may begin. |
| `challengeWindowEndsAt` | Timestamp or block reference | Deadline for procedural challenges. | Must be after candidate consensus publication when present. | Conditional | Governs finalization eligibility. |
| `extensions` | Map of string keys to typed values or commitments | Reserved extension area for field-specific, institution-specific, or policy-specific metadata. | Keys must be namespaced; values must be schema-valid; extensions must not override core fields. | No | Enables future rubric, governance, storage, or institutional integrations. |

### Rubric

A `Rubric` defines the criteria, scoring rules, and policy constraints used to
evaluate a submission.

| Field | Type | Description | Validation Rules | Required | Relationships |
| ----- | ---- | ----------- | ---------------- | -------- | ------------- |
| `rubricId` | `bytes32` or canonical string identifier | Unique identifier for a rubric version. | Must be unique; should change when scoring semantics change. | Yes | Referenced by `Submission.rubricId` and `EvaluationReport.rubricId`. |
| `schemaVersion` | Semantic version string | Version of the rubric schema. | Must be supported by the protocol and SDK. | Yes | Enables future rubric migrations. |
| `name` | String | Human-readable rubric name. | Must be non-empty; should have a protocol-defined maximum length. | Yes | Displayed in clients and audit views. |
| `description` | String or off-chain commitment | Summary of the rubric purpose and scope. | Must be present directly or through a valid content commitment. | Yes | Helps requesters and evaluators select the correct policy. |
| `evaluationType` | `EvaluationType` | Evaluation type the rubric supports. | Must be one of the supported evaluation type values. | Yes | Must be compatible with `Submission.evaluationType`. |
| `criteria` | Ordered list of `Criterion` identifiers or embedded criterion records | Criteria included in the rubric. | Must contain at least one criterion; criterion identifiers must be unique within the rubric. | Yes | Owns or references `Criterion` records. |
| `minimumScore` | Decimal or integer | Lowest total score allowed by the rubric. | Must be less than `maximumScore`. | Yes | Used to validate `EvaluationReport.totalScore`. |
| `maximumScore` | Decimal or integer | Highest total score allowed by the rubric. | Must be greater than `minimumScore`. | Yes | Used to validate `EvaluationReport.totalScore`. |
| `passingThreshold` | Decimal or integer | Optional threshold for positive recommendation or acceptance. | Must be within `[minimumScore, maximumScore]` when present. | No | Used by consensus and frontend interpretation. |
| `requiredEvaluatorCount` | Positive integer | Minimum number of reports needed before consensus. | Must be greater than zero. | Yes | Controls lifecycle transition from review to consensus. |
| `allowOpenReview` | Boolean | Whether unassigned eligible evaluators may submit reports. | Must be explicitly set; defaults should be avoided. | Yes | Affects evaluator authorization and invariants. |
| `criteriaHash` | Content hash | Integrity commitment for the canonical rubric and criteria definition. | Must match the canonical serialized rubric. | Yes | Used by reports and audit tools. |
| `status` | Enum string | Lifecycle status of the rubric, such as `active`, `deprecated`, or `retired`. | Must be a supported rubric status; retired rubrics must remain readable. | Yes | Controls whether new submissions may reference the rubric. |
| `createdAt` | Timestamp or block reference | Time the rubric version was registered. | Must be set by protocol execution; immutable after creation. | Yes | Used in governance and audit trails. |
| `supersedesRubricId` | Identifier | Previous rubric version replaced by this rubric. | Must reference an existing rubric when present. | No | Supports policy version history. |
| `extensions` | Map of string keys to typed values or commitments | Reserved extension area for discipline-specific or governance-specific rubric metadata. | Keys must be namespaced; values must be schema-valid. | No | Enables future policy modules and institutional overlays. |

### Criterion

A `Criterion` defines one measurable dimension of a rubric.

| Field | Type | Description | Validation Rules | Required | Relationships |
| ----- | ---- | ----------- | ---------------- | -------- | ------------- |
| `criterionId` | `bytes32` or canonical string identifier | Unique identifier for the criterion within a rubric. | Must be unique within `Rubric.criteria`; should remain stable for compatible rubric revisions. | Yes | Referenced by `CriterionScore.criterionId`. |
| `rubricId` | Identifier | Rubric that owns or includes the criterion. | Must reference an existing rubric. | Yes | References `Rubric.rubricId`. |
| `name` | String | Human-readable criterion name. | Must be non-empty; should have a protocol-defined maximum length. | Yes | Displayed in evaluator and audit interfaces. |
| `description` | String or off-chain commitment | Explanation of what the criterion measures. | Must be present directly or through a valid content commitment. | Yes | Used by evaluators to produce consistent reports. |
| `weight` | Decimal | Relative contribution of the criterion to the total score. | Must be greater than or equal to zero; rubric should define whether weights must sum to `1.0` or `100`. | Yes | Used to compute or validate `EvaluationReport.totalScore`. |
| `minimumScore` | Decimal or integer | Lowest allowed score for this criterion. | Must be less than `maximumScore`. | Yes | Bounds `CriterionScore.score`. |
| `maximumScore` | Decimal or integer | Highest allowed score for this criterion. | Must be greater than `minimumScore`. | Yes | Bounds `CriterionScore.score`. |
| `scoringGuidanceUri` | URI string | Optional location of detailed scoring guidance or examples. | Must use an approved URI scheme when present. | No | Consumed by evaluators and SDK clients. |
| `scoringGuidanceHash` | Content hash | Integrity commitment for scoring guidance. | Required when `scoringGuidanceUri` is present. | Conditional | Verifies off-chain guidance. |
| `requiresEvidence` | Boolean | Whether evaluators must provide evidence for this criterion. | Must be explicitly set. | Yes | Controls validation of `CriterionScore.evidence`. |
| `order` | Non-negative integer | Display and evaluation order within the rubric. | Must be unique within a rubric when present. | No | Used by frontends and report rendering. |
| `extensions` | Map of string keys to typed values or commitments | Reserved extension area for field-specific scoring metadata. | Keys must be namespaced; values must be schema-valid. | No | Enables discipline-specific scoring methods. |

### EvaluationReport

An `EvaluationReport` represents an evaluator's structured assessment of a
submission under a specific rubric.

| Field | Type | Description | Validation Rules | Required | Relationships |
| ----- | ---- | ----------- | ---------------- | -------- | ------------- |
| `reportId` | `bytes32` or canonical string identifier | Unique identifier for the evaluation report. | Must be unique; immutable after creation. | Yes | Referenced by consensus, disputes, and audit events. |
| `schemaVersion` | Semantic version string | Version of the report schema. | Must be supported by the active protocol version. | Yes | Enables future report migrations. |
| `submissionId` | Identifier | Submission being evaluated. | Must reference an existing submission in a review-eligible state. | Yes | References `Submission.submissionId`. |
| `rubricId` | Identifier | Rubric used for the evaluation. | Must match `Submission.rubricId` unless a policy-approved override exists. | Yes | References `Rubric.rubricId`. |
| `evaluatorId` | Identifier | Evaluator that authored the report. | Must identify an eligible evaluator; must satisfy assignment or open-review policy. | Yes | References evaluator registry records. |
| `criterionScores` | Ordered list of `CriterionScore` records | Per-criterion scores and evidence. | Must include every required criterion exactly once unless the rubric permits partial review. | Yes | Contains `CriterionScore` records referencing `Criterion`. |
| `totalScore` | Decimal or integer | Aggregate score under the rubric. | Must be within rubric bounds; must match the rubric aggregation rule when deterministic. | Conditional | Derived from `CriterionScore` records or supplied with validation. |
| `recommendation` | Enum string | Evaluator recommendation, such as `accept`, `revise`, `reject`, or `abstain`. | Must be supported by the rubric or evaluation policy. | No | May contribute to consensus result. |
| `confidence` | Decimal | Evaluator confidence in the report. | Must be within a protocol-defined range, such as `0` to `1` or `0` to `100`. | No | May be used by consensus or audit tools. |
| `summaryUri` | URI string | Optional location of written review summary. | Must use an approved URI scheme when present. | No | Paired with `summaryHash`; may be access-controlled. |
| `summaryHash` | Content hash | Integrity commitment for the written summary. | Required when `summaryUri` is present. | Conditional | Verifies off-chain review content. |
| `modelMetadataUri` | URI string | Optional metadata for AI-assisted evaluation, including model, prompt policy, and tool context. | Must use an approved URI scheme when present; should not expose secrets. | No | Supports auditability for AI-assisted reviews. |
| `modelMetadataHash` | Content hash | Integrity commitment for AI evaluation metadata. | Required when `modelMetadataUri` is present. | Conditional | Verifies off-chain AI metadata. |
| `conflictDisclosures` | List of strings or commitments | Disclosures about conflicts, limitations, or abstention reasons. | Must be present when required by policy; should use controlled reason codes where possible. | Conditional | Used by dispute and audit processes. |
| `status` | Enum string | Report status, such as `submitted`, `accepted`, `rejected`, or `superseded`. | Must follow report-specific transition rules. | Yes | Affects consensus eligibility. |
| `submittedAt` | Timestamp or block reference | Time the report was submitted. | Must be set by protocol execution; must fall within allowed review windows unless policy permits exceptions. | Yes | Used by lifecycle and dispute windows. |
| `extensions` | Map of string keys to typed values or commitments | Reserved extension area for report metadata. | Keys must be namespaced; values must be schema-valid; extensions must not alter core scoring semantics. | No | Enables future review methods and institution-specific fields. |

### CriterionScore

A `CriterionScore` records an evaluator's assessment for one criterion.

| Field | Type | Description | Validation Rules | Required | Relationships |
| ----- | ---- | ----------- | ---------------- | -------- | ------------- |
| `criterionScoreId` | `bytes32` or canonical string identifier | Unique identifier for the criterion score record. | Must be unique within the report or derivable from `reportId` and `criterionId`. | Yes | Referenced by audit tools and dispute evidence. |
| `reportId` | Identifier | Evaluation report containing the score. | Must reference an existing report. | Yes | References `EvaluationReport.reportId`. |
| `criterionId` | Identifier | Criterion being scored. | Must reference a criterion included in the report's rubric. | Yes | References `Criterion.criterionId`. |
| `score` | Decimal or integer | Numeric score assigned for the criterion. | Must be within the criterion's inclusive score range. | Yes | Used to compute `EvaluationReport.totalScore`. |
| `normalizedScore` | Decimal | Optional normalized score for cross-rubric comparison. | Must be within a protocol-defined normalized range, such as `0` to `1`, when present. | No | Supports analytics and future consensus methods. |
| `rationaleUri` | URI string | Optional location of evaluator rationale for this criterion. | Required when the criterion requires evidence and rationale is stored off-chain; must use an approved URI scheme. | Conditional | Paired with `rationaleHash`. |
| `rationaleHash` | Content hash | Integrity commitment for criterion rationale. | Required when `rationaleUri` is present. | Conditional | Verifies off-chain rationale. |
| `evidence` | List of URI/hash pairs or structured commitments | Evidence supporting the score. | Required when `Criterion.requiresEvidence` is true; each item must include verifiable integrity metadata. | Conditional | Links score to submission artifacts, citations, datasets, or replication outputs. |
| `confidence` | Decimal | Evaluator confidence for this criterion score. | Must be within a protocol-defined range when present. | No | May be used for weighted consensus or audit review. |
| `flags` | List of enum strings | Structured concerns such as `missing_evidence`, `methodology_issue`, or `conflict_detected`. | Must use registered flag values; unknown values should be namespaced. | No | May trigger disputes or secondary review. |
| `extensions` | Map of string keys to typed values or commitments | Reserved extension area for specialized scoring data. | Keys must be namespaced; values must be schema-valid. | No | Enables future discipline-specific evidence and scoring models. |

### EvaluationStatus

`EvaluationStatus` defines lifecycle states for a submission evaluation. New
statuses may be added in future major versions, but existing status semantics
must remain stable for historical records.

| Field | Type | Description | Validation Rules | Required | Relationships |
| ----- | ---- | ----------- | ---------------- | -------- | ------------- |
| `draft` | Enum literal | Submission is being prepared off-chain and is not yet registered. | Must not appear as an on-chain registered final state unless draft tracking is explicitly supported. | No | Precedes `Submission` registration. |
| `registered` | Enum literal | Submission has been accepted by the protocol. | Must be entered only once per `submissionId`. | Yes | Initial protocol state for `Submission.status`. |
| `validating` | Enum literal | Intake validation is in progress. | Must follow `registered`; must resolve to `assigned`, `cancelled`, or an equivalent failure state. | Yes | Used by validation services and lifecycle events. |
| `assigned` | Enum literal | Evaluators have been selected or review eligibility has been established. | Must follow successful validation. | Yes | Precedes `EvaluationReport` submission. |
| `in_review` | Enum literal | Evaluators may submit reports. | Must have an active review window or policy-defined open review condition. | Yes | Allows `EvaluationReport` creation. |
| `consensus_pending` | Enum literal | Required review conditions are met and consensus formation is pending. | Must not be entered until required report conditions are satisfied or review window closes. | Yes | Precedes candidate result publication. |
| `challenge_open` | Enum literal | Candidate result exists and procedural challenges may be opened. | Must include a challenge deadline when policy requires one. | Yes | Allows challenge records and blocks finalization until eligible. |
| `disputed` | Enum literal | A valid challenge requires resolution. | Must reference at least one active challenge. | Yes | Blocks finalization. |
| `finalized` | Enum literal | Evaluation result is final and immutable. | Terminal state; must not transition to non-terminal states. | Yes | Referenced by public result consumers. |
| `cancelled` | Enum literal | Evaluation ended before finalization. | Terminal state unless governance defines a re-open process. | Yes | Used for authorized cancellation or terminal validation failure. |

### EvaluationType

`EvaluationType` defines the category of academic evaluation being requested.
Types are intentionally broad so deployments can add domain-specific rubrics
without changing core lifecycle semantics.

| Field | Type | Description | Validation Rules | Required | Relationships |
| ----- | ---- | ----------- | ---------------- | -------- | ------------- |
| `peer_review` | Enum literal | General scholarly peer review of a paper, article, or academic claim. | Must use a rubric compatible with peer-review criteria. | Yes | Used by `Submission.evaluationType` and `Rubric.evaluationType`. |
| `replication_review` | Enum literal | Evaluation of whether results can be reproduced or replicated. | Must reference artifacts sufficient for replication assessment, such as code, data, or methods. | Yes | Often requires evidence-heavy `CriterionScore` records. |
| `methodology_review` | Enum literal | Focused assessment of study design, methods, statistics, or experimental setup. | Must use criteria that evaluate methodological soundness. | Yes | May be used as a component of broader peer review. |
| `dataset_review` | Enum literal | Evaluation of dataset quality, provenance, documentation, licensing, or bias. | Must reference dataset artifacts and metadata commitments. | Yes | May require privacy and data governance extensions. |
| `code_review` | Enum literal | Evaluation of research software, scripts, models, or computational artifacts. | Must reference code artifacts and reproducibility instructions. | Yes | May integrate with automated validation services. |
| `grant_review` | Enum literal | Evaluation of a proposal, funding request, or research plan. | Must define confidentiality and conflict disclosure requirements. | Yes | May require stricter access control. |
| `post_publication_review` | Enum literal | Evaluation performed after public release or publication. | Must identify the publication or public artifact being reviewed. | Yes | May reference prior submissions or finalized reports. |
| `custom` | Enum literal | Policy-defined evaluation type outside the standard categories. | Must include namespaced extension metadata and a compatible rubric. | No | Supports future extensibility without changing core schema. |

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
