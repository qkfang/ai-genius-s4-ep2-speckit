# Implementation Plan: Backend API CI/CD Pipeline

**Branch**: `003-api-deploy` | **Date**: 2026-05-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-api-deploy/spec.md`

## Summary

Add a single GitHub Actions workflow at `.github/workflows/003-deploy-api.yml` that builds the .NET 10 minimal API project at `src/ai-genius-api/ai-genius-api.csproj`, publishes it in `Release`, packages the publish output into a `.zip`, authenticates to Azure with the existing `AZURE_CREDENTIALS` secret via `azure/login@v1`, and deploys the zip to the target Linux B1 Azure App Service using `azure/webapps-deploy@v3` (Zip Deploy). The workflow triggers on every push to `main` and on `workflow_dispatch` with an `environment` input (`dev`/`qa`/`prod`, default `dev`). The App Service name is read from `vars.APP_SERVICE_NAME` scoped to the selected GitHub environment. A concurrency group `${{ github.workflow }}-${{ github.ref }}` with `cancel-in-progress: true` supersedes in-flight runs.

## Technical Context

**Language/Version**: YAML (GitHub Actions workflow syntax); C# / .NET 10 (API project — built, not authored here)
**Primary Dependencies**: `actions/checkout@v4`, `actions/setup-dotnet@v4` (pinned to `10.0.x`), `azure/login@v1`, `azure/webapps-deploy@v3`, `dotnet publish`, `zip` (preinstalled on `ubuntu-latest`)
**Storage**: N/A (deployment artifact is the `.zip` produced from `dotnet publish` output)
**Testing**: Manual validation — push to `main` then `curl` the App Service URL; verify run history in GitHub Actions UI for concurrency cancellation
**Target Platform**: GitHub Actions `ubuntu-latest` runners; Azure App Service on Linux App Service Plan, SKU `B1`
**Project Type**: CI/CD pipeline (single GitHub Actions workflow file)
**Performance Goals**: Workflow completes within 10 minutes (SC-001); manual dispatch starts within 2 minutes of click (SC-003)
**Constraints**: No new long-lived Azure credentials — reuse `AZURE_CREDENTIALS` (SC-006); App Service name MUST come from `vars.APP_SERVICE_NAME`, not composed at runtime (FR-008); single workflow file at exact path `.github/workflows/003-deploy-api.yml` (FR-003)
**Scale/Scope**: 3 environments (dev, qa, prod); 1 workflow file; 1 deploy job; 1 .NET project

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **Security-First** — no secrets committed; HTTPS only | ✅ PASS | Reuses existing `AZURE_CREDENTIALS` secret; App Service serves HTTPS by default. No new secrets. |
| **Cloud-Native** — IaC, tagged resources, idempotent deployments | ✅ PASS | Workflow consumes App Service provisioned by `001-deploy-infra.yml` (Bicep). Zip Deploy is idempotent (replaces wwwroot atomically). |
| **CI/CD-Driven** — every merge triggers automated deployment | ✅ PASS | `on: push: branches: [main]` is the primary trigger; `workflow_dispatch` is the manual safety valve. |
| **Spec-Gated** — spec artifact present before planning | ✅ PASS | `specs/003-api-deploy/spec.md` exists with clarifications resolved across two sessions. |
| **Simplicity** — prefer standard Actions over third-party | ✅ PASS | Only official actions: `actions/checkout`, `actions/setup-dotnet`, `azure/login`, `azure/webapps-deploy`. Zip via built-in `zip` CLI. |
| **Tested** — builds pass; test failures block merge | ✅ PASS | `dotnet publish` fails fast on compile errors; failed build prevents `azure/webapps-deploy@v3` from running. API unit tests (when added) live in the project and are exercised by `dotnet build`/`publish`. |

**Gate result**: All principles pass. No violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/003-api-deploy/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── workflow-interface.md
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
.github/
└── workflows/
    ├── 001-deploy-infra.yml      # Existing — provisions App Service per environment
    └── 003-deploy-api.yml        # NEW (this feature) — builds + Zip Deploys the .NET 10 API

src/
└── ai-genius-api/
    └── ai-genius-api.csproj      # Existing — TargetFramework: net10.0
```

**Structure Decision**: A single workflow file with a single `build-and-deploy` job. No new source directories. The workflow scopes itself to the GitHub `environment` matching the selected input value to inherit per-environment variables (`vars.APP_SERVICE_NAME`) and protection rules.

## Complexity Tracking

> No constitution violations — section not applicable.
