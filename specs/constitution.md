# Project Constitution — AI Genius Demo Application

This constitution establishes the governing principles for every specification,
plan, and implementation decision made in this repository.

---

## Project Overview

This project is the **AI Genius** web application, consisting of:

- **`src/ai-genius-api`** — .NET 10 minimal API backend
- **`src/ai-genius-web`** — React (Vite) frontend
- **`bicep/`** — Azure Bicep infrastructure-as-code

---

## Core Principles

### 1. Security-First

- Production endpoints use HTTPS only.
- Secrets are never committed to source code.
- Credentials are stored in GitHub Secrets, environment variables, or
  Azure-managed secret stores.
- API input is validated at the backend boundary.

### 2. Cloud-Native

- Azure infrastructure is defined as code using Bicep.
- Resource provisioning is repeatable and idempotent.
- Environment differences are captured in parameters, variables, or secrets.
- Manual portal changes are not part of the documented happy path.

### 3. CI/CD-Driven

- Every merge to `main` triggers the relevant GitHub Actions build and deploy
  workflow.
- Frontend, API, and infrastructure workflows validate before deployment.
- Manual dispatch follows the same build and deployment path as merge-triggered
  runs.

### 4. Simplicity

- Prefer standard libraries, built-in framework features, and existing project
  patterns.
- Avoid over-engineering and broad refactors.
- Add dependencies, abstractions, or services only when a current spec requires
  them.

### 5. Demo Session

- Keep specs, plans, tasks, workflows, and documentation concise.
- Prioritize the main use case and live-demo happy path.
- Follow common practices unless the current spec requires a different path.
- Use fast validation that supports quick iteration.

---

## Spec Metadata Convention

Every `spec.md` should include YAML front matter with at least these fields when
the feature participates in automated quality gates:

```yaml
---
feature: <feature-id> # e.g., 002-speckit-cicd
risk: low | medium | high
breaking: true | false
reviewer-team: spec-reviewer
---
```

The pipeline reads this front matter to enforce promotion rules when configured.
