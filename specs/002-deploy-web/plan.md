# Implementation Plan: React Frontend Web Deployment Workflow

**Branch**: `002-deploy-web` | **Date**: 2026-05-20 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/002-deploy-web/spec.md`; user requested a 1-week sprint plan for the React 18 + Vite app in `src/ai-genius-web`.

## Summary

Add `.github/workflows/002-deploy-web.yml` to build and deploy the AI Genius React 18 + Vite frontend from `src/ai-genius-web` to Azure Static Web Apps. The workflow follows the existing infra workflow pattern for `main` pushes, manual environment selection, environment binding, and concurrency cancellation; it installs dependencies with `npm ci`, builds `dist/` with `npm run build`, authenticates with `azure/login@v1`, and publishes with `Azure/static-web-apps-deploy@v1`. The work is planned as a 1-week sprint focused on the main CI/CD path: implement, validate locally, run manually for `dev`, and confirm the automatic `main` deployment path.

## Technical Context

**Language/Version**: YAML (GitHub Actions workflow syntax); JavaScript/JSX for the existing React 18 + Vite 5 app; Node.js 20 on GitHub-hosted runners  
**Primary Dependencies**: `actions/checkout@v4`, `actions/setup-node@v4`, `azure/login@v1`, `Azure/static-web-apps-deploy@v1`, npm, Vite build output in `dist/`  
**Storage**: N/A  
**Testing**: Local/CI `npm ci` and `npm run build` from `src/ai-genius-web`; GitHub Actions manual run for `dev`; workflow review for required secrets and variables  
**Target Platform**: GitHub Actions `ubuntu-latest` runners deploying to Azure Static Web Apps over HTTPS  
**Project Type**: CI/CD workflow for a frontend web application  
**Performance Goals**: Successful normal frontend deployment completes within 10 minutes; manual deployment can be started from GitHub Actions in under 2 minutes  
**Constraints**: Use the existing infra workflow's `ENVIRONMENT` pattern and concurrency group; no hard-coded credentials or deployment tokens; publish generated `dist/` only; `VITE_API_URL` comes from GitHub Actions variables  
**Scale/Scope**: 1 workflow file, 1 React/Vite app directory, 3 environments (`dev`, `qa`, `prod`), 1-week sprint implementation window

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle      | Gate                                                                         | Status |
| -------------- | ---------------------------------------------------------------------------- | ------ |
| Security-First | Uses HTTPS for production paths and keeps secrets out of source code         | PASS   |
| Cloud-Native   | Defines Azure infrastructure changes through Bicep or workflow configuration | PASS   |
| CI/CD-Driven   | Builds, validates, and deploys through GitHub Actions on `main`              | PASS   |
| Simplicity     | Uses the smallest standard implementation that satisfies the spec            | PASS   |
| Demo Session   | Keeps the happy path concise, repeatable, and demo-ready                     | PASS   |

**Gate result**: All principles pass. No violations. Proceed to Phase 0.  
**Post-design re-check**: PASS. The design uses only official GitHub/Azure actions already established in repository guidance, relies on existing Bicep-provisioned Static Web Apps resources, and keeps validation focused on the fast frontend build/deploy path.

## Project Structure

### Documentation (this feature)

```text
specs/002-deploy-web/
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
  └── 002-deploy-web.yml       # New workflow for frontend build and Static Web Apps deployment

src/
└── ai-genius-web/
  ├── package.json             # Existing npm scripts: ci-compatible install, build, preview, lint
  ├── package-lock.json        # Existing lockfile used by npm ci and setup-node cache
  ├── vite.config.js           # Existing Vite config; build output is dist
  ├── public/
  │   └── staticwebapp.config.json
  └── src/
    ├── App.jsx
    └── main.jsx

bicep/
├── parameters.dev.json          # Existing Static Web App SKU: Free
├── parameters.qa.json           # Existing Static Web App SKU: Free
├── parameters.prod.json         # Existing Static Web App SKU: Standard
└── modules/
  └── staticwebapp.bicep       # Existing Static Web Apps resource and deployment token output
```

**Structure Decision**: This is an operational CI/CD feature. Add one workflow under `.github/workflows/` and reuse the existing React/Vite app, lockfile, Static Web Apps config, and Bicep-provisioned hosting resources. No frontend source restructuring is planned.

## 1-Week Sprint Plan

| Day   | Focus                                                      | Outcome                                                                                                                          |
| ----- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Day 1 | Confirm workflow contract and repository variables/secrets | Required inputs documented; no missing implementation decisions                                                                  |
| Day 2 | Implement `.github/workflows/002-deploy-web.yml`           | Push and manual dispatch triggers, environment binding, concurrency, Node setup, build, Azure login, and SWA deploy are in place |
| Day 3 | Validate frontend build locally/CI-style                   | `npm ci` and `npm run build` pass from `src/ai-genius-web`                                                                       |
| Day 4 | Run manual `dev` deployment                                | GitHub Actions manual dispatch deploys `dist/` to the dev Static Web App                                                         |
| Day 5 | Verify main push path and document handoff                 | Automatic trigger, cancellation behavior, and published site smoke test are confirmed                                            |

Sprint success means the main use case is complete: a merge to `main` builds the React/Vite app and deploys the generated `dist/` output to Azure Static Web Apps using configured secrets and variables.

## Complexity Tracking

> No constitution violations. Section not applicable.
