# Data Model: Frontend Static Web App Deployment

**Phase**: 1 — Design  
**Feature**: `003-frontend-swa-deploy`

---

## Overview

This feature is a CI/CD workflow — there is no application data model or database schema. The "entities" are the GitHub Actions workflow components and the configuration values that flow through the pipeline.

---

## Workflow Entities

### WorkflowFile

The GitHub Actions YAML file that defines the entire CI/CD pipeline.

| Field | Value |
|-------|-------|
| Path | `.github/workflows/002-deploy-web.yml` |
| Name | `002 Deploy Web to Azure` |
| Triggers | `push` to `main`, `workflow_dispatch` |

---

### WorkflowInput (workflow_dispatch only)

| Field | Type | Required | Default | Valid Values |
|-------|------|----------|---------|--------------|
| `environment` | choice | true | `dev` | `dev`, `qa`, `prod` |

---

### WorkflowEnv (top-level env block)

Environment variables resolved once at workflow start.

| Variable | Source | Value Expression |
|----------|--------|-----------------|
| `ENVIRONMENT` | Derived | `${{ github.event.inputs.environment \|\| 'dev' }}` |

---

### Job: `deploy`

Single job that runs all steps sequentially.

| Field | Value |
|-------|-------|
| Runs-on | `ubuntu-latest` |
| Environment | `${{ github.event.inputs.environment \|\| 'dev' }}` |
| Dependency | None (only job) |

---

### Steps

| # | Step Name | Action / Command | Key Inputs | Failure Behaviour |
|---|-----------|-----------------|-----------|-------------------|
| 1 | Checkout code | `actions/checkout@v4` | — | Stops workflow |
| 2 | Set up Node.js | `actions/setup-node@v4` | `node-version: '20'`, `cache: npm` | Stops workflow |
| 3 | Install dependencies | `npm ci` (in `src/ai-genius-web`) | — | Stops workflow; no deploy |
| 4 | Prepare .env | `cp .env.example .env` + `sed -i` | `vars.VITE_API_URL` | Stops workflow; no deploy |
| 5 | Build application | `npm run build` (in `src/ai-genius-web`) | — | Stops workflow; no deploy (FR-009) |
| 6 | Azure Login | `azure/login@v1` | `secrets.AZURE_CREDENTIALS` | Stops workflow |
| 7 | Deploy to SWA | `Azure/static-web-apps-deploy@v1` | `secrets.AZURE_STATIC_WEB_APPS_API_TOKEN` | Stops workflow; reports failure |

---

### Secrets

Secrets are stored in GitHub repository / environment settings and injected at runtime. Never exposed in logs.

| Secret Name | Used In Step | Purpose |
|-------------|-------------|---------|
| `AZURE_CREDENTIALS` | Step 6 | Service principal JSON for `azure/login@v1` |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Step 7 | SWA deployment token |
| `GITHUB_TOKEN` | Step 7 | Auto-provided by GitHub Actions for SWA action |

---

### Variables (GitHub Actions `vars.*`)

Repository or environment variables (not secrets — safe to echo in logs).

| Variable Name | Used In Step | Purpose |
|---------------|-------------|---------|
| `VITE_API_URL` | Step 4 | Backend API base URL injected into Vite build (e.g., `https://aigenius4-api-dev.azurewebsites.net`) |

---

### Build Artifact

The compiled output produced by Step 5. Consumed directly by Step 7.

| Field | Value |
|-------|-------|
| Location | `src/ai-genius-web/dist/` |
| Contents | Static HTML, JS, CSS bundles |
| Lifetime | Ephemeral (GitHub Actions runner; not uploaded as artifact) |

---

## State Transitions

```
[Push to main / workflow_dispatch]
        │
        ▼
  Checkout → Setup Node → npm ci → Prepare .env → npm run build
                                                          │
                                               ┌──────────┴──────────┐
                                          build fails            build succeeds
                                               │                     │
                                          ✗ Fail             azure/login@v1
                                          (no deploy)               │
                                                              SWA Deploy
                                                                     │
                                                            ✓ Success (site live)
```

---

## Validation Rules

- `VITE_API_URL` must be set in `vars` for the target environment; empty value produces a broken API URL in the build
- `dist/` directory must be non-empty after build; if empty, `Azure/static-web-apps-deploy@v1` will fail (FR-007 implicit guard)
- Both `AZURE_CREDENTIALS` and `AZURE_STATIC_WEB_APPS_API_TOKEN` must be present and valid; missing secrets cause immediate step failure
