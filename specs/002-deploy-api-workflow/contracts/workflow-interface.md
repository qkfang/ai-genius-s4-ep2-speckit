# Workflow Interface Contract

**Feature**: `002-deploy-api-workflow`
**File**: `.github/workflows/deploy-api.yml`
**Date**: 2026-03-22

This document defines the public interface of the GitHub Actions workflow: its triggers, required configuration, observable outputs, and the guarantees it provides to callers (developers merging to `main`) and to downstream observers (the running App Service).

---

## Triggers

| Trigger | Condition | Effect |
|---------|-----------|--------|
| `push` | Branch `main` | Runs the deploy job automatically (FR-002) |
| `workflow_dispatch` | Manual via Actions UI | Same job, same target App Service (re-run / emergency deploy) |

Pushes to any other branch, and pull-request events (including from forks), MUST NOT trigger this workflow.

---

## Inputs (`workflow_dispatch`)

None. The deploy target is fully determined by repository configuration (`vars.APP_SERVICE_NAME`).

---

## Required Secrets

These GitHub repository **secrets** must be configured before any run can succeed. All three are non-sensitive identifiers; no client secret or publish profile is involved.

| Secret name | Type | Used by |
|-------------|------|---------|
| `AZURE_CLIENT_ID` | GUID | `azure/login@v2` (`client-id`) |
| `AZURE_TENANT_ID` | GUID | `azure/login@v2` (`tenant-id`) |
| `AZURE_SUBSCRIPTION_ID` | GUID | `azure/login@v2` (`subscription-id`) |

**Forbidden references** (constitution / FR-007): `AZURE_CREDENTIALS`, `AZURE_CLIENT_SECRET`, `AZUREAPPSERVICE_PUBLISHPROFILE_*`.

---

## Required Variables

| Variable name | Type | Used by | Example |
|---------------|------|---------|---------|
| `APP_SERVICE_NAME` | string | `azure/webapps-deploy@v3` (`app-name`) and the `/health` probe URL | `app-aigenius-api-dev` |

The variable MUST be set as a **repository variable** (not a secret) — the App Service name is public DNS and not sensitive (FR-013).

---

## Required Permissions Block

```yaml
permissions:
  id-token: write   # OIDC JWT request
  contents: read    # actions/checkout
```

`id-token: write` is the only non-default permission. Omitting it causes `azure/login@v2` to fail with "Could not get ID token" (silent class of failure — fail fast is critical).

---

## Concurrency Contract

```yaml
concurrency:
  group: deploy-api-${{ github.ref }}
  cancel-in-progress: false
```

Guarantees (FR-014):

- At most one `deploy-api` run executes against `main` at any time.
- A later push to `main` queues behind an in-flight run (does **not** cancel it).
- The latest commit's run always runs eventually and wins (Zip Deploy is "last write wins" at the App Service).

---

## Job Outputs

This workflow exposes **no** `jobs.<job_id>.outputs`. Downstream workflows that need to know "the API was just deployed" should rely on:

- The commit's check status (green = deployed and healthy).
- Polling `https://${APP_SERVICE_NAME}.azurewebsites.net/health` themselves.

(Future enhancement, not in scope: an output containing the deployed commit SHA, surfaced for a frontend-deploy workflow.)

---

## Post-Conditions (guarantees when the run is ✅ green)

1. **FR-010 / SC-002**: `GET https://${APP_SERVICE_NAME}.azurewebsites.net/health` returns `200 OK` with body exactly `{"status":"ok"}`.
2. **FR-006**: The App Service is running the code from `HEAD` of `main` at the time the workflow started, deployed via Zip Deploy from `./api.zip`.
3. **FR-007 / SC-003**: No long-lived Azure credential was used; the run's audit log shows an OIDC federated token exchange.
4. **FR-008**: The job declared the minimum permissions (`id-token: write`, `contents: read`).

## Post-Conditions (guarantees when the run is ❌ red)

1. **FR-005 / FR-012 / SC-007**: At least one of {build, publish, login, deploy, `/health` probe} failed; the failing step name and logs are visible in the Actions UI.
2. **Edge case "deployment failure mid-way"**: The previous App Service code remains live; no half-deployed state is surfaced to consumers.

---

## Non-goals (explicitly out of contract)

- Provisioning the App Service or any Azure resource (owned by `deploy-infra.yml`).
- Running API unit tests (owned by a separate `ci.yml` — out of scope for this feature).
- Database migrations, cache warm-up, configuration drift checks.
- Multi-environment (dev/qa/prod) routing — the workflow targets exactly one App Service, identified by `vars.APP_SERVICE_NAME`. Multi-env can be added later by promoting the variable to environment-scoped vars.

---

## Versioning

| Change | Required bump |
|--------|---------------|
| Add a new required secret or variable | MINOR — update this contract and `quickstart.md`, re-run the contract gate in `/speckit.plan` |
| Remove or rename a secret/variable, change trigger filter, change the `/health` contract | MAJOR — coordinate with feature 001 (Bicep) and downstream consumers |
| Bump action pin (e.g. `azure/login@v2` → `@v3`) without behaviour change | PATCH — no contract change |
