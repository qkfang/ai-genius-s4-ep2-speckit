# Quickstart: Frontend Web App Deployment via GitHub Actions

**Feature**: `002-deploy-web`

---

## Prerequisites

1. Azure Static Web App resource provisioned (by `001-deploy-infra` workflow or manually).
2. GitHub repository secrets configured:
   - `AZURE_CREDENTIALS` — service principal JSON
   - `AZURE_STATIC_WEB_APPS_API_TOKEN` — Static Web App deployment token
3. GitHub Environments (`dev`, `qa`, `prod`) created with `VITE_API_URL` variable set on each.

---

## Local Build (verify before CI)

```bash
cd src/ai-genius-web
npm ci
VITE_API_URL=https://aigenius4-api-dev.azurewebsites.net npm run build
# Verify: dist/ directory is created and non-empty
ls dist/
```

---

## Trigger the Workflow

### Automatic (push to main)
```bash
git push origin main
# → Workflow triggers automatically; defaults to 'dev' environment
```

### Manual (workflow_dispatch)
1. Go to **GitHub Actions** → **002 Deploy Web to Azure**
2. Click **Run workflow**
3. Select environment: `dev` / `qa` / `prod`
4. Click **Run workflow**

---

## Verify Deployment

1. Open the Azure portal → Static Web Apps → your app → **Overview**
2. Click the **URL** to confirm the updated frontend is live.
3. Or use the Azure CLI:
   ```bash
   az staticwebapp show \
     --name <your-swa-name> \
     --resource-group <your-resource-group> \
     --query "defaultHostname" -o tsv
   ```

---

## Troubleshoot Common Issues

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Build fails with `VITE_API_URL is not defined` | GitHub Environment variable not set | Add `VITE_API_URL` to the target GitHub Environment |
| SWA deploy fails with `401 Unauthorized` | `AZURE_STATIC_WEB_APPS_API_TOKEN` missing or expired | Regenerate the token in the Azure portal and update the secret |
| Azure login fails | `AZURE_CREDENTIALS` malformed | Verify JSON structure: `clientId`, `clientSecret`, `subscriptionId`, `tenantId` |
| Old run still in progress when new push arrives | Expected behaviour | Concurrency group cancels the older run automatically |
| `dist/` is empty after build | Build error silently swallowed | Check `npm run build` output; ensure no `VITE_*` env var causes a compile error |
