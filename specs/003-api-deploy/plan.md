# Implementation Plan: Backend API Deployment via GitHub Actions

**Branch**: `003-api-deploy` | **Date**: 2026-05-20 | **Spec**: [spec.md](spec.md)

## Summary

Add `.github/workflows/003-deploy-api.yml` that builds the `src/ai-genius-api` .NET 10 project as a self-contained linux-x64 publish, zips the output, and deploys it to Azure App Service via `azure/webapps-deploy@v3`. Triggers on push to `main` and `workflow_dispatch`. Environment and concurrency match `001-deploy-infra.yml`.

## Technical Context

**Language/Version**: YAML (GitHub Actions); .NET 10 (`net10.0`)  
**Primary Dependencies**: `actions/checkout@v4`, `actions/setup-dotnet@v4` (10.0.x), `azure/login@v1`, `azure/webapps-deploy@v3`  
**Target Platform**: GitHub Actions `ubuntu-latest`; Azure App Service Linux B1  
**Project Type**: CI/CD pipeline (single workflow file)  
**Performance Goals**: Full deploy completes in under 10 minutes  
**Constraints**: Zip deploy only; self-contained linux-x64 publish; reuse existing secrets/variables (`AZURE_CREDENTIALS`, `APP_SERVICE_NAME`).

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| Security-First | ✅ PASS | Reuses `AZURE_CREDENTIALS`; no new secrets. |
| Cloud-Native | ✅ PASS | Deploys to Bicep-provisioned App Service. |
| CI/CD-Driven | ✅ PASS | `on: push: branches: [main]`. |
| Spec-Gated | ✅ PASS | `specs/003-api-deploy/spec.md` present. |
| Simplicity | ✅ PASS | Standard Microsoft/Azure actions only. |
| Tested | ✅ PASS | Build step fails on compile errors. |

**Gate**: All pass.

## Project Structure

```text
.github/workflows/
└── 003-deploy-api.yml        # NEW

specs/003-api-deploy/
├── spec.md
├── plan.md                    # this file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── workflow-interface.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

## Workflow Outline

```
on: push (main) | workflow_dispatch (environment: dev|qa|prod)
concurrency: ${{ github.workflow }}-${{ github.ref }}, cancel-in-progress: true
env: ENVIRONMENT, APP_SERVICE_NAME

job: deploy-api  (environment: <selected>)
  1. actions/checkout@v4
  2. actions/setup-dotnet@v4 (10.0.x)
  3. dotnet publish src/ai-genius-api/ai-genius-api.csproj -c Release -r linux-x64 --self-contained true -o ./publish
  4. zip publish output → publish.zip
  5. azure/login@v1 (creds: AZURE_CREDENTIALS)
  6. azure/webapps-deploy@v3 (app-name: vars.APP_SERVICE_NAME, package: ./publish.zip)
```

## Complexity Tracking

> No constitution violations.
