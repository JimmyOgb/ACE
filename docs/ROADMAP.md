# ACE Roadmap

## Overview

This roadmap describes the expected path from repository scaffolding to a
production-quality open-source GenLayer protocol for decentralized AI academic
evaluation. Dates and sequencing may change as technical research, governance,
and security review progress.

## Phase 0: Repository Foundation

Status: In progress.

Objectives:

- Establish repository structure.
- Add open-source governance documents.
- Document protocol, architecture, API, contract specification, and roadmap.
- Define contribution and security expectations.
- Avoid contract business logic until design review is complete.

Deliverables:

- MIT license.
- Contribution guidelines.
- Code of conduct.
- Security policy.
- CI scaffold.
- Issue and pull request templates.
- Initial protocol documentation.

## Phase 1: Protocol Design

Objectives:

- Finalize lifecycle states and state transition semantics.
- Define submission, policy, evaluator, review, challenge, and result schemas.
- Specify privacy model for confidential academic content.
- Define event schema for SDKs and indexers.
- Document threat model and trust assumptions.

Deliverables:

- Versioned protocol schema drafts.
- Threat model.
- Governance proposal for policy registration.
- Evaluation policy examples.
- Storage and indexing design.

## Phase 2: Contract Interface Design

Objectives:

- Define GenLayer contract interfaces without implementing final business
  logic prematurely.
- Map lifecycle transitions to contract responsibilities.
- Define access control, events, and invariants.
- Create direct tests for expected state transition behavior.

Deliverables:

- Contract interface specification.
- Test plan for lifecycle invariants.
- Event compatibility matrix.
- Security review checklist.

## Phase 3: MVP Implementation

Objectives:

- Implement the minimum viable protocol lifecycle.
- Support registration, evaluator assignment, review commitment, candidate
  consensus, challenge window, and finalization.
- Build SDK primitives for reading and writing protocol state.
- Build a basic frontend for submission and evaluation status.

Deliverables:

- Initial GenLayer contracts.
- SDK alpha.
- Frontend alpha.
- Direct and integration tests.
- Example evaluation workflow.

## Phase 4: Evaluation Policy Framework

Objectives:

- Support multiple policy types.
- Define policy versioning and deprecation.
- Add structured rubrics and scoring formats.
- Support domain-specific academic criteria.
- Evaluate AI-assisted review metadata requirements.

Deliverables:

- Policy registry implementation.
- Policy schema documentation.
- Example policies.
- Compatibility tests.

## Phase 5: Security, Privacy, and Auditability

Objectives:

- Complete protocol threat model.
- Review confidentiality guarantees.
- Add robust dispute handling.
- Add audit tooling for lifecycle records.
- Harden SDK and frontend handling of private content.

Deliverables:

- Security review report.
- Privacy design review.
- Audit log explorer.
- Dispute workflow tests.
- Release readiness checklist.

## Phase 6: Ecosystem Integrations

Objectives:

- Integrate external storage providers.
- Support institutional workflows.
- Provide evaluator service templates.
- Add examples for AI-assisted review agents.
- Support indexer and analytics integrations.

Deliverables:

- Storage integration examples.
- Evaluator service examples.
- Indexer reference implementation.
- Institution-facing integration guide.

## Phase 7: Production Release

Objectives:

- Publish stable protocol and SDK versions.
- Complete external review.
- Establish governance process.
- Define long-term maintenance and release policy.
- Prepare production deployment documentation.

Deliverables:

- Versioned release.
- Production deployment guide.
- Governance documentation.
- Maintainer operations guide.
- Public compatibility policy.

## Future Research Areas

- Reputation systems for academic evaluators.
- Collusion-resistant evaluator assignment.
- Privacy-preserving peer review.
- Reproducible AI evaluation metadata.
- Cross-field rubric interoperability.
- Appeals and arbitration mechanisms.
- Incentive design for high-quality review.
- Integration with journals, conferences, universities, funders, and
  replication platforms.

## Current Milestone Guardrail

The current milestone is documentation and repository scaffolding only. Contract
business logic, scoring algorithms, and production evaluator assignment rules
should not be implemented until the protocol design has been reviewed.
