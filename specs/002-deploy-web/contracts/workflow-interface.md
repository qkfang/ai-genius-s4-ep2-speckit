# Workflow Interface Contract: 002-deploy-web

**Feature**: `002-deploy-web`  
**Workflow file**: `.github/workflows/002-deploy-web.yml`  
**Phase**: 1 Design

---

## Inputs

### `workflow_dispatch` Inputs

```yaml
inputs:
  environment:
    description: "Target environment"
    required: true
    default: "dev"
    type: choice
    options:
      - dev
      - qa
      - prod
```

### Push Trigger

```yaml
on:
  push:
    branches: [main]
```

No explicit inputs for push events; `environment` defaults to `dev`.

---

## Consumed Secrets

| Secret Name | Type | Required | Description |
|-------------|------|----------|-------------|
| `AZURE_CREDENTIALS` | Repository secret | Yes | Service principal JSON with `clientId`, `clientSecret`, `subscriptionId`, `tenantId` |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Repository secret | Yes | Azure Static Web Apps deployment token |
| `GITHUB_TOKEN` | Auto-provided | Yes | Used by `Azure/static-web-apps-deploy@v1` for PR staging environments |

---

## Consumed Variables

| Variable Name | Scope | Required | Example | Description |
|---------------|-------|----------|---------|-------------|
| `VITE_API_URL` | GitHub Environment (`dev`/`qa`/`prod`) | Yes | `https://aigenius4-api-dev.azurewebsites.net` | Backend API URL baked into the Vite bundle at build time |

---

## Outputs

This workflow produces no step outputs or job outputs. The deployment result is observable via:
- GitHub Actions run status (success / failure)
- Azure Static Web Apps portal URL

---

## Concurrency

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

---

## Job: `deploy`

```yaml
jobs:
  deploy:
    name: Build and Deploy Frontend
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment || 'dev' }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: src/ai-genius-web/package-lock.json
      - run: npm ci
        working-directory: src/ai-genius-web
      - run: npm run build
        working-directory: src/ai-genius-web
        env:
          VITE_API_URL: ${{ vars.VITE_API_URL }}
      - uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      - uses: Azure/static-web-apps-deploy@v1
        with:
          action: upload
          app_location: src/ai-genius-web/dist
          output_location: ""
          skip_app_build: true
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
```

---

## Failure Behaviour

| Step | Failure Result |
|------|---------------|
| `npm ci` fails | Pipeline halts; no build artifact; live site unchanged |
| `npm run build` fails | Pipeline halts; `dist/` not produced; live site unchanged |
| `azure/login@v1` fails | Pipeline halts; no deployment |
| `Azure/static-web-apps-deploy@v1` fails | Pipeline halts; SWA atomic deployment — previous version remains live |

---

## Environment Promotion Path

```
dev (automatic on push to main)
  └─► qa (workflow_dispatch, optional protection rules)
        └─► prod (workflow_dispatch, optional protection rules)
```
