# Workflow Interface Contract: 003-deploy-api

## Inputs

| Source | Name | Type | Required | Default |
|--------|------|------|----------|---------|
| `workflow_dispatch.inputs` | `environment` | choice (`dev`/`qa`/`prod`) | Yes (UI) | `dev` |
| `secrets` | `AZURE_CREDENTIALS` | JSON | Yes | — |
| `vars` | `APP_SERVICE_NAME` | string | Yes (per env) | — |

## Outputs

None (terminal deployment job).

## Side Effects

- Publishes `src/ai-genius-api` as `publish.zip`.
- Updates Azure App Service `vars.APP_SERVICE_NAME` with new package via zip deploy.

## Failure Modes

| Step | On failure |
|------|------------|
| `setup-dotnet` | Workflow fails; no deploy. |
| `dotnet publish` | Workflow fails; no deploy. |
| `azure/login@v1` | Workflow fails; no deploy. |
| `azure/webapps-deploy@v3` | Workflow fails; App Service untouched or partially updated (zip deploy is atomic). |
