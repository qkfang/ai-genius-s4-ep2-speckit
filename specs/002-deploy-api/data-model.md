# Phase 1 Data Model: Deploy AI Genius Backend API

This feature ships a CI/CD workflow, not application data. "Entities" are configuration/deployment artifacts.

## Entities

### Workflow
- **File**: `.github/workflows/003-deploy-api.yml`
- **Triggers**: `push` to `main`; `workflow_dispatch` with `environment` choice.
- **Concurrency**: group `${{ github.workflow }}-${{ github.ref }}`, `cancel-in-progress: true`.

### GitHub Environment
- **Name**: one of `dev` | `qa` | `prod` (default `dev`).
- **Variables**: `APP_SERVICE_NAME` (target Azure App Service name).
- **Secrets**: `AZURE_CREDENTIALS` (service principal JSON for `azure/login`).
- **Transitions**: selected per run via dispatch input or default for push.

### Build Artifact
- **Source**: `src/ai-genius-api/ai-genius-api.csproj`
- **Produced by**: `dotnet publish -c Release -r linux-x64 --self-contained true -o ./publish`
- **Packaged as**: `./publish.zip` (zip of publish output contents).
- **Validation**: publish must exit 0; zip must be non-empty.

### Deployment Target
- **Type**: Azure App Service (Linux B1).
- **Identifier**: `vars.APP_SERVICE_NAME` resolved from the active GitHub Environment.
- **Method**: zip deploy via `azure/webapps-deploy@v3`.

## State Transitions (job)

`queued → checkout → setup-dotnet → publish → zip → azure/login → webapps-deploy → success | failed`

Failure at any step halts the job (fail-fast, FR-011); App Service state is unchanged on failure (SC-006).
