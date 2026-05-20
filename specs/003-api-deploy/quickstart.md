# Quickstart: Backend API Deployment

End-to-end guide for the `003 Deploy API to Azure` workflow.

---

## 1. Prerequisites

Before the workflow can run successfully, ensure the following are in place:

### Azure side

- An Azure subscription with an existing App Service Plan (Linux B1) and Web App.
  These are provisioned by the `001 Deploy Infra` workflow (`bicep/main.bicep`).
- A service principal (or managed identity) with `Contributor` rights on the
  target resource group, e.g. `rg-aigenius4-dev`.

### GitHub side

| Kind | Name | Scope | Example value |
|------|------|-------|---------------|
| Secret | `AZURE_CREDENTIALS` | Repository | `{ "clientId": "...", "clientSecret": "...", "subscriptionId": "...", "tenantId": "..." }` |
| Variable | `APP_SERVICE_NAME` | Environment `dev` | `aigenius4-api-dev` |
| Variable | `APP_SERVICE_NAME` | Environment `qa` | `aigenius4-api-qa` |
| Variable | `APP_SERVICE_NAME` | Environment `prod` | `aigenius4-api-prod` |

Configure GitHub Environments (`dev`, `qa`, `prod`) under
**Settings → Environments**. Add the `APP_SERVICE_NAME` variable to each one,
and (optionally) add required reviewers for `qa` and `prod`.

---

## 2. Trigger the workflow

### a) Automatic — push to `main`

```bash
git commit --allow-empty -m "chore: trigger API deploy"
git push origin main
```

This deploys to the `dev` environment by default.

### b) Manual — `workflow_dispatch`

1. Open **Actions → 003 Deploy API to Azure**.
2. Click **Run workflow**.
3. Select branch `main` and the target `environment` (`dev`, `qa`, or `prod`).
4. Click **Run workflow**.

### c) Manual — GitHub CLI

```bash
gh workflow run "003 Deploy API to Azure" \
  --ref main \
  -f environment=qa
```

---

## 3. What the workflow does

```
checkout
  → setup-dotnet@v4 (10.0.x)
  → dotnet publish src/ai-genius-api/ai-genius-api.csproj
        -c Release -r linux-x64 --self-contained true -o ./publish
  → zip ./publish → publish.zip
  → azure/login@v1 (creds: AZURE_CREDENTIALS)
  → azure/webapps-deploy@v3 (app-name: vars.APP_SERVICE_NAME, package: ./publish.zip)
```

Each step fails the entire job on non-zero exit. The concurrency group
(`${{ github.workflow }}-${{ github.ref }}` with `cancel-in-progress: true`)
cancels in-flight runs when a newer commit lands on the same branch.

---

## 4. Validate the deployment

1. Confirm the workflow run completed with a green check.
2. Visit the App Service URL, e.g. `https://aigenius4-api-dev.azurewebsites.net/`.
3. Optional — check the deployed package via Azure CLI:

   ```bash
   az webapp show \
     --name aigenius4-api-dev \
     --resource-group rg-aigenius4-dev \
     --query "{state:state, defaultHostName:defaultHostName}"
   ```

---

## 5. Local dry-run (before pushing)

Run the same publish command locally to catch build errors early:

```bash
cd src/ai-genius-api
dotnet publish ai-genius-api.csproj \
  -c Release -r linux-x64 --self-contained true -o ./publish
```

If this succeeds locally, the workflow's build step will succeed too.

---

## 6. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `dotnet publish` fails | Compile error in `src/ai-genius-api` | Run the publish command locally; fix the build. |
| `setup-dotnet` cannot find `10.0.x` | Runner image regressed | Re-run the workflow; the action caches and resolves SDKs from `dotnet.microsoft.com`. |
| `azure/login@v1` fails | `AZURE_CREDENTIALS` missing or expired | Recreate the service principal and update the secret. |
| `webapps-deploy` reports "app not found" | `APP_SERVICE_NAME` empty or wrong env | Set the variable on the matching GitHub Environment. |
| Workflow cancelled mid-run | Newer commit triggered cancellation | This is expected (`cancel-in-progress: true`). Latest commit will deploy. |
| 5xx on the deployed App Service | Self-contained payload mismatched OS/arch | Confirm `-r linux-x64` and Linux App Service Plan. |

---

## 7. Related workflows

| Workflow | File | Purpose |
|----------|------|---------|
| 001 Deploy Infra | `.github/workflows/001-deploy-infra.yml` | Provisions Azure resources (must run first). |
| 003 Deploy API   | `.github/workflows/003-deploy-api.yml`   | This workflow — deploys the .NET API. |
