# Implementation Plan: Frontend Static Web App Deployment

**Branch**: `003-frontend-swa-deploy` | **Date**: 2026-05-16 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/003-frontend-swa-deploy/spec.md`

## Summary

Create `.github/workflows/002-deploy-web.yml` — a GitHub Actions workflow that builds the React 18 + Vite frontend (`src/ai-genius-web`) and deploys the compiled `dist/` output to Azure Static Web Apps on every push to `main` or manual trigger. Matches the concurrency and environment pattern from `001-deploy-infra.yml`. The workflow injects `VITE_API_URL` at build time by patching a generated `.env` file from `.env.example`.

## Technical Context

**Language/Version**: YAML (GitHub Actions), JavaScript/JSX (React 18 + Vite)  
**Primary Dependencies**: `actions/checkout@v4`, `actions/setup-node@v4`, `azure/login@v1`, `Azure/static-web-apps-deploy@v1`  
**Storage**: N/A  
**Testing**: Build success (`npm run build` producing `dist/`) gates deployment; no separate test suite  
**Target Platform**: GitHub Actions (`ubuntu-latest`), Azure Static Web Apps  
**Project Type**: CI/CD workflow (GitHub Actions YAML)  
**Performance Goals**: Full workflow completes within 10 minutes of push (SC-001)  
**Constraints**: Concurrency/environment pattern must match `001-deploy-infra.yml`; SWA action must not re-run the build (`skip_app_build: true`); `.env` must never be committed  
**Scale/Scope**: Single new workflow file, single job, 7 steps

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| Security-First | ✅ PASS | All credentials in GitHub Secrets; `VITE_API_URL` from `vars` (not secrets); `.env` never committed |
| Cloud-Native | ✅ PASS | Deploying to Azure Static Web Apps via official action |
| CI/CD-Driven | ✅ PASS | Auto-trigger on `main` push + `workflow_dispatch` with environment selection |
| Spec-Gated | ⚠️ NOTE | `spec.md` lacks required YAML front-matter (risk, breaking, reviewer-team). Must be added before merge |
| Simplicity | ✅ PASS | Single job, minimal steps, no custom actions or third-party tooling |
| Tested | ✅ PASS | `npm run build` step is the build gate; any compile error fails the workflow before deploy |

**Gate result**: Proceed to Phase 0. Spec front-matter warning must be resolved before PR merge to `main`.

## Project Structure

### Documentation (this feature)

```text
specs/003-frontend-swa-deploy/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── workflow-interface.md
└── tasks.md             # Phase 2 output (/speckit.tasks command — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
.github/
└── workflows/
    └── 002-deploy-web.yml       # NEW: Frontend deployment workflow

src/
└── ai-genius-web/
    ├── .env.example             # EXISTS: VITE_API_URL= (template for CI injection)
    ├── package.json             # EXISTS: build script → dist/
    └── vite.config.js           # EXISTS: outDir = dist
```

**Structure Decision**: Single new file at `.github/workflows/002-deploy-web.yml`. No source code changes required. The `.env.example` already exists with `VITE_API_URL=` and will be patched at CI runtime.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
