<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 -> 2.0.0
Reason: replaced the standalone Tested principle with Demo Session and aligned
the constitution to the user-supplied core principles for AI Genius.

Modified principles:
  I. Security-First -> I. Security-First
  II. Cloud-Native -> II. Cloud-Native
  III. CI/CD-Driven -> III. CI/CD-Driven
  IV. Simplicity -> IV. Simplicity
  V. Tested -> V. Demo Session

Added sections: none

Removed sections:
  - Standalone Tested principle; build and validation expectations now live under
    CI/CD-Driven and Development Workflow.

Templates reviewed:
  ✅ .specify/templates/plan-template.md — updated Constitution Check gates.
  ✅ .specify/templates/spec-template.md — reviewed; no changes required.
  ✅ .specify/templates/tasks-template.md — reviewed; no changes required.
  ✅ .specify/templates/commands/*.md — not present in this repository.
  ✅ .github/prompts/*.prompt.md — reviewed; no outdated agent-specific names found.
  ✅ specs/constitution.md — updated to mirror this constitution.
   ✅ specs/001-bicep-deploy/plan.md — updated old principle references.
  ✅ AGENTS.md — updated API runtime references from .NET 9 to .NET 10.
  ✅ docs/guide.md — updated API overview from .NET 9 to .NET 10.

Deferred TODOs: none
-->

# AI Genius Constitution

## Core Principles

### I. Security-First

Production traffic MUST use HTTPS only. Plain HTTP MAY be used for local
development examples, but it MUST NOT be exposed as a production endpoint.
Credentials, tokens, connection strings, API keys, deployment tokens, and other
secrets MUST NOT be committed to source code. Sensitive values MUST be provided
through GitHub Secrets, environment variables, or Azure-managed secret stores.

API input that crosses the backend boundary MUST be validated before use. Any
feature that changes authentication, authorization, deployment credentials, or
public network exposure MUST call out the security impact in its spec or plan.

**Rationale**: AI Genius is deployed through public cloud endpoints. Keeping
secrets out of code and requiring encrypted production transport prevents the
highest-impact mistakes in the main demo and production paths.

### II. Cloud-Native

Azure infrastructure MUST be defined as Infrastructure as Code using Azure Bicep
under `bicep/`. App Service, Static Web Apps, resource groups, deployment
parameters, and environment-specific changes MUST be represented in Bicep or in
the GitHub Actions configuration that invokes Bicep.

Resource provisioning MUST be repeatable and idempotent. Manual portal changes
MUST NOT be required for the documented happy path. Environment differences
MUST be captured in parameter files, repository variables, GitHub environment
variables, or secrets.

**Rationale**: Bicep keeps Azure resources reviewable, reproducible, and easy to
explain during a demo session.

### III. CI/CD-Driven

Every merge to `main` MUST trigger the relevant GitHub Actions build and
deployment workflow. The frontend MUST build before deployment, the API MUST
publish before deployment, and infrastructure changes MUST deploy through the
Bicep workflow.

Deployment credentials MUST come from approved GitHub Secrets or federated Azure
authentication. Manual workflow dispatch MAY be supported for demonstrations and
retries, but it MUST follow the same build and deployment steps as the merge
path.

**Rationale**: The repository demonstrates spec-driven delivery. Automated
pipelines make the delivery path repeatable and reduce manual release drift.

### IV. Simplicity

Implementations MUST prefer the standard libraries, built-in framework features,
and established repository patterns already present in AI Genius. New
dependencies, services, abstractions, or workflow stages MUST be justified by a
current spec requirement.

Features MUST be scoped to the smallest implementation that satisfies the main
use case. Refactors, framework changes, and generalized infrastructure MUST NOT
be added unless they directly support the requested feature.

**Rationale**: The project is a focused demo application. Simplicity keeps the
codebase understandable, quick to iterate, and easy to present live.

### V. Demo Session

Specs, plans, tasks, workflows, and documentation MUST optimize for a concise,
repeatable demo flow. The happy path MUST be clear enough to run in a live
session without extra research. Standard practices MUST be used unless the user
or current spec explicitly requires a different path.

Work MUST prioritize the main use case over rare edge cases. Validation MUST be
fast enough to support iteration during the session, using build, lint,
deployment, or smoke-test checks that match the changed surface area.

**Rationale**: AI Genius exists to teach and demonstrate Spec-Kit, GitHub
Actions, Azure Bicep, React, and a .NET API. A short, conventional workflow makes
the lesson easier to follow and reproduce.

## Technology Stack

| Layer                  | Technology                                     |
| ---------------------- | ---------------------------------------------- |
| API backend            | .NET 10 Minimal API (`src/ai-genius-api/`)     |
| Frontend               | React 18 + Vite (`src/ai-genius-web/`)         |
| Infrastructure as Code | Azure Bicep (`bicep/`)                         |
| CI/CD                  | GitHub Actions (`.github/workflows/`)          |
| Cloud platform         | Microsoft Azure                                |
| Secret management      | GitHub Secrets and Azure-managed secret stores |

Technology choices MUST support the Core Principles. Major technology changes
MUST be represented in a spec artifact before implementation.

## Development Workflow

1. **Spec-first**: Feature work MUST have a corresponding spec artifact under
   `specs/<feature-id>/` unless the change is documentation-only or a small
   mechanical fix.
2. **Plan with gates**: Plans MUST evaluate Security-First, Cloud-Native,
   CI/CD-Driven, Simplicity, and Demo Session before implementation begins.
3. **Build before deploy**: Frontend, API, and infrastructure workflows MUST run
   their relevant build or validation step before deployment.
4. **Secret handling**: Secrets MUST be configured outside source code and
   referenced through GitHub Actions or Azure runtime configuration.
5. **Demo-ready documentation**: Quickstarts and guides MUST describe the
   shortest repeatable happy path for local development and Azure deployment.

## Governance

This constitution supersedes conflicting repository guidance, informal
agreements, and prior Spec-Kit conventions for this project.

**Amendment procedure**: Any amendment MUST update
`.specify/memory/constitution.md` and `specs/constitution.md` together, include a
Sync Impact Report, and review dependent templates or runtime guidance for
drift.

**Versioning policy**:

- MAJOR: removal or backward-incompatible redefinition of a principle.
- MINOR: new principle, new section, or materially expanded guidance.
- PATCH: clarification, wording improvement, typo fix, or non-semantic update.

**Compliance review**: `/speckit.plan` Constitution Check gates and pull request
reviews MUST verify adherence to the active Core Principles. Any violation MUST
be documented with a simpler alternative and the reason it was rejected.

**Version**: 2.0.0 | **Ratified**: 2026-03-22 | **Last Amended**: 2026-05-20
