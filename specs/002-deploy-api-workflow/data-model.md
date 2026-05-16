# Data Model: Deploy API Workflow

**Branch**: `002-deploy-api-workflow` | **Date**: 2026-03-22

This feature has no application-domain data model (it is a CI/CD pipeline). The "entities" below are the logical pieces of the workflow definition and the external resources it interacts with, expressed as a data model to keep the spec/plan/tasks chain consistent.

---

## Entities

### 1. `GithubActionsWorkflow`

The automation file `.github/workflows/deploy-api.yml`.

| Field | Type | Validation / Constraints |
|-------|------|--------------------------|
| `name` | string | `"Deploy API to Azure"` |
| `on.push.branches` | string[] | `["main"]` (FR-002) |
| `on.workflow_dispatch` | object | Present (no inputs); enables manual re-run (spec edge case) |
| `concurrency.group` | string | `"deploy-api-${{ github.ref }}"` |
| `concurrency.cancel-in-progress` | bool | `false` (FR-014 — serialise, don't abort mid-deploy) |
| `permissions.id-token` | enum | `write` (FR-008) |
| `permissions.contents` | enum | `read` (FR-008) |
| `jobs` | Job[] | Exactly one: `deploy-api` |

**State transitions**:

```text
triggered (push to main / workflow_dispatch)
  → deploy-api: queued → in_progress → success | failure
```

A failure at any step short-circuits the remainder of the job.

---

### 2. `Job` — `deploy-api`

| Field | Type | Validation / Constraints |
|-------|------|--------------------------|
| `runs-on` | string | `ubuntu-latest` |
| `permissions.id-token` | enum | `write` (redundant with workflow-level; explicit for clarity) |
| `permissions.contents` | enum | `read` |
| `steps` | Step[] | Ordered: checkout, setup-dotnet, publish, zip, login, deploy, health-check |

---

### 3. `Step` — ordered sequence

| # | `name` | Action / `run` | Critical inputs / outputs |
|---|--------|----------------|---------------------------|
| 1 | Checkout repository | `actions/checkout@v4` | none |
| 2 | Set up .NET SDK | `actions/setup-dotnet@v4` | `dotnet-version: 9.0.x` |
| 3 | Publish API | `run: dotnet publish src/ai-genius-api/ai-genius-api.csproj -c Release -o ./publish` | output dir `./publish` |
| 4 | Zip publish output | `run: cd ./publish && zip -r ../api.zip .` | artifact `./api.zip` |
| 5 | Azure login (OIDC) | `azure/login@v2` | `client-id`, `tenant-id`, `subscription-id` from secrets |
| 6 | Deploy to App Service | `azure/webapps-deploy@v3` | `app-name: ${{ vars.APP_SERVICE_NAME }}`, `package: ./api.zip` |
| 7 | Verify `/health` | `run: curl --fail` loop | asserts body `{"status":"ok"}` (FR-010) |

**Validation rule**: Step 5 (`azure/login`) MUST appear **after** the build steps (1–4) — there is no point authenticating before the artifact exists, and login is required before step 6.

---

### 4. `RequiredSecret`

| Name | Sensitivity | Source | Purpose |
|------|-------------|--------|---------|
| `AZURE_CLIENT_ID` | non-sensitive identifier | GitHub repository secret | OIDC `client-id` of the federated app/identity |
| `AZURE_TENANT_ID` | non-sensitive identifier | GitHub repository secret | Entra ID tenant |
| `AZURE_SUBSCRIPTION_ID` | non-sensitive identifier | GitHub repository secret | Azure subscription |

**Validation rule** (FR-007): The set of secrets referenced by the workflow MUST be exactly the three above. The presence of any `AZURE_CREDENTIALS`, `AZURE_CLIENT_SECRET`, or `AZUREAPPSERVICE_PUBLISHPROFILE_*` reference is a constitution violation.

---

### 5. `RequiredVariable`

| Name | Source | Purpose |
|------|--------|---------|
| `APP_SERVICE_NAME` | GitHub repository **variable** (`vars.APP_SERVICE_NAME`) | Name of the target Azure App Service; also used to construct the post-deploy `/health` URL (`https://${name}.azurewebsites.net/health`) |

---

### 6. `TargetAppService` (external, read-only from this workflow's perspective)

Provisioned by feature 001 (`deploy-infra.yml` → `bicep/modules/webapp.bicep`).

| Property | Constraint | Owner |
|----------|------------|-------|
| Plan SKU | `B1` | Bicep (FR-009) |
| Plan OS | `Linux` | Bicep (FR-009) |
| Runtime stack | `.NET 9` | Bicep |
| `httpsOnly` | `true` | Bicep (FR-009, US3) |
| `/health` route | returns `200 {"status":"ok"}` | API code (`Program.cs`) |

---

### 7. `FederatedIdentity` (external)

Entra ID App Registration or User-Assigned Managed Identity with:

- Federated credential subject: `repo:qkfang/ai-genius-s4-ep2-speckit:ref:refs/heads/main`
- Role assignment: `Website Contributor` on the target App Service (or `Contributor` on the resource group)

Out of scope of this workflow (configured once via `quickstart.md`).

---

## Relationships

```text
GithubActionsWorkflow 1 — 1 Job (deploy-api)
Job                   1 — 7 Step
Job                   1 — 3 RequiredSecret
Job                   1 — 1 RequiredVariable
Job                   1 — 1 FederatedIdentity   (resolved at runtime via OIDC)
Job                   1 — 1 TargetAppService    (resolved via vars.APP_SERVICE_NAME)
```
