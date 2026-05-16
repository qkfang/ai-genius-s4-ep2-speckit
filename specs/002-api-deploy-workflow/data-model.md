# Phase 1 — Data Model: deploy-api.yml

This feature has **no runtime data model** — it adds a CI/CD workflow, not application logic, and stores no state. The "entities" below describe the **configuration objects** the workflow consumes and produces, captured here to make ownership and validation rules explicit.

## Entities

### 1. DeploymentWorkflow

The workflow file itself.

| Field | Value | Validation |
|---|---|---|
| `path` | `.github/workflows/deploy-api.yml` | Must be exactly this path (FR-001). |
| `name` | `Deploy API to Azure App Service` | Human-readable; surfaced in the Actions UI. |
| `triggers` | `push` on `main`; `workflow_dispatch` with `environment` input | FR-002, FR-003. |
| `jobs` | Exactly one: `build-and-deploy` | Simplicity (D6). |
| `permissions` | `contents: read`, `id-token: write` | Required for OIDC (D3). |
| `concurrency.group` | `deploy-api-<environment>` | One in-flight deploy per environment (D7). |

### 2. BackendApiProject

The build input.

| Field | Value | Validation |
|---|---|---|
| `csprojPath` | `src/ai-genius-api/ai-genius-api.csproj` | Must exist; workflow fails otherwise. |
| `targetFramework` | `net9.0` (today; ≥ `net8.0` per spec) | Workflow SDK MUST cover this TFM (D1). |
| `configuration` | `Release` | FR-005. |

### 3. PublishArtifact

The intermediate build output produced inside the runner. Ephemeral; not uploaded as a GitHub artifact in v1.

| Field | Value | Validation |
|---|---|---|
| `publishDir` | `./publish` | Created by `dotnet publish -o`. |
| `zipPath` | `./publish.zip` | Zip of the **contents** of `publishDir`, not the directory itself (D2). |
| `lifetime` | Job-local; discarded when the runner is torn down. | Not persisted as a `actions/upload-artifact`. |

### 4. AzureAppServiceTarget

The deploy destination, resolved at job runtime.

| Field | Source | Validation |
|---|---|---|
| `appServiceName` | `vars.APP_SERVICE_NAME` (GitHub repository variable) | MUST be non-empty; workflow MUST fail fast with a clear message if empty (FR-009, FR-008 edge). |
| `plan` | Linux B1 (informational; owned by Bicep) | Workflow does not validate this; it is enforced by the IaC layer. |
| `resourceGroup` | Implicit — `azure/webapps-deploy@v3` resolves by App Service name within the subscription. | No explicit value passed by this workflow. |

### 5. AzureCredential

The authentication context.

| Field | Source | Validation |
|---|---|---|
| `clientId` | `secrets.AZURE_CLIENT_ID` | Required secret. |
| `tenantId` | `secrets.AZURE_TENANT_ID` | Required secret. |
| `subscriptionId` | `secrets.AZURE_SUBSCRIPTION_ID` | Required secret. |
| `mode` | OIDC federated (no client secret) | The federated credential on the Azure AD app MUST trust `repo:<owner>/<repo>:ref:refs/heads/main` and any other environments allowed to deploy. |

## State Transitions

The workflow has a single linear state machine per run:

```
Queued → InProgress
  ├─ Checkout         ─┐
  ├─ Setup .NET        │  any failure ⇒ Failed (no deploy)
  ├─ dotnet publish    │
  ├─ Zip artifact     ─┘
  ├─ azure/login (OIDC)         ─┐ failure ⇒ Failed (no zip uploaded to Azure)
  └─ azure/webapps-deploy@v3 zip ─┘ success ⇒ Succeeded
```

- A run is **Succeeded** iff every step exits 0 (FR-010).
- A run is **Failed** if any step exits non-zero; the deploy step does not execute when an earlier step failed (FR-006).
- App Service state is **unchanged** on any pre-deploy failure (edge case in spec).

## Invariants

- INV-1: The zip uploaded to Azure App Service is built from the same `git` commit that triggered the workflow run (no cross-commit contamination — single job, single checkout).
- INV-2: No secret value appears in plain text in the workflow YAML or the run log (SC-005).
- INV-3: The workflow file is the only deployment path to the target App Service (Constitution III; informational — enforced socially, not by the workflow itself).
