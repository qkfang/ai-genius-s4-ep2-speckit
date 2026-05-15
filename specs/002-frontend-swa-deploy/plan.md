# Implementation Plan: Frontend Static Web App CI/CD Deployment

**Branch**: `002-frontend-swa-deploy` | **Date**: 2026-05-16 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-frontend-swa-deploy/spec.md`

## Summary

Add a GitHub Actions workflow (`.github/workflows/deploy-web.yml`) that checks out the React/Vite frontend (`src/ai-genius-web`), installs Node.js 20 dependencies, builds the production artifact (`dist/`), and deploys it to Azure Static Web Apps using `Azure/static-web-apps-deploy@v1`. Authentication is OIDC-only via `azure/login@v2` — no long-lived deployment token is stored as a repository secret; the action retrieves the SWA deployment token at runtime using the federated identity's least-privilege RBAC on the specific SWA resource.

## Technical Context

**Language/Version**: YAML (GitHub Actions workflow syntax); Node.js 20; React 18 + Vite 5  
**Primary Dependencies**: `actions/checkout@v4`, `actions/setup-node@v4`, `azure/login@v2` (OIDC), `Azure/static-web-apps-deploy@v1`  
**Storage**: N/A  
**Testing**: Manual verification — push to main, observe green Actions check, confirm SWA URL reflects latest build  
**Target Platform**: GitHub Actions `ubuntu-latest` runner; Azure Static Web Apps (Standard tier)  
**Project Type**: CI/CD pipeline (single GitHub Actions workflow file)  
**Performance Goals**: Full pipeline completes within 5 minutes on push to main (SC-001)  
**Constraints**: OIDC-only authentication (no `azure_static_web_apps_api_token` stored as a GitHub secret); `VITE_API_URL` injected from repository variables before build; cancel-in-progress concurrency on main  
**Scale/Scope**: 1 workflow file; 1 job; single production SWA

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **Security-First** — no long-lived secrets; HTTPS-only | PASS | OIDC only; `AZURE_CLIENT_ID`/`AZURE_TENANT_ID`/`AZURE_SUBSCRIPTION_ID` are non-secret identity refs. SWA deployment token fetched at runtime, never stored. |
| **Cloud-Native** — IaC, tagged resources, idempotent deployments | PASS | SWA resource is pre-provisioned via Bicep (001 workflow); this workflow is deploy-only and idempotent. |
| **CI/CD-Driven** — every merge to main triggers automated deployment | PASS | `on: push: branches: [main]`; `concurrency.cancel-in-progress: true`. |
| **Spec-Gated** — spec artifact present before planning | PASS | `specs/002-frontend-swa-deploy/spec.md` exists. |
| **Simplicity** — prefer standard Actions over third-party | PASS | Only official Microsoft/GitHub actions used; no third-party dependencies. |
| **Tested** — builds pass; no test failures block merge | PASS | `npm run build` fails the pipeline before deployment on any compile error (FR-007). |

**Gate result**: All principles pass. No violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

specs/002-frontend-swa-deploy/
  plan.md              - This file (/speckit.plan command output)
  research.md          - Phase 0 output (/speckit.plan command)
  data-model.md        - Phase 1 output (/speckit.plan command)
  quickstart.md        - Phase 1 output (/speckit.plan command)
  contracts/           - Phase 1 output (/speckit.plan command)
    workflow-interface.md
  tasks.md             - Phase 2 output (/speckit.tasks NOT created by /speckit.plan)

### Source Code (repository root)

.github/
  workflows/
    deploy-web.yml          - NEW: build + deploy React/Vite app to Azure SWA

src/
  ai-genius-web/              - Existing: React 18 + Vite 5 frontend
    package.json              - npm scripts: build to vite build to dist/
    vite.config.js            - outDir: dist; VITE_API_URL used as env var

**Structure Decision**: Single new workflow file only. No new source directories created. Frontend source already exists in `src/ai-genius-web`; this feature adds only the CI/CD automation layer.

## Complexity Tracking

No constitution violations. Section not required.
