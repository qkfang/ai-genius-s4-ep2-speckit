# Quickstart: React Frontend Web Deployment Workflow

## Goal

Validate the 1-week sprint outcome: changes merged to `main` build the React 18 + Vite frontend in `src/ai-genius-web` and deploy the generated `dist/` directory to Azure Static Web Apps.

## Prerequisites

- Repository secret `AZURE_CREDENTIALS` is configured for Azure login.
- Repository secret `AZURE_STATIC_WEB_APPS_API_TOKEN` is configured for Static Web Apps deployment.
- Repository or environment variable `APP_NAME` is configured.
- Repository or environment variable `VITE_API_URL` points to the target API endpoint.
- Bicep provisioning has created the target Static Web Apps resources.
- `bicep/parameters.dev.json` uses Static Web Apps SKU `Free`.
- `bicep/parameters.prod.json` uses Static Web Apps SKU `Standard`.

## Local Build Check

```bash
cd src/ai-genius-web
npm ci
npm run build
```

Expected result: `dist/` is generated without build errors.

## Manual Deployment Check

1. Open GitHub Actions.
2. Select `002 Deploy Web to Azure Static Web Apps`.
3. Choose `Run workflow`.
4. Select `dev`.
5. Start the run.
6. Confirm the run installs dependencies, builds the frontend, logs in to Azure, and deploys `src/ai-genius-web/dist`.

## Main Push Check

1. Merge a harmless frontend change to `main`.
2. Confirm the workflow starts automatically.
3. If another run for the same branch is active, confirm the older run is cancelled.
4. Confirm the published Static Web Apps site serves the latest frontend build.

## Sprint Done Criteria

- `.github/workflows/002-deploy-web.yml` exists and follows the workflow contract.
- `npm ci` and `npm run build` pass for `src/ai-genius-web`.
- Manual `dev` deployment succeeds.
- Push to `main` starts the workflow automatically.
- No credentials or deployment tokens are hard-coded in source control.
