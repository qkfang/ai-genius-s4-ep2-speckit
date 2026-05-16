# Quickstart: Deploy API Workflow

**Feature**: `002-deploy-api-workflow` | **Date**: 2026-03-22

Get the API deployment pipeline running end-to-end in five steps.

---

## Prerequisites

- The infrastructure pipeline (feature 001 — `deploy-infra.yml`) has run successfully, producing a Linux B1 App Service with `httpsOnly: true`.
- You know the resulting App Service name (e.g. `app-aigenius-api-dev`).
- An Entra ID App Registration (or User-Assigned Managed Identity) exists with a Federated Credential trusting this repo's `main` branch. If not, follow feature 001's `quickstart.md` step 1 and reuse the same identity here.
- The federated identity has the `Website Contributor` role on the target App Service (or `Contributor` on its resource group).

---

## Step 1 — Configure GitHub repository **secrets**

Go to **Settings → Secrets and variables → Actions → Secrets**, and add:

| Secret | Value |
|--------|-------|
| `AZURE_CLIENT_ID` | App Registration / Managed Identity client ID (GUID) |
| `AZURE_TENANT_ID` | Entra ID tenant ID (GUID) |
| `AZURE_SUBSCRIPTION_ID` | Subscription ID (GUID) |

These are not credentials — they are identifiers used to look up the federated identity at OIDC-token-exchange time.

---

## Step 2 — Configure the GitHub repository **variable**

Same screen, **Variables** tab:

| Variable | Value (example) |
|----------|-----------------|
| `APP_SERVICE_NAME` | `app-aigenius-api-dev` |

(Not a secret — App Service names appear in public DNS.)

---

## Step 3 — Add the `/health` route to the API

Edit `src/ai-genius-api/Program.cs` and add a single line near the other `app.MapGet` calls:

```csharp
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
```

The existing `/api/health` route stays untouched. Build locally to confirm:

```bash
dotnet build src/ai-genius-api/ai-genius-api.csproj
```

---

## Step 4 — Commit and push

```bash
git add .github/workflows/deploy-api.yml src/ai-genius-api/Program.cs
git commit -m "feat(002): deploy-api workflow + /health route"
git push origin main
```

The push to `main` automatically triggers the workflow. Open the **Actions** tab in GitHub and watch the `Deploy API to Azure` run.

---

## Step 5 — Verify

When the run shows a green check:

```bash
APP_SERVICE_NAME="app-aigenius-api-dev"   # your value
curl --fail -sS "https://${APP_SERVICE_NAME}.azurewebsites.net/health"
# Expected output:
# {"status":"ok"}
```

Also verify HTTPS-only enforcement:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" "http://${APP_SERVICE_NAME}.azurewebsites.net/health"
# Expected: 301 (redirect to HTTPS) or 403
```

---

## Re-running a failed deploy

From the Actions UI → click the failed run → **Re-run all jobs**. No new commit is required (uses the `workflow_dispatch` trigger path implicitly via the re-run mechanism).

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `azure/login@v2` fails with `AADSTS70021: No matching federated identity record found` | Federated credential subject doesn't match `repo:qkfang/ai-genius-s4-ep2-speckit:ref:refs/heads/main` | Update the federated credential in Entra ID |
| `webapps-deploy` fails with `AuthorizationFailed` | Identity lacks role on the App Service | Assign `Website Contributor` |
| Workflow green but `/health` returns 404 | `/health` route not deployed | Confirm step 3 was committed; check the Deployment Center / log stream |
| Workflow green but `/health` returns `{"status":"healthy",...}` | The probe is hitting the old `/api/health` route, or the new `/health` MapGet was added with a different body | Confirm exact line: `app.MapGet("/health", () => Results.Ok(new { status = "ok" }));` |
| Two pushes in quick succession — second run waits | Expected behaviour (`concurrency: cancel-in-progress: false`) | Wait; the latest commit's deploy will run next |
