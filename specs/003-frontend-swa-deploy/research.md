# Research: Frontend React App Deployment via GitHub Actions

**Phase**: 0 — Outline & Research  
**Feature**: `003-frontend-swa-deploy`  
**Date**: 2026-04-13

This document resolves all design unknowns identified during Technical Context analysis.

---

## Decision 1: OIDC Authentication for Azure Static Web Apps Deployment

**Question**: How does `Azure/static-web-apps-deploy@v1` authenticate when no deployment token secret is stored in the repository?

**Decision**: Two-step OIDC pattern.
1. `azure/login@v2` authenticates the runner to Azure using a federated identity credential (OIDC). Only three non-secret configuration values are needed: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`.
2. After login, the Azure CLI fetches the SWA deployment token at runtime:
   ```bash
   az staticwebapp secrets list \
     --name ${{ env.SWA_NAME }} \
     --resource-group ${{ env.SWA_RESOURCE_GROUP }} \
     --query "properties.apiKey" -o tsv
   ```
3. The runtime token is passed to `Azure/static-web-apps-deploy@v1` as `azure_static_web_apps_api_token`. The token exists only for the duration of the step; it is never stored as a repository secret.

**Rationale**: The `Azure/static-web-apps-deploy@v1` action requires an API token (the SWA deployment token) — it does not accept an existing Azure CLI session directly. Fetching the token via the Azure CLI (authenticated with OIDC) satisfies FR-005 (no long-lived credentials) while remaining compatible with the action's interface.  The SWA resource name and resource group are configuration values (not credentials) stored as workflow `env:` variables — they can be hardcoded in the YAML or promoted to GitHub repository variables.

**Alternatives considered**:
- Store the SWA deployment token as a repo secret (`AZURE_STATIC_WEB_APPS_API_TOKEN`) — rejected because the spec (FR-005, FR-009) explicitly prohibits long-lived credentials in the repository. The deployment token, while shorter-lived than a service principal secret, is still a static credential.
- Use `azure/login@v2` `enable-AzPSSession: true` and PowerShell to deploy — rejected as over-engineered relative to the existing SWA action.

---

## Decision 2: Node.js Version Strategy

**Question**: Should the workflow pin Node.js, and to which version?

**Decision**: Pin to Node.js **20** via `actions/setup-node@v4` with `node-version: '20'`.

**Rationale**: The user's planning arguments explicitly specify Node.js 20. The `package.json` in `src/ai-genius-web` declares `"engines": { "node": ">=18.0.0" }`, so Node.js 20 satisfies that constraint and is an LTS release. Pinning prevents drift if the runner's default changes.

**Alternatives considered**:
- No pinning (runner default) — this was the original spec assumption, but the user's plan args override it with Node.js 20.
- Node.js 18 (minimum per engines field) — technically compatible but Node.js 20 is the current LTS and the user specified it.

---

## Decision 3: npm Install Working Directory

**Question**: Where should `npm ci` and `npm run build` run? The repo root has no `package.json`.

**Decision**: Set `defaults.run.working-directory: src/ai-genius-web` at the job level so all `run` steps execute in that directory automatically.

**Rationale**: The React app's `package.json` is at `src/ai-genius-web/package.json`. Running npm commands from the repo root would fail. Setting the default working directory once at the job level is cleaner than repeating `working-directory:` on each step.

**Alternatives considered**:
- Per-step `working-directory: src/ai-genius-web` — redundant; job-level default is simpler (Constitution Principle 5).
- `npm --prefix src/ai-genius-web ci` from repo root — non-standard; harder to read.

---

## Decision 4: SWA Deploy Action Inputs (Pre-built Artifact)

**Question**: `Azure/static-web-apps-deploy@v1` can build the app itself or accept a pre-built output. Which mode applies here?

**Decision**: Use pre-built mode with `skip_app_build: true` and `output_location: dist`.

**Rationale**: The workflow explicitly builds the app with `npm run build` in a prior step (as required by FR-002, FR-003, FR-007). Letting the SWA action rebuild would be redundant and could produce a different build from a different Node.js version baked into the action. Setting `skip_app_build: true` and pointing `output_location: dist` (relative to `app_location`) prevents double-building and ensures the deployed artifact is exactly the one produced by the explicit build step.

**Key action inputs**:
| Input | Value | Reason |
|-------|-------|--------|
| `action` | `upload` | Deploy (not close PR environment) |
| `app_location` | `src/ai-genius-web` | Root of the frontend source |
| `output_location` | `dist` | Relative to `app_location`; Vite writes here |
| `skip_app_build` | `true` | Build already done by `npm run build` step |
| `azure_static_web_apps_api_token` | Runtime-fetched token | From `az staticwebapp secrets list` |

---

## Decision 5: Concurrency Strategy

**Question**: How should concurrent runs be handled when multiple pushes arrive in quick succession?

**Decision**: Use a `concurrency` group keyed to the branch name with `cancel-in-progress: true`.

```yaml
concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: true
```

**Rationale**: The spec (FR-010, Clarification) mandates that the newest commit always wins and an older in-flight run must be cancelled. This GitHub Actions native feature requires no additional tooling.

---

## Decision 6: Required Permissions

**Question**: What GitHub token permissions are needed for OIDC authentication?

**Decision**:
```yaml
permissions:
  id-token: write    # required for OIDC token exchange
  contents: read     # required for checkout
```

**Rationale**: `id-token: write` is required by GitHub's OIDC provider to issue a JWT that Azure will validate. Without it, `azure/login@v2` cannot request a token. `contents: read` is the minimum needed for `actions/checkout@v4`. No broader permissions are granted (least-privilege, Constitution Principle 1).

---

## All Design Unknowns Resolved

| Item | Resolution |
|------|-----------|
| SWA deployment token without stored secret | Fetch at runtime via Azure CLI after OIDC login |
| Node.js version | Pin to Node.js 20 via `actions/setup-node@v4` |
| npm command working directory | Job-level `defaults.run.working-directory: src/ai-genius-web` |
| SWA action build mode | `skip_app_build: true`, `output_location: dist` |
| Concurrency | `group: deploy-${{ github.ref }}`, `cancel-in-progress: true` |
| Required permissions | `id-token: write`, `contents: read` |
