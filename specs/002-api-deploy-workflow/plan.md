# Implementation Plan: AI Genius Backend API Deployment Workflow

**Branch**: `002-deploy-ai-genius` | **Date**: 2026-05-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-api-deploy-workflow/spec.md`

## Summary

Add a single GitHub Actions workflow at `.github/workflows/deploy-api.yml` that, on every push to `main` (and on manual `workflow_dispatch`), builds the .NET API in `src/ai-genius-api/` with a .NET 8+ SDK, publishes it in Release configuration, packages the publish output as a zip artifact, and deploys it to a Linux B1 Azure App Service via `azure/webapps-deploy@v3` using OIDC federated login (GitHub secrets `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`). The target App Service is resolved from the GitHub repository variable `APP_SERVICE_NAME` (which can be populated from a Bicep deployment output). The workflow is the only path to deploy the API and follows the canonical step sequence: `actions/checkout` → `actions/setup-dotnet` → `dotnet publish` → zip → `azure/webapps-deploy@v3`.

## Technical Context

**Language/Version**: C# / .NET 9 SDK in repo (`net9.0` in `ai-genius-api.csproj`); workflow pins to .NET 8+ via `actions/setup-dotnet` (`dotnet-version: 9.0.x`, satisfies the .NET 8+ clarification)
**Primary Dependencies**: GitHub Actions — `actions/checkout@v4`, `actions/setup-dotnet@v4`, `azure/login@v2` (OIDC), `azure/webapps-deploy@v3`. Backend already depends on `Swashbuckle.AspNetCore` only.
**Storage**: N/A (workflow has no persistent state; build artifact is ephemeral)
**Testing**: Workflow validated by (a) successful push-to-`main` end-to-end run, (b) manual `workflow_dispatch` run, (c) intentional build break to confirm deploy step is skipped. Optional `actionlint` syntax check.
**Target Platform**: GitHub-hosted `ubuntu-latest` runner; deploy target is Azure App Service on Linux B1.
**Project Type**: CI/CD workflow (single YAML file) for an existing web-service backend.
**Performance Goals**: Workflow start within 1 min of push (SC-001); push-to-deployed within 10 min (SC-002). Practical build+deploy time target ≤ 5 min on `ubuntu-latest`.
**Constraints**: Zero plain-text secrets in workflow or logs (FR-008, SC-005); deploy step MUST be gated by successful build (FR-006); zip deploy only (FR-007); canonical step order (FR-012); App Service name resolved at runtime from `vars.APP_SERVICE_NAME` (FR-009).
**Scale/Scope**: Single workflow file, one job, ~6 steps; one App Service target per environment; default deploy environment is `dev` (consistent with `deploy-infra.yml`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Security-First | Uses OIDC federated login (no long-lived secrets in repo); App Service name is a GitHub variable, not hard-coded; no secrets echoed to logs; HTTPS enforced by App Service. | ✅ PASS |
| II. Cloud-Native | App Service is provisioned by existing Bicep (`bicep/`, see `deploy-infra.yml`); this workflow only deploys application code to that pre-provisioned resource — no portal-based resource creation introduced. | ✅ PASS |
| III. CI/CD-Driven | Every push to `main` triggers the workflow; `workflow_dispatch` is the only other deployment path; manual Azure publishing is explicitly out of scope. | ✅ PASS |
| IV. Simplicity | Single job, single workflow file, only first-party `actions/*` and official `azure/*` actions; no custom scripts, matrix builds, caching tweaks, or environments promotion logic. | ✅ PASS |
| V. Tested | Backend testing is owned by the existing build (the API has no test project today and adding one is out of scope for this feature per spec assumptions). The workflow itself is verified via the three test scenarios in `quickstart.md`. Constitution V applies to API routes generally; this feature adds no new routes. | ✅ PASS (no new code paths require tests) |

**Initial Gate**: PASS — no violations, no entries needed in Complexity Tracking.

**Post-Design Re-check (after Phase 1)**: PASS — design preserves all decisions above; no new dependencies, scripts, or secrets were introduced during contract authoring.

## Project Structure

### Documentation (this feature)

```text
specs/002-api-deploy-workflow/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── deploy-api.workflow.md   # Workflow contract: triggers, inputs, steps, outputs
├── checklists/          # Pre-existing
├── spec.md              # Pre-existing (source of truth)
└── tasks.md             # Phase 2 output (created by /speckit.tasks — NOT by /speckit.plan)
```

### Source Code (repository root)

```text
.github/
└── workflows/
    ├── deploy-infra.yml        # Existing: Bicep infra deployment
    └── deploy-api.yml          # NEW: this feature — API build + zip deploy

src/
└── ai-genius-api/              # Existing .NET 9 Minimal API (target of build/publish)
    ├── ai-genius-api.csproj
    ├── Program.cs
    ├── appsettings.json
    └── ...

bicep/                          # Existing IaC (provides the App Service whose name feeds APP_SERVICE_NAME)
```

**Structure Decision**: Web-service backend with an adjacent CI/CD layer. No source-tree changes are required; the entire feature is delivered as one new file under `.github/workflows/`. The API project location (`src/ai-genius-api/`) and the existing Bicep infrastructure are unchanged consumers/producers of this workflow.

## Complexity Tracking

> Constitution Check passed with zero violations — table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
