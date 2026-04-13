# Quickstart: Frontend React App Deployment via GitHub Actions

**Feature**: `003-frontend-swa-deploy`  
**Date**: 2026-04-13

---

## Prerequisites

Before the workflow runs successfully, complete these one-time Azure and GitHub setup steps:

### 1. Azure — Federated Identity

```bash
# 1a. Create an Entra ID app registration (or use an existing one)
az ad app create --display-name "ai-genius-swa-deploy"

# 1b. Note the appId (client ID) from the output
APP_ID="<appId from above>"
TENANT_ID=$(az account show --query tenantId -o tsv)
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# 1c. Create a service principal for the app
az ad sp create --id $APP_ID

# 1d. Add a federated credential for GitHub Actions OIDC
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "github-oidc-main",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:qkfang/ai-genius-s4-ep2-speckit",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# 1e. Grant the service principal the "Static Web Apps Contributor" role
#     scoped to the specific SWA resource (least privilege)
SWA_RESOURCE_ID=$(az staticwebapp show \
  --name <your-swa-name> \
  --resource-group <your-resource-group> \
  --query id -o tsv)

az role assignment create \
  --assignee $APP_ID \
  --role "Static Web Apps Contributor" \
  --scope $SWA_RESOURCE_ID
```

### 2. GitHub — Repository Secrets

Add these three values as **Actions secrets** in the repository settings (`Settings → Secrets and variables → Actions → New repository secret`):

| Secret Name | Value |
|-------------|-------|
| `AZURE_CLIENT_ID` | `$APP_ID` from step 1a |
| `AZURE_TENANT_ID` | `$TENANT_ID` from step 1b |
| `AZURE_SUBSCRIPTION_ID` | `$SUBSCRIPTION_ID` from step 1b |

---

## Workflow File

Create `.github/workflows/deploy-web.yml` with the following content:

```yaml
name: Deploy Frontend to Azure Static Web Apps

on:
  push:
    branches:
      - main

concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: true

permissions:
  id-token: write
  contents: read

env:
  SWA_NAME: <your-static-web-app-name>
  SWA_RESOURCE_GROUP: <your-resource-group>

jobs:
  deploy:
    name: Build and Deploy
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: src/ai-genius-web

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build React app
        run: npm run build

      - name: Azure Login (OIDC)
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Fetch SWA deployment token
        id: get-token
        run: |
          TOKEN=$(az staticwebapp secrets list \
            --name "${{ env.SWA_NAME }}" \
            --resource-group "${{ env.SWA_RESOURCE_GROUP }}" \
            --query "properties.apiKey" -o tsv)
          echo "token=$TOKEN" >> "$GITHUB_OUTPUT"
        working-directory: ${{ github.workspace }}

      - name: Deploy to Azure Static Web Apps
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ steps.get-token.outputs.token }}
          action: upload
          app_location: src/ai-genius-web
          output_location: dist
          skip_app_build: true
```

> **Replace** `<your-static-web-app-name>` and `<your-resource-group>` with your actual Azure resource values in the `env:` block.

---

## Verify It Works

1. **Push to `main`**:
   ```bash
   git add .github/workflows/deploy-web.yml
   git commit -m "feat: add SWA deployment workflow"
   git push origin main
   ```

2. **Watch the run**: Navigate to `Actions` tab in GitHub → `Deploy Frontend to Azure Static Web Apps` → confirm all steps are green.

3. **Verify the site**: Open the Static Web App URL from the Azure portal — it should serve the React app.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `azure/login` fails with `AADSTS70011` | Federated credential subject mismatch | Verify the subject in step 1d matches exactly: `repo:qkfang/ai-genius-s4-ep2-speckit` |
| `az staticwebapp secrets list` — `AuthorizationFailed` | Service principal missing role | Re-run step 1e with the correct `--scope` |
| `npm ci` fails — `missing package-lock.json` | `package-lock.json` not committed | Run `npm install` locally, commit `package-lock.json` |
| Deploy action — `ResourceNotFound` | SWA resource name or RG wrong | Check `SWA_NAME` and `SWA_RESOURCE_GROUP` env vars in the workflow |
| Older run not cancelled | Concurrency group key mismatch | Confirm `group: deploy-${{ github.ref }}` is set |
