# Implementation Plan: Bicep Infrastructure-as-Code CI/CD Pipeline

**Branch**: `001-bicep-deploy` | **Date**: 2026-03-22 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/001-bicep-deploy/spec.md`

## Summary

Add a GitHub Actions workflow (`.github/workflows/deploy-infra.yml`) that authenticates to Azure via OIDC federated credentials, creates the target resource group, and deploys `bicep/main.bicep` on every push to `main` (and on manual dispatch). A single workflow file contains three jobs — `infra`, `deploy-api`, and `deploy-web` — ensuring downstream jobs can consume infrastructure outputs (`app-service-name`, `static-web-app-token`) via `needs.infra.outputs.*`.

## Technical Context

**Language/Version**: YAML (GitHub Actions workflow syntax); Bicep (Azure infrastructure)  
**Primary Dependencies**: `actions/checkout@v4`, `azure/login@v2` (OIDC), Azure CLI (`az deployment group create`), `az group create`  
**Storage**: N/A  
**Testing**: Manual validation via `az deployment what-if`; `az resource list` post-deploy tag audit  
**Target Platform**: GitHub Actions `ubuntu-latest` runners; Azure resource-group–scoped ARM deployments  
**Project Type**: CI/CD pipeline (GitHub Actions workflow + supporting Bicep parameter files)  
**Performance Goals**: Full `infra` job completes within 10 minutes (SC-001)  
**Constraints**: OIDC-only authentication (no `AZURE_CREDENTIALS` secret); human-readable dispatch inputs (`development` / `staging` / `production`) must map to Bicep `@allowed` short forms (`dev` / `qa` / `prod`) before any Azure call  
**Scale/Scope**: 3 environments (dev, qa, prod); 1 workflow file; 3 sequential jobs; 3 per-environment parameter files

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                                                              | Status  | Notes                                                                                                        |
| ---------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| **Security-First** — no secrets committed; HTTPS-only                  | ✅ PASS | OIDC (client-id, tenant-id, subscription-id); no `AZURE_CREDENTIALS`                                         |
| **Cloud-Native** — Bicep IaC, tagged resources, idempotent deployments | ✅ PASS | `az deployment group create` is idempotent; all resources tagged `app`, `environment`, `managedBy=bicep`     |
| **CI/CD-Driven** — every merge triggers automated deployment           | ✅ PASS | `on: push: branches: [main]` is the primary trigger                                                          |
| **Simplicity** — prefer standard Actions over third-party              | ✅ PASS | Only `actions/checkout@v4` and `azure/login@v2` (official Microsoft action)                                  |
| **Demo Session** — concise and repeatable happy path                   | ✅ PASS | One workflow path supports push and manual dispatch; `az deployment what-if` validates template before apply |

**Gate result**: All principles pass. No violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/001-bicep-deploy/
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
    └── deploy-infra.yml          # Single workflow: infra + deploy-api + deploy-web jobs

bicep/
├── main.bicep                    # Existing — resource-group-scoped template
├── main.parameters.json          # Existing — reference only, not used by workflow
├── parameters.dev.json           # NEW — dev environment parameters
├── parameters.qa.json            # NEW — qa environment parameters
├── parameters.prod.json          # NEW — prod environment parameters
└── modules/
    ├── staticwebapp.bicep        # Existing
    └── webapp.bicep              # Existing
```

**Structure Decision**: Single workflow file with three sequential jobs; per-environment parameter files in `bicep/`. No new source directories needed — this feature is purely operational (YAML + JSON).

## Complexity Tracking

> No constitution violations — section not applicable.
