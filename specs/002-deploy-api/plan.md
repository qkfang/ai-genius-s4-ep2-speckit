# Implementation Plan: Deploy AI Genius Backend API via GitHub Actions

**Branch**: `002-deploy-api` | **Date**: 2026-05-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-deploy-api/spec.md`

## Summary

Add a GitHub Actions workflow at `.github/workflows/003-deploy-api.yml` that, on every push to `main` (or manual dispatch with environment choice `dev`/`qa`/`prod`), builds the .NET 10 API in `src/ai-genius-api` as a self-contained linux-x64 publish, zips it, and deploys via `azure/webapps-deploy@v3` (zip deploy) to the Azure App Service named in the environment-scoped `APP_SERVICE_NAME` variable, using `AZURE_CREDENTIALS`. Concurrency mirrors `001-deploy-infra.yml`.

## Technical Context

**Language/Version**: .NET 10 (csproj `net10.0`)
**Primary Dependencies**: `actions/checkout@v4`, `actions/setup-dotnet@v4`, `azure/login@v1`, `azure/webapps-deploy@v3`
**Storage**: N/A (deployment workflow only)
**Testing**: Workflow validation via real run on `main`; project builds cleanly with `dotnet publish`
**Target Platform**: Azure App Service, Linux B1 plan, linux-x64 self-contained
**Project Type**: CI/CD workflow (single YAML)
**Performance Goals**: End-to-end deploy < 10 min (SC-002)
**Constraints**: zip-deploy compatible; fail-fast on any step
**Scale/Scope**: 1 workflow file, 3 environments (`dev`/`qa`/`prod`)

## Constitution Check

- **I. Security-First**: PASS — Secrets via `AZURE_CREDENTIALS`; no creds in code; env-scoped `APP_SERVICE_NAME`.
- **II. Cloud-Native**: PASS — App Service provisioned by Bicep (`001-deploy-infra.yml`); this workflow only deploys app bits.
- **III. CI/CD-Driven**: PASS — Workflow triggers on every push to `main`; no manual portal deploys.
- **IV. Simplicity**: PASS — Standard actions only; minimal steps; mirrors existing `001-deploy-infra.yml` pattern.
- **V. Tested**: PASS — Workflow itself is exercised on every merge to `main`; project build serves as smoke test. Unit tests for API routes are an existing concern outside this feature.

No violations. Complexity Tracking: N/A.

## Project Structure

### Documentation (this feature)

```text
specs/002-deploy-api/
├── plan.md              # This file
├── spec.md              # Feature spec
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── workflow.md      # Workflow contract (inputs/triggers/env)
└── checklists/
```

### Source Code (repository root)

```text
.github/workflows/
└── 003-deploy-api.yml    # New deploy workflow (this feature)

src/ai-genius-api/
└── ai-genius-api.csproj  # .NET 10 API project (built, not modified)
```

**Structure Decision**: Single CI/CD asset. No application code changes. New file is `.github/workflows/003-deploy-api.yml`; build target is `src/ai-genius-api/ai-genius-api.csproj`.

## Complexity Tracking

N/A — no constitutional violations.
