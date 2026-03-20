# Project Constitution — AI Genius Demo Application

This constitution establishes the governing principles for every specification, plan, and
implementation decision made in this repository.

---

## Project Overview

This project is the **AI Genius demo application**, consisting of:

- **`src/ai-genius-api`** — .NET minimal API backend
- **`src/ai-genius-web`** — React (Vite) frontend
- **`bicep/`** — Azure Bicep infrastructure-as-code

---

## Core Principles

### 1. Security-First

- All inputs validated at the API boundary.
- HTTPS only; no plain-HTTP endpoints in production.
- No secrets committed to source code; all credentials are stored in GitHub Secrets or
  Azure Key Vault.

### 2. Cloud-Native

- Infrastructure is defined as code using Azure Bicep.
- Resources are tagged with `app`, `component`, `environment`, and `managedBy`.
- All Azure resources are provisioned idempotently via `az deployment group create`.

### 3. CI/CD-Driven

- Every merge to `main` triggers automated build and deployment via GitHub Actions.
- All builds must pass before a PR can be merged.
- Deployment to Azure is fully automated; no manual steps in the happy path.

### 4. Spec-Gated

- No feature may merge to `main` without a corresponding spec artifact under
  `specs/<feature-id>/spec.md`.
- Spec presence, risk level, and breaking-change status are enforced by the CI pipeline,
  not by convention.

### 5. Simplicity

- Prefer standard libraries and built-in GitHub Actions over third-party dependencies.
- Avoid over-engineering; the simplest solution that satisfies the spec is preferred.
- Each component has a single responsibility.

### 6. Tested

- API routes must have unit or integration tests.
- The frontend must build cleanly (`npm run build` produces no errors).
- Test failures block merge.

---

## Spec Metadata Convention

Every `spec.md` must include YAML front-matter with at least these fields:

```yaml
---
feature: <feature-id>        # e.g. 002-speckit-cicd
risk: low | medium | high
breaking: true | false
reviewer-team: spec-reviewer
---
```

The pipeline reads this front-matter to enforce promotion rules.
