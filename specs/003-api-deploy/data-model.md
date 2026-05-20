# Data Model: Backend API Deployment

## Entities

### `GithubActionsWorkflow`

| Field | Value |
|-------|-------|
| `name` | `003 Deploy API to Azure` |
| `on.push.branches` | `[main]` |
| `on.workflow_dispatch.inputs.environment` | choice: `dev`, `qa`, `prod`; default `dev` |
| `concurrency.group` | `${{ github.workflow }}-${{ github.ref }}` |
| `concurrency.cancel-in-progress` | `true` |
| `env.ENVIRONMENT` | `${{ github.event.inputs.environment || 'dev' }}` |
| `env.APP_SERVICE_NAME` | `${{ vars.APP_SERVICE_NAME }}` |
| `jobs` | single job: `deploy-api` |

### `DeployApiJob`

| Field | Value |
|-------|-------|
| `runs-on` | `ubuntu-latest` |
| `environment` | `${{ github.event.inputs.environment || 'dev' }}` |
| Steps | checkout → setup-dotnet → publish → zip → azure/login → webapps-deploy |

### `BuildArtifact`

| Field | Value |
|-------|-------|
| `path` | `./publish.zip` |
| `runtime` | `linux-x64` |
| `self-contained` | `true` |
| `configuration` | `Release` |
| `targetFramework` | `net10.0` |
