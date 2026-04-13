# Data Model: Frontend React App Deployment via GitHub Actions

**Phase**: 1 — Design & Contracts  
**Feature**: `003-frontend-swa-deploy`  
**Date**: 2026-04-13

---

## Entities

### 1. Workflow Run

A single execution of the GitHub Actions pipeline, created when a push event fires on `main`.

| Field | Type | Description |
|-------|------|-------------|
| `run_id` | string | GitHub-assigned unique identifier for the run |
| `trigger_sha` | string | Git commit SHA that triggered the run |
| `branch` | string | Always `main` for production runs |
| `status` | enum | `queued` → `in_progress` → `success` \| `failure` \| `cancelled` |
| `started_at` | datetime | UTC timestamp when the runner picked up the job |
| `completed_at` | datetime | UTC timestamp when the last step finished |
| `cancel_reason` | string \| null | `"superseded_by_newer_push"` when cancelled by concurrency group; null otherwise |

**State Transitions**:
```
queued → in_progress → success
                     → failure    (build error or deploy error)
                     → cancelled  (cancel-in-progress by newer run)
```

**Validation Rules**:
- A run that reaches `failure` at the build step MUST NOT transition to deployment (FR-007).
- A run that reaches `cancelled` leaves the previously deployed version intact.

---

### 2. Build Artifact

The compiled, production-ready static files produced by `npm run build` inside `src/ai-genius-web`.

| Field | Type | Description |
|-------|------|-------------|
| `source_root` | path | `src/ai-genius-web` — the working directory for npm |
| `output_dir` | path | `src/ai-genius-web/dist/` — Vite's output; relative `dist` |
| `build_command` | string | `npm run build` (delegates to `vite build`) |
| `node_version` | string | `20` — pinned via `actions/setup-node@v4` |
| `install_command` | string | `npm ci` — reproducible clean install, no caching |

**Validation Rules**:
- `dist/` MUST contain an `index.html`; absence indicates a failed build.
- The artifact is ephemeral — deleted when the runner terminates. It is never uploaded as a GitHub Actions artifact or committed to the repository.

---

### 3. Azure Static Web App (Hosting Target)

The Azure resource that serves the built frontend publicly.

| Field | Type | Description |
|-------|------|-------------|
| `resource_name` | string | Configured as `SWA_NAME` env var in the workflow |
| `resource_group` | string | Configured as `SWA_RESOURCE_GROUP` env var in the workflow |
| `deployment_token` | string (runtime) | Fetched at runtime via `az staticwebapp secrets list`; never persisted |
| `public_url` | string | The Static Web App's assigned `*.azurestaticapps.net` URL |

---

### 4. Federated Identity

The Azure identity (Entra ID app registration or managed identity) trusted by GitHub for OIDC.

| Field | Type | Description |
|-------|------|-------------|
| `client_id` | string | Stored as `AZURE_CLIENT_ID` GitHub secret (configuration, not a credential) |
| `tenant_id` | string | Stored as `AZURE_TENANT_ID` GitHub secret |
| `subscription_id` | string | Stored as `AZURE_SUBSCRIPTION_ID` GitHub secret |
| `federation_subject` | string | `repo:qkfang/ai-genius-s4-ep2-speckit` — scoped to whole repo |
| `token_lifetime` | duration | Short-lived; valid only for the duration of the workflow run |

---

### 5. GitHub Secrets (Configuration Store)

| Secret Name | Credential? | Value |
|-------------|-------------|-------|
| `AZURE_CLIENT_ID` | No — public config | Entra app registration client ID |
| `AZURE_TENANT_ID` | No — public config | Azure tenant ID |
| `AZURE_SUBSCRIPTION_ID` | No — public config | Azure subscription ID |

> No credential secrets (passwords, tokens, keys) are stored in the repository. The SWA deployment token is fetched at runtime and exists only in memory for the duration of the step.

---

## Key Relationships

```
Push to main
    │
    ▼
Workflow Run ──[uses]──▶ Federated Identity
    │                         │
    │                    [OIDC exchange]
    │                         │
    │                    Azure Login (azure/login@v2)
    │                         │
    │                    [fetches at runtime]
    │                         │
    ├──[produces]──▶ Build Artifact
    │                    │
    │               [deployed by]
    │                    │
    └──────────────▶ Azure Static Web App ──[serves]──▶ Public URL
```

---

## State Machine: Workflow Step Sequence

```
[checkout] → [setup-node:20] → [npm ci] → [npm run build]
                                               │
                                         ┌─────┴──────┐
                                       FAIL          PASS
                                         │              │
                                   [mark FAILED]  [azure/login OIDC]
                                                       │
                                               [fetch SWA token]
                                                       │
                                           [swa-deploy upload]
                                                       │
                                                 ┌─────┴──────┐
                                               FAIL          PASS
                                                 │              │
                                          [mark FAILED]  [mark SUCCESS]
```
