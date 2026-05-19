# Workflow Interface Contract

**Feature**: `003-api-deploy`
**File**: `.github/workflows/003-deploy-api.yml`
**Date**: 2026-05-19

This document defines the public interface of the API deployment workflow: triggers, inputs, required secrets and variables, environment scoping, and the guarantees it provides.

---

## Triggers

| Trigger | Condition | Default environment |
|---------|-----------|---------------------|
| `push` | Branch `main` | `dev` (via `${{ github.event.inputs.environment \|\| 'dev' }}`) |
| `workflow_dispatch` | Manual via GitHub Actions UI | Input-driven (see below) |

---

## Inputs (`workflow_dispatch`)

| Input name | Type | Required | Default | Allowed values | Description |
|------------|------|----------|---------|----------------|-------------|
| `environment` | `choice` | Yes | `dev` | `dev`, `qa`, `prod` | Selects the GitHub `environment:` for the deploy job. Drives `vars.APP_SERVICE_NAME` resolution and any environment protection rules. |

---

## Required Secrets

| Secret name | Scope | Used by | Description |
|-------------|-------|---------|-------------|
| `AZURE_CREDENTIALS` | Repository | `azure/login@v1` | Service-principal JSON granting deploy permission on all three target App Services. Reused from `001-deploy-infra.yml`. **No new secret introduced by this workflow.** |

---

## Required Variables

| Variable name | Scope | Used by | Description |
|---------------|-------|---------|-------------|
| `APP_SERVICE_NAME` | GitHub environment (`dev`, `qa`, `prod`) | `azure/webapps-deploy@v3` `app-name` input | Exact name of the target Azure App Service for that environment. Must match the name provisioned by `001-deploy-infra.yml`. |

---

## Environment Variables (workflow-level)

| Variable | Value | Description |
|----------|-------|-------------|
| `ENVIRONMENT` | `${{ github.event.inputs.environment \|\| 'dev' }}` | Selected environment short form (dev/qa/prod). |
| `DOTNET_VERSION` | `10.0.x` | .NET SDK version installed by `actions/setup-dotnet`. |
| `PROJECT_PATH` | `src/ai-genius-api/ai-genius-api.csproj` | API project to build/publish. |
| `APP_SERVICE_NAME` | `${{ vars.APP_SERVICE_NAME }}` | Target App Service name, environment-scoped. |

---

## Job: `build-and-deploy`

| Attribute | Value |
|---|---|
| `runs-on` | `ubuntu-latest` |
| `environment` | `${{ github.event.inputs.environment \|\| 'dev' }}` |
| `permissions` | `contents: read` (workflow-level) |
| Job outputs | None (this is a leaf job; nothing downstream consumes it) |

### Ordered steps (FR-008a)

1. `actions/checkout@v4` — checkout the triggering commit.
2. `actions/setup-dotnet@v4` — install .NET SDK `10.0.x`.
3. `dotnet publish` — `dotnet publish ${{ env.PROJECT_PATH }} --configuration Release --output ./publish`.
4. Zip the publish output — `cd publish && zip -r ../publish.zip .` (produces `./publish.zip`).
5. `azure/login@v1` — authenticate using `secrets.AZURE_CREDENTIALS`.
6. `azure/webapps-deploy@v3` — `app-name: ${{ vars.APP_SERVICE_NAME }}`, `package: ./publish.zip`.

---

## Concurrency Contract

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

- Only one run of `003 Deploy API to Azure` is active per ref at any time.
- A new push to `main` (or new dispatch on the same ref) cancels the in-flight run so the latest commit's artifact is the one that lands.

---

## Guarantees

| # | Guarantee | Failure mode |
|---|-----------|--------------|
| G1 | The deploy step never runs if `dotnet publish` fails | GitHub Actions step `failure()` short-circuits the job (FR-011). |
| G2 | The deploy step never runs if `azure/login@v1` fails | Login is step 5 in the ordered sequence; failure halts the job before deploy (FR-011). |
| G3 | No long-lived Azure credential is added by this feature | Reuses `AZURE_CREDENTIALS`; no new secrets (FR-012, SC-006). |
| G4 | Stale runs on the same ref are cancelled | `concurrency.cancel-in-progress: true` (FR-010, SC-004). |
| G5 | App Service name is environment-scoped, not composed at runtime | `app-name: ${{ vars.APP_SERVICE_NAME }}` reads from the GitHub environment selected by the workflow input (FR-008). |
| G6 | Push-triggered runs always target `dev` | `${{ github.event.inputs.environment \|\| 'dev' }}` (FR-013). |

---

## Breaking Changes

Any of the following constitute a **breaking change** and require a new spec:

- Renaming the workflow file or changing its path away from `.github/workflows/003-deploy-api.yml`.
- Removing the `push` on `main` trigger or the `workflow_dispatch` trigger.
- Changing the allowed values of the `environment` input or its default.
- Changing the authentication mechanism from `AZURE_CREDENTIALS` + `azure/login@v1` to anything else.
- Composing the App Service name at runtime instead of reading `vars.APP_SERVICE_NAME`.
- Disabling concurrency cancellation (`cancel-in-progress: false`).
- Removing or reordering the six steps listed under "Ordered steps" above (FR-008a).
