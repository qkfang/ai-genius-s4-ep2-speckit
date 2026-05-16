# Workflow Interface Contract: 002-deploy-web

**Feature**: `003-frontend-swa-deploy`  
**Contract Type**: GitHub Actions Workflow Interface  
**File**: `.github/workflows/002-deploy-web.yml`

---

## Triggers

### Automatic Trigger

| Trigger | Condition |
|---------|-----------|
| `push` | Branch matches `main` |

### Manual Trigger (`workflow_dispatch`)

| Input | Type | Required | Default | Options |
|-------|------|----------|---------|---------|
| `environment` | `choice` | `true` | `dev` | `dev`, `qa`, `prod` |

---

## Inputs Consumed

### GitHub Secrets (must be configured in repo/environment settings)

| Secret | Scope | Description |
|--------|-------|-------------|
| `AZURE_CREDENTIALS` | Repository or Environment | Service principal JSON (`{"clientId":…}`) for `azure/login@v1` |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Repository or Environment | Deployment token from Azure Static Web Apps resource |
| `GITHUB_TOKEN` | Auto-injected | GitHub-provided token for SWA action authentication |

### GitHub Variables (must be configured per environment)

| Variable | Scope | Example Value | Description |
|----------|-------|---------------|-------------|
| `VITE_API_URL` | Environment (`dev`/`qa`/`prod`) | `https://aigenius4-api-dev.azurewebsites.net` | Backend API base URL injected into the Vite build |

### Source Files (must exist in repository)

| File | Required | Description |
|------|----------|-------------|
| `src/ai-genius-web/package-lock.json` | Yes | Enables `npm ci` and `actions/setup-node` caching |
| `src/ai-genius-web/.env.example` | Yes | Template with `VITE_API_URL=` line; copied and patched at CI runtime |
| `src/ai-genius-web/package.json` | Yes | Must define `"build": "vite build"` script |

---

## Outputs Produced

| Output | Description |
|--------|-------------|
| Live Azure Static Web App | The compiled React app is published to the SWA resource linked to `AZURE_STATIC_WEB_APPS_API_TOKEN` |

*No workflow outputs are emitted to the GitHub Actions context; deployment is a side-effect.*

---

## Concurrency Contract

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

- Two simultaneous runs against the same ref (branch) will cancel the older run.
- Runs against different refs (branches) are independent.
- A `workflow_dispatch` run on `main` and a `push` to `main` share the same concurrency group and will cancel each other.

---

## Environment Contract

The job runs under the GitHub Environment matching the selected (or default) value:

```
${{ github.event.inputs.environment || 'dev' }}
```

Environment protection rules (e.g., required reviewers for `prod`) are enforced by GitHub before the job starts.

---

## Failure Contract

| Failure Point | Behaviour |
|---------------|-----------|
| `npm ci` fails | Workflow stops; no build; no deploy |
| `.env` patch fails (missing `VITE_API_URL` var) | `sed` succeeds but injects empty URL; build proceeds with blank API base — treated as misconfiguration, not workflow failure |
| `npm run build` fails | Workflow stops; no deploy (satisfies FR-009, SC-004) |
| `azure/login@v1` fails (bad credentials) | Workflow stops; no deploy |
| `Azure/static-web-apps-deploy@v1` fails (bad token, empty dist) | Workflow stops; reports failure; no partial deploy |

---

## Action Version Contract

All action versions are pinned to avoid breaking changes from upstream updates.

| Action | Pinned Version |
|--------|---------------|
| `actions/checkout` | `v4` |
| `actions/setup-node` | `v4` |
| `azure/login` | `v1` |
| `Azure/static-web-apps-deploy` | `v1` |

---

## Deployment Parameters Contract

Parameters passed to `Azure/static-web-apps-deploy@v1`:

| Parameter | Value | Notes |
|-----------|-------|-------|
| `action` | `upload` | Deploy mode |
| `app_location` | `src/ai-genius-web/dist` | Pre-built output directory |
| `output_location` | `""` | Not used when `skip_app_build: true` |
| `skip_app_build` | `true` | Prevents SWA action from re-running the build |
| `repo_token` | `${{ secrets.GITHUB_TOKEN }}` | Required by SWA action |
| `azure_static_web_apps_api_token` | `${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}` | Deployment authentication |
