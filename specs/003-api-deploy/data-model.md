# Phase 1 Data Model: Backend API CI/CD Pipeline

**Feature**: `003-api-deploy`
**Date**: 2026-05-19

This feature is a CI/CD pipeline, not a data-bearing application, so the "data model" describes the **configuration entities** the workflow reads and the **artifact entities** it produces. There are no persisted database records.

---

## Entity: GitHub Actions Workflow

| Attribute | Value | Source / Validation |
|---|---|---|
| File path | `.github/workflows/003-deploy-api.yml` | FR-003 (exact path required) |
| Name | `003 Deploy API to Azure` | Convention from `001-deploy-infra.yml` |
| Triggers | `push` (branch `main`), `workflow_dispatch` | FR-001, FR-002 |
| Concurrency group | `${{ github.workflow }}-${{ github.ref }}` | FR-010 |
| `cancel-in-progress` | `true` | FR-010, SC-004 |
| Permissions | `contents: read` | R8 (least privilege) |
| Jobs | 1 — `build-and-deploy` | Simplicity principle |

## Entity: Workflow Input — `environment`

| Attribute | Value |
|---|---|
| Type | `choice` |
| Required | `true` (on `workflow_dispatch`) |
| Default | `dev` |
| Allowed values | `dev`, `qa`, `prod` |
| Effect | Sets the GitHub `environment:` scoping for the deploy job, which selects the per-environment `vars.APP_SERVICE_NAME` and any protection rules. |

State transitions (selection):

```text
push to main          → environment = "dev"   (default; no input)
dispatch + select dev → environment = "dev"
dispatch + select qa  → environment = "qa"
dispatch + select prod→ environment = "prod"  (subject to protection rules on the prod environment)
```

## Entity: Environment Variables (workflow-level)

| Variable | Source | Example | Description |
|---|---|---|---|
| `ENVIRONMENT` | `${{ github.event.inputs.environment \|\| 'dev' }}` | `dev` | Selected environment short form. FR-013 default. |
| `DOTNET_VERSION` | hard-coded `10.0.x` | `10.0.x` | SDK version pinned to .NET 10 major. FR-005. |
| `PROJECT_PATH` | hard-coded | `src/ai-genius-api/ai-genius-api.csproj` | API project to build/publish. FR-005, FR-008a. |
| `APP_SERVICE_NAME` | `${{ vars.APP_SERVICE_NAME }}` | `app-aigenius-api-dev` | Target App Service name, resolved from the GitHub environment-scoped variable. FR-008. |

## Entity: Required Secrets

| Secret | Scope | Used by | Sensitive |
|---|---|---|---|
| `AZURE_CREDENTIALS` | Repository | `azure/login@v1` | Yes (service-principal JSON) |

> No new secrets are introduced. FR-012, SC-006.

## Entity: Required Variables

| Variable | Scope | Used by | Notes |
|---|---|---|---|
| `APP_SERVICE_NAME` | GitHub environment (`dev`/`qa`/`prod`) | The deploy step's `app-name` input | Must exactly match the App Service provisioned by `001-deploy-infra.yml` for the same environment. FR-008. |

## Entity: Build/Deploy Artifact

| Attribute | Value |
|---|---|
| Producer | `dotnet publish` step (Release configuration) |
| Publish output directory | `./publish` (runner workspace) |
| Packaged form | `./publish.zip` |
| Packaging command | `cd publish && zip -r ../publish.zip .` |
| Consumer | `azure/webapps-deploy@v3` (`package: ./publish.zip`) |
| Retention | Ephemeral — deleted with the runner; not uploaded as a GitHub artifact. |

## Entity: Target Azure App Service (external)

| Attribute | Value | Owner |
|---|---|---|
| Provider | Azure App Service on Linux | `001-deploy-infra.yml` (Bicep) |
| App Service Plan SKU | `B1` | `001-deploy-infra.yml` |
| OS | Linux | `001-deploy-infra.yml` |
| Runtime stack | .NET 10 | `001-deploy-infra.yml` / App Service site config |
| Deployment mode | Zip Deploy | This workflow (FR-007) |
| Identifier | `vars.APP_SERVICE_NAME` (per environment) | Repo/environment configuration |

## Relationships

```text
WorkflowInput.environment ──selects──► GitHubEnvironment ──provides──► vars.APP_SERVICE_NAME
                                                              │
                                                              └──► protection rules (e.g., required reviewers for prod)

dotnet publish ─► publish/ ─► publish.zip ─► azure/webapps-deploy@v3 ─► Azure App Service (vars.APP_SERVICE_NAME)
                                                       ▲
                                                       │
                                                  azure/login@v1 ◄── secrets.AZURE_CREDENTIALS
```

## Validation rules

1. `vars.APP_SERVICE_NAME` MUST be non-empty for the selected environment; if missing, `azure/webapps-deploy@v3` will fail with a clear error (edge case in spec).
2. `secrets.AZURE_CREDENTIALS` MUST be present at the repository level; if missing, `azure/login@v1` fails fast before any deploy attempt (FR-011).
3. `dotnet publish` MUST exit 0; otherwise the zip packaging step and all subsequent steps are skipped via standard step-failure semantics (FR-011).
4. The `.zip` MUST be non-empty; an empty publish output is treated as a build failure by `azure/webapps-deploy@v3` (edge case in spec).
