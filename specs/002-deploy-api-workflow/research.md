# Research: Deploy API Workflow — Phase 0

**Branch**: `002-deploy-api-workflow` | **Date**: 2026-03-22

This document resolves all unknowns and NEEDS CLARIFICATION items identified during Technical Context analysis. All major design choices were pre-clarified in `spec.md` (`## Clarifications`); this file expands the rationale and records considered alternatives.

---

## 1. OIDC Authentication with `azure/login@v2`

**Decision**: Use `azure/login@v2` with `client-id`, `tenant-id`, and `subscription-id` inputs sourced from repository secrets. **Do not** use the `creds:` JSON form.

**Rationale**:

- FR-007 mandates OIDC / Workload Identity Federation; the legacy `creds: ${{ secrets.AZURE_CREDENTIALS }}` form embeds a long-lived client secret and would violate the Security-First constitution principle and SC-003 ("0 long-lived credentials").
- `azure/login@v2` is the official Microsoft action; it implements OAuth 2.0 token exchange between GitHub's OIDC issuer (`token.actions.githubusercontent.com`) and Azure AD. No credential ever leaves Azure.
- Matches the existing repo trajectory: `deploy-infra.yml` is in the process of migrating to OIDC (feature 001), so reusing the same pattern keeps both workflows symmetric and reduces cognitive load.

**Required job-level configuration**:

```yaml
permissions:
  id-token: write     # Allow the runner to request an OIDC JWT
  contents: read      # Allow actions/checkout

steps:
  - uses: azure/login@v2
    with:
      client-id: ${{ secrets.AZURE_CLIENT_ID }}
      tenant-id: ${{ secrets.AZURE_TENANT_ID }}
      subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

**Azure-side prerequisite** (documented in `quickstart.md`, not implemented by this workflow):

- An Entra ID App Registration (or User-Assigned Managed Identity) with a Federated Credential whose subject is `repo:qkfang/ai-genius-s4-ep2-speckit:ref:refs/heads/main`.
- The app/identity is granted the `Website Contributor` role on the target App Service (or `Contributor` on the resource group).

**Alternatives considered**:

- `azure/login@v1` with `creds:` — rejected; stores long-lived secret (FR-007 violation).
- Publish profile (`AZUREAPPSERVICE_PUBLISHPROFILE_*` secret consumed by `webapps-deploy`) — rejected; spec explicitly forbids publish profiles (FR-007, SC-003).
- Managed Identity on a self-hosted runner — rejected; over-complex (Simplicity principle); the project uses GitHub-hosted runners.

---

## 2. .NET SDK version pin

**Decision**: `actions/setup-dotnet@v4` with `dotnet-version: 9.0.x`.

**Rationale**:

- `src/ai-genius-api/ai-genius-api.csproj` declares `<TargetFramework>net9.0</TargetFramework>`.
- FR-004 requires ".NET 8 or later (LTS baseline)"; .NET 9 satisfies "8 or later" and matches the constitution's Technology Stack table ("API backend: .NET 9 Minimal API").
- The `9.0.x` floating patch keeps the runner on the latest 9.0 SDK servicing release without unexpected major-version drift.

**Alternatives considered**:

- `global.json` driven version — rejected; no `global.json` exists in the repo and adding one would be additional surface area for no benefit (Simplicity).
- Pinning `8.0.x` to honour "LTS baseline" literally — rejected; would force a downgrade of the existing csproj.

---

## 3. Build & publish command

**Decision**: A single `dotnet publish` invocation, no separate `restore`/`build` steps.

```bash
dotnet publish src/ai-genius-api/ai-genius-api.csproj \
  --configuration Release \
  --output ./publish
```

**Rationale**:

- `dotnet publish` implicitly performs restore and build; splitting them adds runtime, log noise, and zero correctness benefit.
- Output directory `./publish` is a stable, predictable input to the zip step.
- Release configuration is mandated by FR-004.

**Alternatives considered**:

- Separate `dotnet restore` → `dotnet build` → `dotnet publish --no-build --no-restore` — rejected; verbose, slower, no benefit at this project's scale (Simplicity).
- `dotnet publish` with `--self-contained` — rejected; App Service for Linux already provides the .NET 9 runtime; self-contained inflates the zip by ~80 MB and slows deploys.

---

## 4. Zip packaging

**Decision**: Use the runner's built-in `zip` utility.

```bash
cd ./publish && zip -r ../api.zip . && cd ..
```

**Rationale**:

- `ubuntu-latest` ships with `zip` preinstalled — no `apt-get install` step needed.
- `azure/webapps-deploy@v3` Zip Deploy expects the archive to contain the publish output at its **root** (not nested under a `publish/` directory). Running `zip` from inside `./publish` produces this layout.
- Avoids `actions/upload-artifact`/`download-artifact` round-trip — unnecessary because build and deploy run in the same job.

**Alternatives considered**:

- `papeloto/action-zip` or other community zip actions — rejected; third-party dependency in violation of Simplicity principle.
- `actions/upload-artifact` then download in a deploy job — rejected; doubles the data transfer and run time; needed only if separate jobs.

---

## 5. Deploy action — `azure/webapps-deploy@v3` (Zip Deploy)

**Decision**:

```yaml
- uses: azure/webapps-deploy@v3
  with:
    app-name: ${{ vars.APP_SERVICE_NAME }}
    package: ./api.zip
