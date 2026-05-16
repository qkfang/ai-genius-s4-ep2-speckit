# Data Model: Frontend Web App Deployment via GitHub Actions

**Feature**: `002-deploy-web` | **Phase**: 1 Design

This feature is a GitHub Actions CI/CD workflow. There are no persistent data models or database entities. The "data" in this feature is configuration: workflow inputs, environment variables, secrets, and artifact paths.

---

## Workflow Configuration Schema

### Trigger Inputs (`workflow_dispatch`)

| Input | Type | Required | Default | Allowed Values | Description |
|-------|------|----------|---------|----------------|-------------|
| `environment` | `choice` | false | `dev` | `dev`, `qa`, `prod` | Target deployment environment |

### Environment Variables (job-level `env`)

| Variable | Source | Value | Description |
|----------|--------|-------|-------------|
| `ENVIRONMENT` | `github.event.inputs.environment || 'dev'` | `dev` / `qa` / `prod` | Resolved target environment |

### GitHub Secrets (consumed)

| Secret | Scope | Description |
|--------|-------|-------------|
| `AZURE_CREDENTIALS` | Repository | Service principal JSON for `azure/login@v1` |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Repository | Deployment token for `Azure/static-web-apps-deploy@v1` |

### GitHub Variables (consumed)

| Variable | Scope | Example | Description |
|----------|-------|---------|-------------|
| `VITE_API_URL` | Per-environment (`dev`, `qa`, `prod`) | `https://aigenius4-api-dev.azurewebsites.net` | Backend API URL baked into the Vite build |

### Build Artifact

| Property | Value | Description |
|----------|-------|-------------|
| Source directory | `src/ai-genius-web/` | React + Vite application root |
| Build command | `npm run build` | Runs `vite build` → outputs to `dist/` |
| Output directory | `src/ai-genius-web/dist/` | Pre-built static files passed to SWA action |

---

## Workflow Job Schema

### Job: `deploy`

| Property | Value |
|----------|-------|
| `runs-on` | `ubuntu-latest` |
| `environment` | `${{ github.event.inputs.environment || 'dev' }}` |
| Node.js version | `20` |
| Cache key | Keyed on `src/ai-genius-web/package-lock.json` |

### Concurrency

| Property | Value |
|----------|-------|
| `group` | `${{ github.workflow }}-${{ github.ref }}` |
| `cancel-in-progress` | `true` |

---

## State Transitions

```
[push to main / workflow_dispatch]
        │
        ▼
[Resolve environment: dev | qa | prod]
        │
        ▼
[Checkout code]
        │
        ▼
[Setup Node 20 + restore npm cache]
        │
        ▼
[npm ci  ──FAIL──► pipeline halts; live site unchanged]
        │ OK
        ▼
[npm run build (VITE_API_URL injected) ──FAIL──► pipeline halts; live site unchanged]
        │ OK
        ▼
[azure/login@v1 ──FAIL──► pipeline halts; no deployment]
        │ OK
        ▼
[Azure/static-web-apps-deploy@v1 ──FAIL──► pipeline halts; SWA atomic — previous version live]
        │ OK
        ▼
[Deployment committed — new version live]
```

---

## Validation Rules

| Rule | Enforcement | Failure behaviour |
|------|-------------|-------------------|
| `npm ci` must succeed | Default step failure propagation | Pipeline stops; no build artifact |
| `npm run build` must exit 0 | Default step failure propagation | Pipeline stops; `dist/` not passed to SWA action |
| `AZURE_CREDENTIALS` must be valid JSON | `azure/login@v1` validates on use | Step fails; no deployment |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` must be valid | `Azure/static-web-apps-deploy@v1` validates on use | Step fails; SWA atomic — previous version remains live |
| `VITE_API_URL` must be set for the environment | GitHub Environment variable must exist | `vite build` embeds an empty/undefined string; deploy still proceeds but frontend API calls will fail |
