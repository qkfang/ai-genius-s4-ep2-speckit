<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 1.0.1
Patch — Technology Stack table corrected: API backend
updated from ".NET 9 Minimal API" to "Node.js Express".
No principles were added, removed, or redefined.

Modified principles: none

Added sections: none

Removed sections: none

Templates reviewed:
  ✅ .specify/templates/plan-template.md
     — Constitution Check gate dynamically reads this file. No update needed.
  ✅ .specify/templates/spec-template.md
     — Generic; no principle-specific or stack-specific markers. No update needed.
  ✅ .specify/templates/tasks-template.md
     — Generic task structure; no stack-specific markers. No update needed.
  ✅ .github/prompts/*.prompt.md
     — Minimal frontmatter stubs; no outdated stack references found.

Deferred TODOs: none
-->

# AI Genius Constitution

## Core Principles

### I. Security-First

All user inputs MUST be validated at the API boundary before processing.
HTTPS is required for all production endpoints; plain-HTTP MUST NOT be exposed.
No credentials, tokens, API keys, or other secrets may be committed to source
code. All sensitive values MUST be stored in GitHub Secrets or Azure Key Vault
and injected at runtime.

**Rationale**: Security vulnerabilities discovered post-deployment are costly and
reputationally damaging. Enforcing these constraints at the design stage—before
code is written—eliminates entire classes of OWASP Top 10 risk.

### II. Cloud-Native

All Azure infrastructure MUST be defined as code using Azure Bicep templates
located in `bicep/`. Resources MUST be tagged with at minimum: `app`,
`component`, `environment`, and `managedBy=bicep`. All provisioning MUST be
idempotent and executed via `az deployment group create`; no manual
portal-based resource creation is permitted.

**Rationale**: IaC ensures environments are reproducible, auditable, and
consistent across development, staging, and production.

### III. CI/CD-Driven

Every merge to `main` MUST trigger automated build and deployment via GitHub
Actions. All pipeline checks MUST pass before a pull request may be merged.
No feature or fix may be deployed to Azure through any means other than the
approved workflow pipelines.

**Rationale**: Automated delivery removes human error from the release path and
provides a repeatable, auditable deployment record.

### IV. Simplicity

Standard libraries and built-in GitHub Actions MUST be preferred over
third-party dependencies. The simplest implementation that satisfies the spec is
the required implementation. Each component MUST have a single, clearly stated
responsibility. Complexity beyond what the current spec demands MUST NOT be
introduced.

**Rationale**: Unnecessary complexity increases maintenance burden, onboarding
friction, and the surface area for defects.

### V. Tested

Every API route MUST be covered by at least one automated unit or integration
test. The frontend MUST build cleanly (`npm run build` with zero errors) on
every CI run. Test failures MUST block merge to `main`.

**Rationale**: Automated tests are the enforcement mechanism for all other
principles; without them, compliance is unverifiable.

## Technology Stack

| Layer | Technology |
|---|---|
| API backend | Node.js Express (`src/ai-genius-api/`) |
| Frontend | React 18 + Vite (`src/ai-genius-web/`) |
| Infrastructure as Code | Azure Bicep (`bicep/`) |
| CI/CD | GitHub Actions (`.github/workflows/`) |
| Cloud platform | Microsoft Azure |
| Secret management | GitHub Secrets + Azure Key Vault |

All technology choices MUST be justified against the Simplicity principle.
Upgrades to major versions require a spec artifact before implementation.

## Development Workflow

1. **Spec-first**: No feature may be implemented without a corresponding spec
   artifact at `specs/<feature-id>/spec.md`, reviewed and committed to a
   feature branch.
2. **Branch naming**: Feature branches MUST follow the pattern
   `<NNN>-<short-description>` (e.g., `002-speckit-cicd`).
3. **Pull requests**: All PRs target `main` and MUST pass CI (build + tests)
   before merge. At least one peer review is REQUIRED.
4. **Deployment**: Merges to `main` trigger the relevant GitHub Actions
   workflows automatically. Manual Azure deployments are prohibited.
5. **Spec metadata**: Every `spec.md` MUST include YAML front-matter with
   `feature`, `risk` (low/medium/high), `breaking` (true/false), and
   `reviewer-team` fields.

## Governance

This constitution supersedes all other conventions, README guidance, and informal
agreements. It governs every specification, plan, implementation decision, and
review in this repository.

**Amendment procedure**: Any amendment MUST be proposed as a pull request
against `.specify/memory/constitution.md` (this file) and `specs/constitution.md`,
with a clear rationale and an updated version number following semantic
versioning. The PR requires at least one approving review before merge.

**Versioning policy**:
- MAJOR — removal or backward-incompatible redefinition of a principle.
- MINOR — new principle, section added, or materially expanded guidance.
- PATCH — clarifications, wording improvements, or typo corrections.

**Compliance review**: Adherence to this constitution MUST be verified at each
PR review and during `/speckit.plan` Constitution Check gates.

**Version**: 1.0.1 | **Ratified**: 2026-03-22 | **Last Amended**: 2026-04-13
