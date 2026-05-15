# Research: Frontend Static Web App CI/CD Deployment — Phase 0

**Branch**: `002-frontend-swa-deploy` | **Date**: 2026-05-16

This document resolves all unknowns identified during Technical Context analysis.

---

## 1. OIDC Authentication with `azure/login@v2` + `Azure/static-web-apps-deploy@v1`

**Decision**: Use `azure/login@v2` (OIDC) followed by `Azure/static-web-apps-deploy@v1` without storing `azure_static_web_apps_api_token` as a GitHub secret. The workflow fetches the SWA deployment token at runtime using the Azure CLI session established by the OIDC login.

**Rationale**:
- `Azure/static-web-apps-deploy@v1` accepts `azure_static_web_apps_api_token` as an input but it is not mandatory when the Azure CLI is already authenticated via `azure/login@v2`.
- The SWA deployment token can be retrieved at runtime with `az staticwebapp secrets list --name <app-name> --resource-group <rg> --query "properties.apiKey" -o tsv`, satisfying FR-005 (no long-lived credential stored).
- The OIDC-derived Azure identity needs the `Static Web Apps Contributor` role scoped to the specific SWA resource to retrieve the deployment key (FR-011).

**Required `permissions` block**:
```yaml
permissions:
  id-token: write   # Required to request OIDC JWT
  contents: read    # Required for checkout
```

**GitHub secrets required** (non-secret identity references, per FR-005):
- `AZURE_CLIENT_ID` — App Registration / Managed Identity client ID
- `AZURE_TENANT_ID` — Azure AD tenant ID
- `AZURE_SUBSCRIPTION_ID` — Target Azure subscription ID

**GitHub variables required** (non-sensitive configuration):
- `VITE_API_URL` — Backend API base URL injected as build-time env var (FR-010)
- `SWA_NAME` — Azure Static Web App resource name
- `AZURE_RG` — Resource group containing the SWA

**Azure-side prerequisites** (documented, not created by this workflow):
1. App Registration with Federated Credential:
   - Subject: `repo:qkfang/ai-genius-s4-ep2-speckit:ref:refs/heads/main`
   - Issuer: `https://token.actions.githubusercontent.com`
2. Role assignment: `Static Web Apps Contributor` on the specific SWA resource (not resource group level, per FR-011).

**Alternatives considered**:
- `azure_static_web_apps_api_token` stored as GitHub secret — rejected: long-lived credential, violates FR-005 and SC-003.
- Self-hosted runner with Managed Identity — rejected: adds infrastructure complexity; not required by the spec.

---

## 2. Node.js Setup in GitHub Actions

**Decision**: Use `actions/setup-node@v4` with `node-version: '20'` and `cache: 'npm'`. Working directory set to `src/ai-genius-web` for all npm steps.

**Rationale**:
- `package.json` specifies `"engines": { "node": ">=18.0.0" }`. Node.js 20 (LTS) satisfies this constraint and matches the user specification.
- `cache: 'npm'` caches the npm dependency cache directory (`~/.npm`), speeding up subsequent runs without storing `node_modules` in the cache.
- The `working-directory` default must be set for `npm ci` and `npm run build` since the frontend lives in `src/ai-genius-web`, not the repo root.

**Alternatives considered**:
- Node.js 18 — compatible but 20 is the user-specified LTS version.
- `npm install` instead of `npm ci` — rejected: `npm ci` is deterministic and uses `package-lock.json` exactly, preferred for CI (FR-002).

---

## 3. Concurrency: Cancel In-Progress Deployments

**Decision**: Use `concurrency` with `group: deploy-web-${{ github.ref }}` and `cancel-in-progress: true`.

**Rationale**:
- Satisfies the spec clarification: "Cancel in-progress — only the latest commit's deployment runs."
- `github.ref` scopes the group to the branch, so parallel runs on different branches do not interfere.
- Consistent with the pattern used in `deploy-infra.yml` (001 workflow).

**Alternatives considered**:
- No concurrency control — rejected: multiple pushes in quick succession would queue multiple deployments.
- `cancel-in-progress: false` (queue mode) — rejected: spec explicitly requires cancellation.

---

## 4. Build-Time Environment Variable Injection (VITE_API_URL)

**Decision**: Inject `VITE_API_URL` via the `env:` block of the build step, sourcing its value from a GitHub Actions variable (`vars.VITE_API_URL`).

**Rationale**:
- Vite bakes `VITE_*` environment variables into the static bundle at build time. They must be present during `npm run build`, not at runtime.
- Using `vars.VITE_API_URL` (a GitHub Actions variable, not a secret) is appropriate since the API URL is not sensitive.
- FR-010 requires all required build-time env vars to be injected before the build step.

**Example**:
```yaml
- name: Build
  working-directory: src/ai-genius-web
  run: npm run build
  env:
    VITE_API_URL: ${{ vars.VITE_API_URL }}
```

**Alternatives considered**:
- Hardcoding the URL in `vite.config.js` — rejected: couples config to source code; breaks multi-environment portability.
- Using a `.env` file committed to the repo — rejected: violates security-first principle if any value is sensitive; not suitable for CI injection.

---

## 5. RBAC Role for SWA Deployment

**Decision**: Assign the `Static Web Apps Contributor` built-in role to the federated identity, scoped to the specific SWA resource ID (not the resource group or subscription).

**Rationale**:
- `Static Web Apps Contributor` grants the minimum permissions needed to list secrets (deployment token) and manage the SWA content — satisfying FR-011 (least-privilege, resource-scoped).
- Scoping to the specific resource ID (`/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/staticSites/{name}`) prevents any lateral access to other resources in the same resource group.

**Role assignment (Azure CLI)**:
```bash
az role assignment create \
  --assignee <client-id> \
  --role "Static Web Apps Contributor" \
  --scope "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/staticSites/{swa-name}"
```

**Alternatives considered**:
- `Contributor` at resource group level — rejected: violates FR-011 (too broad).
- `Owner` at subscription level — rejected: violates least-privilege principle.