```

**Rationale**:

- FR-006 mandates `azure/webapps-deploy@v3` with Zip Deploy.
- `app-name` is sourced from a **GitHub repository variable** (`vars.APP_SERVICE_NAME`), not a secret — the App Service name is not sensitive (FR-013, Clarification answer).
- Zip Deploy uses the Kudu `/api/zipdeploy` endpoint; it is atomic enough that a failed transfer leaves the previous slot intact (edge case in spec).

**Alternatives considered**:

- `slot-name:` input to deploy to a staging slot then swap — rejected; B1 plans do not support deployment slots, and the spec does not call for blue/green (Simplicity).
- `publish-profile:` input — rejected; FR-007 forbids publish profiles.

---

## 6. Trigger configuration

**Decision**:

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: deploy-api-${{ github.ref }}
  cancel-in-progress: false
```

**Rationale**:

- `on: push: branches: [main]` satisfies FR-002 and naturally excludes feature branches (FR-003); pull-request events are not listed, so fork PRs cannot trigger deploys (FR-003, OIDC subject mismatch is a second-layer defence).
- `workflow_dispatch` enables manual re-run from the Actions UI (spec edge case "manual re-run requested").
- `concurrency` with `cancel-in-progress: false` serialises deploys on `main` (FR-014) — the later commit's run queues behind the in-flight one, so the latest commit ultimately wins without aborting a deploy mid-zip-upload.

**Alternatives considered**:

- `cancel-in-progress: true` — rejected; cancelling a Zip Deploy mid-upload can leave the App Service in a partially-written state.
- `paths: [src/ai-genius-api/**]` filter — rejected for MVP; the spec demands deploy on **every** push to main (FR-002) and the cost of an unchanged-source deploy is one additional minute of runner time.

---

## 7. Post-deploy `/health` verification

**Decision**: Add a final shell step that polls `https://${APP_SERVICE_NAME}.azurewebsites.net/health` with `curl --fail` and asserts the response body equals `{"status":"ok"}`.

```bash
URL="https://${{ vars.APP_SERVICE_NAME }}.azurewebsites.net/health"
for i in 1 2 3 4 5; do
  body=$(curl --fail -sS "$URL") && break
  sleep 10
done
echo "$body" | grep -q '"status":"ok"'
```

**Rationale**:

- FR-010 / FR-012 / SC-007 require the workflow to fail red if `/health` doesn't return the contract body.
- App Service cold-start after a Zip Deploy can take 10–30 s; a small fixed retry loop avoids flakiness without pulling in a third-party "wait-for-url" action.
- `curl --fail` makes any non-2xx response a non-zero exit, propagating to the job's exit status.

**Alternatives considered**:

- App Service `healthCheckPath` configured in Bicep (passive health check) — complementary but **not** a substitute; it does not fail the workflow run on its own.
- Third-party `until-success` action — rejected (Simplicity).

---

## 8. `/health` route in the API

**Decision**: Add a single Minimal-API line to `src/ai-genius-api/Program.cs`:

```csharp
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
```

**Rationale**:

- The API today exposes `/api/health` returning `{"status":"healthy",…}`. The spec FR-010 / SC-002 contract is **exactly** `/health` → `{"status":"ok"}`. Without the new route the post-deploy probe will fail with 404.
- Tracked as a Phase 2 task; not part of the workflow file itself but a prerequisite for the workflow's green check.

**Alternatives considered**:

- Repurpose the existing `/api/health` and change its response body — rejected; would silently break any existing consumer of the documented `/api/health` route.
- Make the workflow probe `/api/health` instead — rejected; contradicts spec FR-010 wording.

---

## 9. Why a single job (not multi-job)

**Decision**: All seven steps live in a single job named `deploy-api`.

**Rationale**:

- Build artifacts (the zip) only need to flow between sequential steps in the same job — no `upload-artifact` round-trip needed.
- Matches the shape of `deploy-infra.yml`, which uses a single job (`infra`).
- Simpler debugging: one runner, one log group, one timing report.

**Alternatives considered**:

- Separate `build` and `deploy` jobs with `needs:` and `actions/upload-artifact` — rejected; adds ~30 s of overhead for no isolation benefit.

---

## Open questions

None. All FRs, SCs, and clarifications resolve to concrete steps above.
