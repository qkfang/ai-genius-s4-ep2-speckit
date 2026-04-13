# Contract: GitHub Actions Workflow Interface

**Phase**: 1 — Design & Contracts  
**Feature**: `003-frontend-swa-deploy`  
**Date**: 2026-04-13  
**Workflow File**: `.github/workflows/deploy-web.yml`

---

## Trigger Contract

| Property | Value |
|----------|-------|
| Event | `push` |
| Branch filter | `main` only |
| Manual trigger | Not exposed (`workflow_dispatch` not included) |

```yaml
on:
  push:
    branches:
      - main
```

---

## Concurrency Contract

```yaml
concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: true
```

- Only one run per branch may be in progress at a time.
- A newer run immediately cancels the in-progress one.
- Cancelled runs leave the last successfully deployed version intact.

---

## Permissions Contract

```yaml
permissions:
  id-token: write   # OIDC token exchange with GitHub's provider
  contents: read    # Repository checkout
```

No additional permissions. Principle of least privilege (FR-005, FR-009).

---

## Environment Variables Contract

These are **configuration values** (not credentials) defined in the workflow `env:` block:

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `SWA_NAME` | `ai-genius-swa` | Azure Static Web App resource name |
| `SWA_RESOURCE_GROUP` | `ai-genius-rg` | Azure resource group containing the SWA |

> Actual values are set in the workflow YAML. They can be promoted to GitHub repository variables (`vars.SWA_NAME`) to avoid hardcoding in the file.

---

## Secrets Contract

Inputs that must be configured as GitHub repository secrets before the workflow runs:

| Secret | Type | Required By | Description |
|--------|------|-------------|-------------|
| `AZURE_CLIENT_ID` | string | `azure/login@v2` | Entra ID app registration client ID |
| `AZURE_TENANT_ID` | string | `azure/login@v2` | Azure tenant ID |
| `AZURE_SUBSCRIPTION_ID` | string | `azure/login@v2` | Azure subscription ID |

No credential secrets (passwords, API keys, tokens) are stored in the repository.

---

## Job Contract: `deploy`

**Runner**: `ubuntu-latest`  
**Default working directory**: `src/ai-genius-web`

### Step Sequence and Contracts

| # | Step Name | Action / Command | Inputs | Outputs / Side Effects |
|---|-----------|-----------------|--------|------------------------|
| 1 | Checkout | `actions/checkout@v4` | — | Repository files available to all subsequent steps |
| 2 | Setup Node.js | `actions/setup-node@v4` | `node-version: '20'` | `node` and `npm` on PATH at v20 |
| 3 | Install dependencies | `npm ci` | runs in `src/ai-genius-web` | `node_modules/` populated from `package-lock.json`; no caching |
| 4 | Build | `npm run build` | runs in `src/ai-genius-web` | `src/ai-genius-web/dist/` created; step fails if build fails |
| 5 | Azure Login | `azure/login@v2` | `client-id`, `tenant-id`, `subscription-id` (all from secrets); `federated-token: true` | Azure CLI authenticated for the run |
| 6 | Fetch SWA token | `az staticwebapp secrets list ...` | `SWA_NAME`, `SWA_RESOURCE_GROUP` | `SWA_TOKEN` step output (in-memory only) |
| 7 | Deploy | `Azure/static-web-apps-deploy@v1` | `azure_static_web_apps_api_token: ${{ steps.get-token.outputs.token }}`, `app_location: src/ai-genius-web`, `output_location: dist`, `skip_app_build: true`, `action: upload` | Static Web App updated at public URL |

### Failure Contract

| Failing Step | Workflow Outcome | Deployment Outcome |
|--------------|------------------|--------------------|
| Step 3 (npm ci) | Run marked `failure` | No artifact produced; no deploy triggered |
| Step 4 (npm run build) | Run marked `failure` | No artifact produced; no deploy triggered (FR-007) |
| Step 5 (Azure Login) | Run marked `failure` | Build artifact abandoned; no deploy triggered |
| Step 6 (Fetch token) | Run marked `failure` | Build artifact abandoned; no deploy triggered |
| Step 7 (Deploy) | Run marked `failure` | Previously deployed version remains live (FR-011) |

No automatic retry on any step. Developer must trigger a new run manually (FR-011).

---

## Output Contract

| Observable | Expected Value after Success |
|-----------|------------------------------|
| GitHub Actions run status | Green check (✓) |
| Azure Static Web App public URL | Serves the React app from the commit that triggered the run |
| Previously deployed version | Replaced atomically by SWA |
| Workflow duration | ≤ 10 minutes (SC-006) |
