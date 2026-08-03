# Security Policy

Academic Consensus Engine is intended to become a production-quality,
open-source GenLayer protocol for decentralized AI academic evaluation. Security
reports are taken seriously, especially issues affecting protocol correctness,
fund safety, data integrity, privacy, model integrity, or supply chain
integrity.

## Supported Versions

The project is in early scaffolding. No production release is supported yet.
Security fixes will target the default branch until versioned releases are
introduced.

| Version | Supported |
| ------- | --------- |
| Default branch | Yes |
| Released packages | Not yet available |

## Reporting a Vulnerability

Please do not report security vulnerabilities in public issues.

Preferred reporting path:

1. Use the repository's private vulnerability reporting or private security
   advisory feature when available.
2. If private reporting is not available, contact the repository owner through
   the hosting platform's private channels.
3. Include enough detail to reproduce or assess the issue.

Useful report details include:

- Affected files, packages, contracts, or workflows.
- Impact and likely severity.
- Reproduction steps or proof of concept.
- Relevant logs, transaction hashes, dependency versions, or environment
  details.
- Suggested mitigation, if known.

## Response Expectations

Maintainers will make a best effort to:

- Acknowledge receipt within 5 business days.
- Triage severity and affected scope.
- Coordinate a fix before public disclosure when appropriate.
- Credit reporters when requested and safe to do so.

## Security Boundaries

Until contract logic is introduced, the primary security surface is repository
configuration, dependency management, CI, documentation, and development
workflow. Future security reviews must cover GenLayer contracts, SDK behavior,
frontend interactions, model calls, oracle assumptions, and protocol governance.

## Out of Scope

The following are generally out of scope unless they demonstrate a concrete
project impact:

- Social engineering against maintainers or contributors.
- Denial-of-service attacks against third-party infrastructure.
- Reports requiring access to private accounts or systems without permission.
- Vulnerabilities in unsupported local development setups.
