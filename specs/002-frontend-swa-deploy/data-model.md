# Data Model: Frontend Static Web App CI/CD Deployment

**Branch**: `002-frontend-swa-deploy` | **Date**: 2026-05-16

This document describes every logical entity involved in the feature, their fields, relationships, and validation rules.

---

## Entities

### 1. `GithubActionsWorkflow`

The automation file `.github/workflows/deploy-web.yml`.

| Field | Type | Validation / Constraints |
|-------|------|--------------------------|
| `name` | string | `"Deploy Web to Azure Static Web Apps"` |
| `on.push.branches` | string[] | `["main"]` — production SWA only; no PR preview |
| `concurrency.group` | string | `"deploy-web-${{ github.ref }}"` — scoped per branch |
| `concurrency.cancel-in-progress` | bool | `true` — latest push wins (spec clarification) |
| `permissions.id-token` | string | `write` — required for OIDC JWT request |
| `permissions.contents` | string | `read` — required for checkout |
| `jobs` | Job[] | Exactly one: `deploy` |

**State transitions**:
```
triggered (push to main)
  → deploy: queued → in_progress → success / failure
```

---

### 2. `DeployJob`

The single job within the workflow.

| Field | Type | Validation / Constraints |
|-------|------|--------------------------|
| `name` | string | `"Build and Deploy"` |
| `runs-on` | string | `ubuntu-latest` |
| `steps` | Step[] | Ordered: checkout → setup-node → install → build → azure-login → get-token → deploy |

**Steps** (ordered):

| Step ID | Name | Action / Command | Key Inputs |
|---------|------|-----------------|------------|
| `checkout` | Checkout code | `actions/checkout@v4` | — |
| `setup-node` | Set up Node.js 20 | `actions/setup-node@v4` | `node-version: '20'`, `cache: 'npm'`, `cache-dependency-path: src/ai-genius-web/package-lock.json` |
| `install` | Install dependencies | `npm ci` (in `src/ai-genius-web`) | — |
| `build` | Build frontend | `npm run build` (in `src/ai-genius-web`) | `env.VITE_API_URL: ${{ vars.VITE_API_URL }}` |
| `azure-login` | OIDC login | `azure/login@v2` | `client-id`, `tenant-id`, `subscription-id` from secrets |
| `get-token` | Fetch SWA deployment token | `az staticwebapp secrets list ...` → `$GITHUB_OUTPUT` | `SWA_NAME`, `AZURE_RG` from vars |
| `deploy` | Deploy to SWA | `Azure/static-web-apps-deploy@v1` | `azure_static_web_apps_api_token` from step output, `app_location`, `output_location` |

---

### 3. `OidcIdentity`

The federated cloud identity used by the pipeline.

| Field | Type | Validation / Constraints |
|-------|------|--------------------------|
| `client_id` | string | Stored as GitHub secret `AZURE_CLIENT_ID`; non-sensitive identifier |
| `tenant_id` | string | Stored as GitHub secret `AZURE_TENANT_ID`; non-sensitive identifier |
| `subscription_id` | string | Stored as GitHub secret `AZURE_SUBSCRIPTION_ID`; non-sensitive identifier |
| `federated_subject` | string | `repo:qkfang/ai-genius-s4-ep2-speckit:ref:refs/heads/main` |
| `rbac_role` | string | `Static Web Apps Contributor` |
| `rbac_scope` | string | Specific SWA resource ID — NOT resource group or subscription |

**Validation rules**:
- `id-token: write` permission MUST be present at the job level; login will silently fail without it.
- Federated subject MUST exactly match the issuer + subject configured on the App Registration.

---

### 4. `BuildArtifact`

The compiled static output produced by `npm run build`.

| Field | Type | Validation / Constraints |
|-------|------|--------------------------|
| `source_dir` | string | `src/ai-genius-web` — Vite project root |
| `output_dir` | string | `src/ai-genius-web/dist` — as configured in `vite.config.js` |
| `env_vars_baked_in` | string[] | `VITE_API_URL` (from `vars.VITE_API_URL`) |

**Validation rules**:
- If `npm run build` exits non-zero, the artifact is not produced and the job fails immediately (FR-007).
- The `dist/` directory must exist after the build step; its absence indicates a misconfigured build output path.

---

### 5. `RepositoryConfiguration`

The GitHub repository-level settings required before the workflow can run.

| Name | Type | Purpose |
|------|------|---------|
| `AZURE_CLIENT_ID` | Secret | OIDC identity — client ID of App Registration |
| `AZURE_TENANT_ID` | Secret | OIDC identity — Azure AD tenant |
| `AZURE_SUBSCRIPTION_ID` | Secret | OIDC identity — target subscription |
| `VITE_API_URL` | Variable | Build-time API base URL injected into Vite bundle |
| `SWA_NAME` | Variable | Azure Static Web App resource name |
| `AZURE_RG` | Variable | Resource group name containing the SWA |
