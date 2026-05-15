# Workflow Interface Contract: Frontend Static Web App CI/CD Deployment

**Branch**: `002-frontend-swa-deploy` | **Date**: 2026-05-16

This document defines the interface contract for the `deploy-web.yml` GitHub Actions workflow — what it consumes, what it produces, and the guarantees it provides to callers (repository maintainers and operators).

---

## Workflow Identity

| Property | Value |
|----------|-------|
| File path | `.github/workflows/deploy-web.yml` |
| Trigger | `push` to `refs/heads/main` |
| Concurrency group | `deploy-web-${{ github.ref }}` (resolves to `deploy-web-refs/heads/main` on main) |
| Cancel in-progress | `true` |

---

## Inputs (consumed by the workflow)

### GitHub Secrets (non-sensitive identity references)

| Secret Name | Type | Required | Description |
|-------------|------|----------|-------------|
| `AZURE_CLIENT_ID` | string | Yes | Client ID of the App Registration / Managed Identity used for OIDC login |
| `AZURE_TENANT_ID` | string | Yes | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | string | Yes | Azure subscription ID containing the SWA resource |

> **Security guarantee**: No long-lived authenticating credentials (passwords, API keys, SAS tokens) are consumed or stored. The above values are identity *references*, not secrets.

### GitHub Variables (non-sensitive configuration)

| Variable Name | Type | Required | Description |
|---------------|------|----------|-------------|
| `VITE_API_URL` | string | Yes | Base URL of the backend API, baked into the Vite bundle at build time |
| `SWA_NAME` | string | Yes | Azure Static Web App resource name (used to retrieve deployment token) |
| `AZURE_RG` | string | Yes | Resource group name containing the SWA |

### Source Code Preconditions

| Precondition | Validation |
|-------------|------------|
| `src/ai-genius-web/package.json` exists with `"build": "vite build"` script | `npm ci` will fail if absent |
| `src/ai-genius-web/package-lock.json` exists | `npm ci` requires a lockfile |
| `npm run build` produces output in `src/ai-genius-web/dist/` | Deployment will fail if `dist/` is empty or absent |

---

## Outputs (produced by the workflow)

| Output | Type | Description |
|--------|------|-------------|
| GitHub commit status check | Pass / Fail | Visible on the commit and in the Actions tab (FR-006, FR-007) |
| Deployed SWA content | Static files | Live at the Azure Static Web App URL within 3 minutes of pipeline completion (FR-008) |

---

## Guarantees

| Guarantee | Condition |
|-----------|-----------|
| Build failure prevents deployment | If `npm run build` exits non-zero, the deploy step is skipped (FR-007) |
| Install failure prevents build | If `npm ci` exits non-zero, all subsequent steps are skipped (FR-007) |
| Authentication failure prevents deployment | If `azure/login@v2` fails, the deploy step is skipped (FR-007) |
| No long-lived credential stored | The SWA deployment token is fetched at runtime and never stored in GitHub Secrets (FR-005, SC-003) |
| Only latest push deploys | In-progress runs are cancelled when a newer push arrives (spec clarification) |
| RBAC scope is resource-level | The federated identity holds `Static Web Apps Contributor` on the specific SWA resource only (FR-011) |

---

## RBAC Requirements (Azure-side)

| Role | Scope | Purpose |
|------|-------|---------|
| `Static Web Apps Contributor` | Specific SWA resource ID | Retrieve deployment token + deploy content |

Scope format:
```
/subscriptions/{AZURE_SUBSCRIPTION_ID}/resourceGroups/{AZURE_RG}/providers/Microsoft.Web/staticSites/{SWA_NAME}
```

---

## Federated Credential Configuration (Azure-side)

| Property | Value |
|----------|-------|
| Issuer | `https://token.actions.githubusercontent.com` |
| Subject | `repo:qkfang/ai-genius-s4-ep2-speckit:ref:refs/heads/main` |
| Audience | `api://AzureADTokenExchange` |

---

## Breaking Changes

The following changes to the repository would break this workflow:

| Change | Impact |
|--------|--------|
| Rename `src/ai-genius-web/` | `working-directory` paths in workflow become invalid |
| Remove `build` script from `package.json` | `npm run build` fails |
| Change Vite `outDir` from `dist` to another path | Deployment step points to wrong directory |
| Remove or rename `AZURE_CLIENT_ID` / `AZURE_TENANT_ID` / `AZURE_SUBSCRIPTION_ID` secrets | OIDC login fails |
| Remove `SWA_NAME` or `AZURE_RG` variables | Runtime token fetch fails |
