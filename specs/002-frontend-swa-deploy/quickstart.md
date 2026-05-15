# Quickstart: Frontend Static Web App CI/CD Deployment

**Branch**: `002-frontend-swa-deploy` | **Date**: 2026-05-16

This guide covers the one-time setup required to make the `deploy-web.yml` workflow operational, followed by the day-to-day developer experience.

---

## Prerequisites

- Azure Static Web App resource already provisioned (via `deploy-infra.yml` or manually)
- Azure App Registration created with OIDC federated credentials configured (see below)
- Repository admin access to configure GitHub Secrets and Variables

---

## One-Time Setup

### 1. Create the Federated Credential on the App Registration

In the Azure Portal (or CLI), add a federated credential to your App Registration:

```bash
az ad app federated-credential create \
  --id <app-registration-object-id> \
  --parameters '{
    "name": "github-main",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:qkfang/ai-genius-s4-ep2-speckit:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

### 2. Assign the Role to the Federated Identity

Scope the `Static Web Apps Contributor` role to the specific SWA resource:

```bash
SWA_ID=$(az staticwebapp show --name <swa-name> --resource-group <rg> --query id -o tsv)

az role assignment create \
  --assignee <client-id> \
  --role "Static Web Apps Contributor" \
  --scope "$SWA_ID"
```

### 3. Configure GitHub Secrets

In **Settings > Secrets and variables > Actions > Secrets**, add:

| Secret | Value |
|--------|-------|
| `AZURE_CLIENT_ID` | App Registration client ID |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |

### 4. Configure GitHub Variables

In **Settings > Secrets and variables > Actions > Variables**, add:

| Variable | Example Value |
|----------|--------------|
| `VITE_API_URL` | `https://api.aigenius.example.com` |
| `SWA_NAME` | `swa-aigenius-prod` |
| `AZURE_RG` | `rg-aigenius-prod` |

---

## Day-to-Day: Deploying Frontend Changes

1. Make changes in `src/ai-genius-web/`.
2. Commit and push to `main`.
3. Navigate to **Actions** tab in the repository.
4. The `Deploy Web to Azure Static Web Apps` workflow starts automatically.
5. The pipeline installs dependencies, builds the React app, and deploys `dist/` to the SWA.
6. On success, a green check appears on the commit. The live site reflects your changes within 3 minutes.

---

## Verifying a Deployment

```bash
# Check the SWA URL
az staticwebapp show --name <swa-name> --resource-group <rg> --query "defaultHostname" -o tsv
# → swa-aigenius-prod.azurestaticapps.net
```

Open the URL in a browser. You should see the updated React application.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `Error: AADSTS70021` | Federated credential subject mismatch | Verify the subject on the App Registration matches `repo:qkfang/ai-genius-s4-ep2-speckit:ref:refs/heads/main` |
| `npm ci` fails: `missing package-lock.json` | Lockfile not committed | Run `npm install` locally and commit `package-lock.json` |
| Deploy step fails: `Unauthorized` | Missing or incorrect role assignment | Re-run step 2 above; verify `Static Web Apps Contributor` is scoped to the SWA resource |
| `VITE_API_URL` not defined in built bundle | Variable not set in GitHub | Add `VITE_API_URL` as a repository variable (step 4 above) |
| Previous deployment still showing after push | Concurrency cancelled in-progress run | Wait for the latest workflow run to complete; the previous run was superseded |
