# Contract: `.github/workflows/003-deploy-api.yml`

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

## Job

- **runs-on**: `ubuntu-latest`
- **environment**: `${{ github.event.inputs.environment || 'dev' }}`

## Ordered Steps

1. `actions/checkout@v4`
2. `actions/setup-dotnet@v4` with `dotnet-version: 10.0.x`
3. `dotnet publish src/ai-genius-api/ai-genius-api.csproj -c Release -r linux-x64 --self-contained true -o ./publish`
4. `cd publish && zip -r ../publish.zip .`
5. `azure/login@v1` with `creds: ${{ secrets.AZURE_CREDENTIALS }}`
6. `azure/webapps-deploy@v3` with `app-name: ${{ vars.APP_SERVICE_NAME }}`, `package: ./publish.zip`

## Required Environment Configuration

| Scope | Name | Kind | Purpose |
|---|---|---|---|
| Environment (`dev`/`qa`/`prod`) | `APP_SERVICE_NAME` | variable | Target App Service name |
| Environment (`dev`/`qa`/`prod`) | `AZURE_CREDENTIALS` | secret | Service principal JSON for `azure/login` |

## Failure Semantics

- Any step exiting non-zero fails the job; subsequent steps are skipped (FR-011).
- Live App Service is unaffected on pre-deploy failures (SC-006).
