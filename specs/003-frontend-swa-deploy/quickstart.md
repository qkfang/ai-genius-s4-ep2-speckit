# Quickstart: Frontend Static Web App Deployment

**Feature**: `003-frontend-swa-deploy`

---

## Prerequisites

Before the workflow can run successfully, the following must be in place:

1. **Azure Static Web App** provisioned (via `001-deploy-infra.yml` or manually)
2. **GitHub Secrets** configured in the repository or per-environment:
   - `AZURE_CREDENTIALS` — Azure service principal JSON
   - `AZURE_STATIC_WEB_APPS_API_TOKEN` — SWA deployment token (from Azure Portal → Static Web App → Manage deployment token)
3. **GitHub Variable** configured per environment (`dev`, `qa`, `prod`):
   - `VITE_API_URL` — e.g., `https://aigenius4-api-dev.azurewebsites.net`
4. **Branch**: `003-frontend-swa-deploy` merged to `main` (or PR approved)

---

## Build the Workflow File

The implementation task creates `.github/workflows/002-deploy-web.yml`. The complete workflow:

```yaml
name: 002 Deploy Web to Azure

on:
  push:
    branches: [main]
  workflow_dispatch:
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

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  ENVIRONMENT: ${{ github.event.inputs.environment || 'dev' }}

jobs:
  deploy:
    name: Build and Deploy Frontend
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment || 'dev' }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: src/ai-genius-web/package-lock.json

      - name: Install dependencies
        working-directory: src/ai-genius-web
        run: npm ci

      - name: Prepare .env
        working-directory: src/ai-genius-web
        run: |
          cp .env.example .env
          sed -i 's|^VITE_API_URL=.*|VITE_API_URL=${{ vars.VITE_API_URL }}|' .env

      - name: Build application
        working-directory: src/ai-genius-web
        run: npm run build

      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Deploy to Azure Static Web Apps
        uses: Azure/static-web-apps-deploy@v1
        with:
          action: upload
          app_location: src/ai-genius-web/dist
          output_location: ""
          skip_app_build: true
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
```

---

## Triggering the Workflow

### Automatic (every push to `main`)

```bash
git push origin main
```

Navigate to **GitHub → Actions → 002 Deploy Web to Azure** to observe the run.

### Manual (specific environment)

1. Go to **GitHub → Actions → 002 Deploy Web to Azure**
2. Click **Run workflow**
3. Select environment: `dev`, `qa`, or `prod`
4. Click **Run workflow**

---

## Verifying the Deployment

1. The workflow run completes with all green steps
2. Open the Azure Portal → navigate to the Static Web App resource
3. Find the **URL** (e.g., `https://<unique-id>.azurestaticapps.net`)
4. Open the URL — the React app loads with the correct API endpoint

Alternatively, check the SWA deployment history in Azure Portal → Static Web App → **Deployments**.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `npm ci` fails: `ENOENT package-lock.json` | `package-lock.json` not committed | Run `npm install` locally, commit `package-lock.json` |
| Build fails: `VITE_API_URL` undefined | `vars.VITE_API_URL` not set for environment | Add variable in GitHub → Settings → Environments → `dev` |
| Azure login fails: `AADSTS…` | `AZURE_CREDENTIALS` secret invalid or expired | Regenerate service principal credentials |
| SWA deploy fails: `401 Unauthorized` | `AZURE_STATIC_WEB_APPS_API_TOKEN` invalid | Refresh token from Azure Portal → SWA → Manage deployment token |
| Site loads but API calls fail (CORS / 404) | `VITE_API_URL` set to wrong value | Check `vars.VITE_API_URL` in GitHub environment settings |
| Two pushes — both workflows run | Concurrency not cancelling | Verify `cancel-in-progress: true` is in the YAML |

---

## Local Build Verification

To reproduce the CI build locally before pushing:

```bash
cd src/ai-genius-web
cp .env.example .env
# edit .env: set VITE_API_URL=http://localhost:3000
npm ci
npm run build
# dist/ folder should be produced
```
