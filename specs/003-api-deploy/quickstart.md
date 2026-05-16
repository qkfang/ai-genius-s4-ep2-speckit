# Quickstart: 003-api-deploy

**Feature**: `003-api-deploy`  
**Audience**: Developers and operators triggering or troubleshooting the API deploy pipeline.

## Prerequisites

- The Azure infrastructure for the target environment is already provisioned by `001-deploy-infra.yml` (App Service Plan + App Service exist).
- Repository secret `AZURE_CREDENTIALS` is configured (service principal JSON).
- For each GitHub environment (`dev`, `qa`, `prod`), the variable `APP_SERVICE_NAME` is set to the matching App Service resource name (e.g., `aigenius4-api-dev`).

## Trigger options

### 1. Automatic (push to `main`)

```bash
git commit -m "feat(api): new endpoint"
git push origin main
```

The workflow `003 Deploy API to Azure` runs against the `dev` GitHub environment.

### 2. Manual (workflow_dispatch)

1. Open **Actions → 003 Deploy API to Azure → Run workflow**.
2. Pick `dev`, `qa`, or `prod`.
3. Click **Run workflow**.

## Verify a deployment

```bash
# Replace with the App Service hostname from the GitHub variable APP_SERVICE_NAME
curl -i https://aigenius4-api-dev.azurewebsites.net/
```

A `200 OK` response with the latest code's behaviour confirms a successful deploy.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `dotnet publish` fails | Compilation error introduced by the latest commit | Fix the build locally; push again. |
| `azure/login@v1` fails | `AZURE_CREDENTIALS` missing or service principal lacks role | Re-create the secret with valid JSON; grant the SP `Contributor` on the resource group. |
| `azure/webapps-deploy@v3` fails with "resource not found" | `APP_SERVICE_NAME` mismatches the environment | Update the per-environment GitHub variable to the actual resource name. |
| Newer push cancels older run | Expected — concurrency group cancels in-flight runs | Re-trigger after the newer run finishes if needed. |
