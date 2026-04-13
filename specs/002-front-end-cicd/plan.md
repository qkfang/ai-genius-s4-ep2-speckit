# Implementation Plan: Frontend CI/CD Deployment

**Branch**: `002-front-end-cicd` | **Date**: 2026-04-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-front-end-cicd/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Automated GitHub Actions workflow that builds and deploys the React 18 + Vite frontend application (`src/ai-genius-web`) to Azure Static Web Apps on every push to main. Uses OIDC (Workload Identity Federation) for secure authentication without storing long-lived credentials. The workflow installs dependencies with npm ci, builds with npm run build, and deploys the dist/ output using the Azure/static-web-apps-deploy@v1 action.

## Technical Context

**Language/Version**: Node.js 20 / React 18  
**Primary Dependencies**: React 18, Vite (build tool), Azure/static-web-apps-deploy@v1 GitHub Action  
**Storage**: N/A (static web app, no backend storage)  
**Testing**: npm run build (build verification), Vite build system  
**Target Platform**: Azure Static Web Apps (cloud hosting for static sites)
**Project Type**: Web application (frontend single-page application)  
**Performance Goals**: Deployment completes within 5 minutes, site accessible within 2 minutes of deployment  
**Constraints**: Zero stored credentials, OIDC authentication only, deployment only on main branch pushes  
**Scale/Scope**: Single React application, GitHub Actions workflow managing 5 steps (checkout, Node setup, install, build, deploy)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Initial Check (Pre-Phase 0)

| Principle | Evaluation | Status |
|-----------|------------|--------|
| **Security-First** | OIDC authentication eliminates stored credentials. GitHub Secrets (AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_SUBSCRIPTION_ID) contain non-sensitive identifiers only, not secrets. HTTPS enforced by Azure Static Web Apps platform. | ✅ PASS |
| **Cloud-Native** | Azure infrastructure (Static Web App resource) assumed to exist per spec Out of Scope. Workflow file is code-based configuration, version-controlled. | ✅ PASS (infra prereq documented) |
| **CI/CD-Driven** | Workflow triggers automatically on every push to main. Deployment fully automated with no manual portal steps. | ✅ PASS |
| **Simplicity** | Uses built-in GitHub Actions (actions/checkout, actions/setup-node) and official Azure action (Azure/static-web-apps-deploy@v1). No third-party dependencies. Single workflow file with 5 steps. | ✅ PASS |
| **Tested** | `npm run build` serves as build validation; workflow fails if build produces errors. Frontend build cleanliness enforced on every CI run. | ✅ PASS |

**Overall**: ✅ **APPROVED** - All principles satisfied. Prerequisites (existing Static Web App, OIDC federation configuration) documented in spec Assumptions section.

### Post-Phase 1 Re-Check

**Design Review**: Phase 1 artifacts (data-model.md, contracts/workflow-interface.md, quickstart.md) reviewed against constitution.

**Findings**:
- ✅ No new complexity introduced beyond initial design
- ✅ Security model (OIDC) maintained throughout detailed design
- ✅ Workflow interface contract enforces fail-fast behavior (no hidden retry logic)
- ✅ Quickstart keeps setup simple with standard GitHub/Azure tools

**Verdict**: ✅ **CONSTITUTION CHECK PASSED** - Design maintains compliance with all principles. Ready for Phase 2 (task generation).

## Project Structure

### Documentation (this feature)

```text
specs/002-front-end-cicd/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── workflow-interface.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
.github/
└── workflows/
    └── deploy-web.yml   # GitHub Actions workflow for frontend deployment

src/
└── ai-genius-web/       # React 18 + Vite frontend application
    ├── src/
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── ...
    ├── public/
    ├── package.json
    ├── vite.config.js
    └── index.html
```

**Structure Decision**: Standard GitHub Actions workflow location (`.github/workflows/`) with single workflow file `deploy-web.yml`. Frontend application lives in `src/ai-genius-web/` following existing repository structure (backend in `src/ai-genius-api/`). Build output (`dist/`) is gitignored and generated during workflow execution.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. Constitution Check passed with all principles satisfied.
