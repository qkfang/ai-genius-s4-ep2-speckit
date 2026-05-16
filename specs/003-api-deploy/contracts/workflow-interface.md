# Workflow Interface Contract: 003-deploy-api.yml

**Feature**: `003-api-deploy`  
**File**: `.github/workflows/003-deploy-api.yml`

## Triggers

```yaml
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
        options: [dev, qa, prod]
```

## Concurrency

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

## Environment Variables (workflow-level)

```yaml
env:
  ENVIRONMENT: ${{ github.event.inputs.environment || 'dev' }}
```

## Job: `deploy-api`

| Field | Value |
|-------|-------|
| `runs-on` | `ubuntu-latest` |
| `environment` | `${{ github.event.inputs.environment || 'dev' }}` |

### Steps (in order)

| # | Name | Action / Command | Required Inputs |
|---|------|------------------|-----------------|
| 1 | Checkout | `actions/checkout@v4` | — |
| 2 | Setup .NET | `actions/setup-dotnet@v4` | `dotnet-version: 10.0.x` |
| 3 | Publish API | `dotnet publish src/ai-genius-api/ai-genius-api.csproj -c Release -r linux-x64 --self-contained true -o ./publish` | — |
| 4 | Zip publish output | `cd publish && zip -r ../publish.zip .` (or equivalent) | — |
| 5 | Azure login | `azure/login@v1` | `creds: ${{ secrets.AZURE_CREDENTIALS }}` |
| 6 | Deploy to App Service | `azure/webapps-deploy@v3` | `app-name: ${{ vars.APP_SERVICE_NAME }}`, `package: ./publish.zip` |

## Required Secrets

- `AZURE_CREDENTIALS` — service principal JSON.

## Required Variables (per GitHub environment)

- `APP_SERVICE_NAME` — Azure App Service resource name for the environment.

## Failure Modes

| Failing step | Effect |
|--------------|--------|
| Publish | Workflow stops before login; no Azure call made. |
| Zip | Workflow stops before login; no Azure call made. |
| Azure login | Workflow stops before deploy; no App Service mutation. |
| Deploy | App Service may be left on the previous good slot/release; workflow run marked failed. |
