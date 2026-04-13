# Implementation Plan: Frontend React App Deployment via GitHub Actions

**Branch**: `003-frontend-swa-deploy` | **Date**: 2026-04-13 | **Spec**: [/specs/002-frontend-swa-deploy/spec.md](../002-frontend-swa-deploy/spec.md)  
**Input**: Feature specification from `/specs/002-frontend-swa-deploy/spec.md`

## Summary

Create a single GitHub Actions workflow file (`.github/workflows/deploy-web.yml`) that triggers on every push to `main`, installs Node.js 20, performs a clean npm install of the React 18 + Vite frontend in `src/ai-genius-web`, builds to `dist/`, and deploys to Azure Static Web Apps using `Azure/static-web-apps-deploy@v1`. Authentication uses OIDC (Workload Identity Federation) via `azure/login@v2` — the SWA deployment token is fetched at runtime from Azure CLI, so no long-lived credentials are stored in the repository. A concurrency group ensures newer pushes cancel in-progress runs.

## Technical Context

**Language/Version**: YAML (GitHub Actions workflow); Node.js 20; React 18 + Vite 5  
**Primary Dependencies**: `actions/checkout@v4`, `actions/setup-node@v4`, `azure/login@v2`, `Azure/static-web-apps-deploy@v1`  
**Storage**: N/A (stateless CI/CD pipeline; build artifact written to `src/ai-genius-web/dist/`)  
**Testing**: Build success via `npm run build` — failure blocks the deployment step  
**Target Platform**: GitHub-hosted runner (`ubuntu-latest`) → Azure Static Web Apps  
**Project Type**: CI/CD workflow (single GitHub Actions YAML file)  
**Performance Goals**: Full workflow (install + build + deploy) completes in under 10 minutes  
**Constraints**: Zero long-lived Azure credentials in repository; OIDC only; `cancel-in-progress: true`; no npm caching  
**Scale/Scope**: One workflow file; one branch (`main`); one SWA resource

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **Security-First** | ✅ PASS | OIDC only; no service-principal secrets stored; deployment token fetched at runtime |
| **Cloud-Native** | ✅ PASS | GitHub Actions triggers on push; Azure Static Web Apps is the hosting target |
| **CI/CD-Driven** | ✅ PASS | This feature *is* the CI/CD pipeline |
| **Spec-Gated** | ✅ PASS | `specs/002-frontend-swa-deploy/spec.md` exists |
| **Simplicity** | ✅ PASS | Standard GitHub Actions, minimal steps, one job |
| **Tested** | ✅ PASS | `npm run build` acts as gate; deployment step blocked if build fails |

No violations. Phase 0 may proceed.

## Project Structure

### Documentation (this feature)

```text
specs/003-frontend-swa-deploy/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── workflow-interface.md   # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks — not created here)
```

### Source Code (repository root)

```text
.github/
└── workflows/
    └── deploy-web.yml       # NEW — the workflow created by this feature

src/
└── ai-genius-web/           # EXISTING — React 18 + Vite frontend
    ├── package.json
    ├── package-lock.json
    ├── vite.config.js
    └── dist/                # Generated at build time; not committed
```

**Structure Decision**: Single workflow file added to the standard `.github/workflows/` directory. No source code changes required — the existing `src/ai-genius-web` app is the artifact being deployed.

## Complexity Tracking

> No constitution violations to justify.
