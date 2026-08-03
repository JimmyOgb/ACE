# Contributing to Academic Consensus Engine

Thank you for your interest in contributing to Academic Consensus Engine
(ACE). ACE is an open-source GenLayer protocol project for decentralized AI
academic evaluation. Contributions should prioritize correctness,
reproducibility, security, and long-term maintainability.

## Scope

At this stage the repository is being scaffolded. Please do not add GenLayer
contract business logic, evaluation algorithms, or production protocol
behavior until the architecture and governance documents are in place.

## Development Principles

- Preserve clean architecture boundaries between `contracts`, `frontend`,
  `sdk`, `docs`, `examples`, and `tests`.
- Keep changes focused and reviewable.
- Prefer explicit interfaces and documented assumptions over implicit behavior.
- Include tests for behavior changes.
- Avoid committing generated artifacts, local environment files, secrets, or
  dependency caches.
- Document protocol, security, and governance decisions in `docs/`.

## Getting Started

1. Fork the repository and create a branch from the default branch.
2. Install only the dependencies required for the area you are changing.
3. Run relevant checks locally before opening a pull request.
4. Keep commits small and descriptive.

Suggested branch naming:

- `docs/<topic>`
- `scaffold/<topic>`
- `contracts/<topic>`
- `sdk/<topic>`
- `frontend/<topic>`
- `tests/<topic>`

## Pull Request Expectations

Every pull request should include:

- A clear summary of the change.
- The reason the change is needed.
- Any relevant architecture, security, or compatibility notes.
- Tests or a clear explanation for why tests are not applicable.
- Documentation updates when behavior, interfaces, or workflows change.

Pull requests must not:

- Introduce secrets or private keys.
- Remove existing files without an explicit maintainer-approved reason.
- Add contract business logic before the project reaches that milestone.
- Mix unrelated refactors with functional changes.

## Code Style

Use the style and tooling already present in the relevant package or module. If
tooling has not yet been established, keep formatting simple, conventional, and
consistent with the surrounding files.

## Commit Messages

Use concise, imperative commit messages. Examples:

- `Add repository contribution guidelines`
- `Scaffold CI workflow`
- `Document security reporting policy`

## Reviews

Maintainers review for correctness, maintainability, security impact,
architecture fit, and test coverage. Address review comments with follow-up
commits instead of force-pushing away discussion unless a maintainer requests a
rebase.

## Community Standards

All contributors must follow the project `CODE_OF_CONDUCT.md`.
