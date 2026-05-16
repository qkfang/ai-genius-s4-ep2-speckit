# Implementation Plan: Frontend Web App Deployment via GitHub Actions

**Branch**: `002-deploy-web` | **Date**: 2026-05-16 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/002-deploy-web/spec.md`

## Summary

Add a GitHub Actions workflow (`.github/workflows/002-deploy-web.yml`) that installs Node.js 20 dependencies, builds the React 18 + Vite 5 application in `src/ai-genius-web`, and deploys the compiled `dist/` output to Azure Static Web Apps on every push to `main` and on manual dispatch. The workflow uses `Azure/static-web-apps-deploy@v1` with a pre-built dist folder (`skip_app_build: true`), authenticates via `azure/login@v1`, injects the per-environment `VITE_API_URL` at build time through GitHub Environments, and applies a concurrency group that cancels in-progress runs when a newer commit arrives.

## Technical Context

**Language/Version**: YAML (GitHub Actions workflow syntax); Node.js 20; React 18.2.0; Vite 5.0.0  
**Primary Dependencies**: `actions/checkout@v4`, `actions/setup-node@v4`, `azure/login@v1`, `Azure/static-web-apps-deploy@v1`  
**Storage**: N/A  
**Testing**: Build success validation (`npm run build` exit code); manual post-deploy URL check  
**Target Platform**: GitHub Actions `ubuntu-latest` runners; Azure Static Web Apps (Free tier for dev, Standard tier for prod)  
**Project Type**: CI/CD pipeline (GitHub Actions workflow — build + deploy)  
**Performance Goals**: Full pipeline (install → build → deploy) completes within 5 minutes (SC-001)  
**Constraints**: `npm ci` for reproducible locked install; `VITE_API_URL` injected as env var at Vite build time; per-environment `vars.VITE_API_URL` accessed via GitHub Environment context  
**Scale/Scope**: 3 environments (dev, qa, prod); 1 workflow file; 1 job; ~5 steps

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **Security-First** — no secrets committed; HTTPS only | ✅ PASS | `AZURE_CREDENTIALS` and `AZURE_STATIC_WEB_APPS_API_TOKEN` stored as GitHub Secrets; no credentials in source |
| **Cloud-Native** — IaC, tagged resources, idempotent deployments | ✅ PASS | Azure Static Web App resource provisioned by `001-deploy-infra`; this workflow is purely deploy |
| **CI/CD-Driven** — every merge to `main` triggers automated deployment | ✅ PASS | `on: push: branches: [main]` is the primary trigger |
| **Spec-Gated** — spec artifact present before planning | ✅ PASS | `specs/002-deploy-web/spec.md` exists |
| **Simplicity** — standard Actions; single responsibility | ✅ PASS | Only official Microsoft/GitHub Actions used; workflow does one thing: build + deploy frontend |
| **Tested** — frontend builds cleanly | ✅ PASS | `npm run build` must exit 0 before `Azure/static-web-apps-deploy@v1` runs |

**Gate result**: All principles pass. No violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/002-deploy-web/
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
    └── 002-deploy-web.yml        # NEW — build + deploy React frontend

src/
└── ai-genius-web/                # Existing React + Vite application
    ├── package.json              # Existing — "build": "vite build" → outputs dist/
    ├── vite.config.js            # Existing — outDir: 'dist', VITE_API_URL proxy
    └── dist/                     # Generated at build time (gitignored)
```

**Structure Decision**: Single workflow file; no new source directories. This feature is purely operational (YAML).

## Complexity Tracking

> No constitution violations — section not applicable.