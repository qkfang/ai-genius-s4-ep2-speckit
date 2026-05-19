# Quickstart: Backend API CI/CD Pipeline

**Feature**: `003-api-deploy`
**Date**: 2026-05-19

This quickstart shows how to use, configure, and verify the API deployment workflow `.github/workflows/003-deploy-api.yml`.

---

## Prerequisites

Before the first successful run, ensure all of the following exist:

1. **Azure App Services provisioned.** Run `001-deploy-infra.yml` for each environment (`dev`, `qa`, `prod`) you intend to deploy to. The workflow provisions a Linux App Service Plan (SKU `B1`) and the App Service per environment.
2. **Repository secret `AZURE_CREDENTIALS`.** Same secret used by `001-deploy-infra.yml`. Service principal must have at least `Website Contributor` on each target App Service.
3. **GitHub environments configured.** Create environments named exactly `dev`, `qa`, `prod` under repository → Settings → Environments. Optionally add protection rules (required reviewers, wait timer) on `prod`.
4. **Per-environment variable `APP_SERVICE_NAME`.** In each GitHub environment, add a variable named `APP_SERVICE_NAME` whose value is the exact name of the App Service provisioned by `001-deploy-infra.yml` for that environment (e.g., `app-aigenius-api-dev`).
5. **.NET project targets `net10.0`.** Already true: `src/ai-genius-api/ai-genius-api.csproj` has `<TargetFramework>net10.0</TargetFramework>`.

---

## Usage

### Automatic deployment on push to `main`

```bash
# from a topic branch
git switch main
git pull
git merge --no-ff feature/my-change
git push origin main
```

Result: the `003 Deploy API to Azure` workflow runs automatically against the `dev` environment. Watch progress at *Actions → 003 Deploy API to Azure*.

### Manual deployment via `workflow_dispatch`

1. Open *Actions → 003 Deploy API to Azure*.
2. Click **Run workflow**.
3. Pick the target environment: `dev`, `qa`, or `prod`.
4. Click **Run workflow**.

If the target environment has protection rules (e.g., required reviewers on `prod`), the deploy job pauses for approval before the `azure/login@v1` step.

---

## Verification

### Verify a successful deployment

1. Wait for the workflow run to complete with a green check.
2. From the workflow logs, copy the value of `APP_SERVICE_NAME` printed by the deploy step (or look it up in the GitHub environment variables).
3. Curl the App Service:

   ```bash
   curl -sSf "https://${APP_SERVICE_NAME}.azurewebsites.net/health"
   ```

4. Confirm the response reflects the build from the triggering commit (e.g., a version string or commit SHA).

### Verify concurrency cancellation (SC-004)

```bash
git commit --allow-empty -m "trigger run 1" && git push
sleep 5
git commit --allow-empty -m "trigger run 2" && git push
```

In *Actions → 003 Deploy API to Azure*, the first run should appear with status **Cancelled** and only the second run should reach the deploy step.

### Verify failure modes

- **Missing `vars.APP_SERVICE_NAME`** → the deploy step fails with an `app-name` validation error from `azure/webapps-deploy@v3`.
- **Bad `AZURE_CREDENTIALS`** → the `Azure CLI Login` step fails with an authentication error before any build artifact is touched.
- **Build error in `src/ai-genius-api`** → the `dotnet publish` step fails; the zip and deploy steps are skipped.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Error: No package found with specified pattern` | Zip step did not produce `publish.zip` | Inspect `dotnet publish` step output; ensure `--output ./publish` succeeded and `cd publish && zip -r ../publish.zip .` ran. |
| `AADSTS70002: Error validating credentials` | `AZURE_CREDENTIALS` expired/rotated | Refresh the SP secret and update the repository secret. |
| Deploy succeeds but App Service still serves old build | Browser/CDN cache, or wrong App Service targeted | Hard refresh; verify `vars.APP_SERVICE_NAME` matches the environment you intended. |
| Workflow never starts on push | Branch is not `main`, or workflow file path is wrong | Ensure the file is at `.github/workflows/003-deploy-api.yml`. |
| Run cancelled unexpectedly | A newer push superseded it via concurrency policy | Expected behaviour (FR-010, SC-004). Re-trigger only if intended. |

---

## File paths referenced

- Workflow: `.github/workflows/003-deploy-api.yml`
- API project: `src/ai-genius-api/ai-genius-api.csproj`
- Sibling workflow (provisioning): `.github/workflows/001-deploy-infra.yml`
- Spec: `specs/003-api-deploy/spec.md`
- Plan: `specs/003-api-deploy/plan.md`
- Research: `specs/003-api-deploy/research.md`
- Data model: `specs/003-api-deploy/data-model.md`
- Contract: `specs/003-api-deploy/contracts/workflow-interface.md`
