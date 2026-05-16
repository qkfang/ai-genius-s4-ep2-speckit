# Implementation Plan: AI Genius API Deployment via GitHub Actions

**Branch**: `003-api-deploy` | **Date**: 2026-05-16 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/003-api-deploy/spec.md`

## Summary

Add a GitHub Actions workflow (`.github/workflows/003-deploy-api.yml`) that, on every push to `main` (and on manual dispatch), builds `src/ai-genius-api` as a `linux-x64` self-contained .NET 10 publish, packages it into `publish.zip`, authenticates to Azure via `azure/login@v1`, and Zip-deploys it to the Azure App Service named by the per-environment GitHub variable `APP_SERVICE_NAME` using `azure/webapps-deploy@v3`. Concurrency and environment-input handling mirror `001-deploy-infra.yml`.

## Technical Context

**Language/Version**: YAML (GitHub Actions); .NET 10 (`10.0.x`) for the API build  
**Primary Dependencies**: `actions/checkout@v4`, `actions/setup-dotnet@v4`, `azure/login@v1`, `azure/webapps-deploy@v3`  
**Storage**: N/A (deploy artifact is an ephemeral `publish.zip`)  
**Testing**: Manual smoke test (`curl` the App Service URL post-deploy); no new automated tests introduced  
**Target Platform**: GitHub Actions `ubuntu-latest`; Azure App Service Linux B1  
**Project Type**: CI/CD pipeline (single workflow file)  
**Performance Goals**: Workflow completes within 10 minutes (SC-001)  
**Constraints**: Self-contained `linux-x64` publish; Zip Deploy only; reuse `AZURE_CREDENTIALS` secret already used by `001-deploy-infra.yml`  
**Scale/Scope**: 3 environments (`dev`, `qa`, `prod`); 1 workflow file; 1 job

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **Security-First** — no secrets in code; HTTPS-only | ✅ PASS | `AZURE_CREDENTIALS` stored in GitHub Secrets; App Service uses HTTPS by default |
| **Cloud-Native** — Bicep IaC; tagged resources | ✅ PASS | API host (App Service) provisioned by `001-bicep-deploy`; this feature only deploys app code |
| **CI/CD-Driven** — every merge triggers deploy | ✅ PASS | `on: push: branches: [main]` is the primary trigger |
| **Spec-Gated** — spec artifact present | ✅ PASS | `specs/003-api-deploy/spec.md` exists |
| **Simplicity** — standard Actions only | ✅ PASS | Only official `actions/*` and `azure/*` actions are used |
| **Tested** — builds pass before deploy | ✅ PASS | `dotnet publish` is the build gate; failure halts the workflow before deploy |

**Gate result**: All principles pass. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/003-api-deploy/
├── plan.md              # This file
├── spec.md              # /speckit.specify + /speckit.clarify output
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (workflow inputs/outputs)
├── quickstart.md        # Phase 1 output (operator quickstart)
├── contracts/
│   └── workflow-interface.md
├── checklists/          # /speckit.checklist output
└── tasks.md             # /speckit.tasks output
```

### Source Code (repository root)

```text
.github/
└── workflows/
    ├── 001-deploy-infra.yml          # Existing — Bicep deploy (reference pattern for env/concurrency)
    └── 003-deploy-api.yml            # NEW — this feature

src/
└── ai-genius-api/                    # Existing — .NET 10 minimal API (build source)
    └── ai-genius-api.csproj
```

**Structure Decision**: Single new workflow file under `.github/workflows/`. No source-code changes to the API project are required.

## Complexity Tracking

> No constitution violations — section not applicable.
