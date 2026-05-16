# Quickstart: 003 Deploy API to Azure App Service

## Prerequisites

For each target environment (`dev`, `qa`, `prod`) in GitHub repo settings:
- Environment variable `APP_SERVICE_NAME` set to the Azure App Service name.
- Environment secret `AZURE_CREDENTIALS` set to a service-principal JSON with deploy rights.
- App Service provisioned by `001-deploy-infra.yml` on Linux B1.

## Automatic deploy (push to main)

1. Merge a PR to `main`.
2. Open **Actions → 003 Deploy API to Azure App Service**.
3. Watch the run; it targets the `dev` environment by default.
4. After success, hit the App Service URL to verify the new build is live.

## Manual deploy to another environment

1. Actions → **003 Deploy API to Azure App Service** → **Run workflow**.
2. Pick `environment` = `dev` | `qa` | `prod` (default `dev`).
3. Click **Run workflow**. The job runs under the selected GitHub Environment and deploys to its `APP_SERVICE_NAME`.

## Verifying

- Run completes ≤ 10 minutes (SC-002).
- Triggering commit SHA is reflected by the deployed app (SC-003).
- Two rapid pushes → only the latest deploys; earlier in-progress run is cancelled (SC-004).

## Troubleshooting

- **Publish fails**: fix build locally with `dotnet publish src/ai-genius-api/ai-genius-api.csproj -c Release -r linux-x64 --self-contained true`.
- **`azure/login` fails**: re-check `AZURE_CREDENTIALS` in the selected environment.
- **`webapps-deploy` fails**: verify `APP_SERVICE_NAME` and that the SP has deploy permissions on it.
