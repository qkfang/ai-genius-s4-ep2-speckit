# Quickstart — Deploy the AI Genius API

This is the minimal "happy path" walkthrough a maintainer follows once the feature is implemented. It exists to validate the contract end-to-end.

## Prerequisites (one-time)

1. **Infra provisioned**: `deploy-infra.yml` has run successfully against the target environment, creating a Linux B1 App Service.
2. **GitHub repository variable** set:
   - `APP_SERVICE_NAME` = the App Service name from the Bicep deployment (e.g. `app-aigenius-dev-eus2-xxxx`).
3. **GitHub repository secrets** set (OIDC federated identity):
   - `AZURE_CLIENT_ID`
   - `AZURE_TENANT_ID`
   - `AZURE_SUBSCRIPTION_ID`
4. **Azure AD app registration** has a federated credential trusting:
   - Subject: `repo:<owner>/<repo>:ref:refs/heads/main` (and any other branches/environments allowed to deploy).
5. **Azure RBAC**: the app registration has `Website Contributor` (or finer-grained zip-deploy) role on the target App Service.

## Happy-Path Deploy

```text
1. Open a PR with a backend change in src/ai-genius-api/.
2. Get review approval; merge to main.
3. Open the Actions tab → "Deploy API to Azure App Service".
4. Watch the auto-triggered run:
     ✔ Checkout code
     ✔ Setup .NET
     ✔ Publish API (Release)
     ✔ Zip publish output
     ✔ Azure login (OIDC)
     ✔ Deploy to App Service
5. Hit the API health endpoint and confirm the new build is live.
```

Expected total runtime on `ubuntu-latest`: well under 5 minutes; well under SC-002's 10-minute budget.

## Manual Redeploy (no code change)

```text
1. Actions tab → "Deploy API to Azure App Service" → "Run workflow".
2. Pick the environment (default: dev) and confirm.
3. The same canonical 6 steps run; the App Service is redeployed with the current main commit (idempotent).
```

## Diagnosing a Failed Run

| Symptom | Likely cause | Where to look |
|---|---|---|
| Red "Publish API (Release)" step | Compilation error in `src/ai-genius-api/`. | That step's log — fix the code and push again. The deploy step never ran; App Service is untouched. |
| Red "Azure login (OIDC)" step | Federated credential not configured, or wrong subject (e.g., deploying from a non-`main` branch that the federated cred doesn't trust). | Step log → "AADSTS70021" or similar; reconfigure the federated credential on the Azure AD app. |
| Red "Deploy to App Service" step with "app-name is required" | `APP_SERVICE_NAME` repo variable is unset. | Repo Settings → Variables → Actions → set `APP_SERVICE_NAME`. |
| Red "Deploy to App Service" step with 403 / authorization error | App registration lacks zip-deploy permission on the target App Service. | Azure portal → App Service → IAM → assign `Website Contributor`. |

## Rollback

There is no in-workflow rollback. To revert, push a revert commit to `main` — the next workflow run will redeploy the previous code. (Azure App Service deployment slot rollback is out of scope for this feature; see contracts/deploy-api.workflow.md Non-Goals.)

## What This Workflow Does NOT Do

- It does not run database migrations.
- It does not run tests (the API has no test project today; if added later, prepend a `dotnet test` step before publish).
- It does not provision infrastructure — that is `deploy-infra.yml`'s job.
- It does not promote between environments — re-run with a different `environment` input (and ensure `APP_SERVICE_NAME` points at that environment).
