# Implementation Plan: Deploy API Workflow

**Branch**: `002-deploy-api-workflow` | **Date**: 2026-03-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-deploy-api-workflow/spec.md`

## Summary

Add a GitHub Actions workflow `.github/workflows/deploy-api.yml` that, on every push to `main`, builds the .NET API in `src/ai-genius-api`, packages the publish output as a zip, authenticates to Azure via OIDC (Workload Identity Federation), and zip-deploys the artifact to an Azure Linux App Service (B1) using `azure/webapps-deploy@v3`. The deployed App Service is configured (in Bicep, out of scope of this workflow) for HTTPS-only and exposes `/health` returning `{"status":"ok"}`. The workflow performs a post-deploy `/health` smoke test so build/deploy/verify failures all surface as a single red check.

Pipeline steps (single job `deploy-api`):

1. `actions/checkout@v4`
2. `actions/setup-dotnet@v4` (pin `dotnet-version: 9.0.x`; `.NET 9` satisfies the spec's "8 or later LTS" baseline and matches the existing `<TargetFramework>net9.0</TargetFramework>` in `src/ai-genius-api/ai-genius-api.csproj`)
3. `dotnet publish src/ai-genius-api/ai-genius-api.csproj -c Release -o ./publish`
4. Zip the `./publish` directory into `api.zip` (standard `zip -r` — no third-party action)
5. `azure/login@v2` with `client-id` / `tenant-id` / `subscription-id` (OIDC, no `creds`)
6. `azure/webapps-deploy@v3` with `app-name: ${{ vars.APP_SERVICE_NAME }}` and `package: ./api.zip`
7. Post-deploy: `curl --fail -sS https://${{ vars.APP_SERVICE_NAME }}.azurewebsites.net/health` and assert body equals `{"status":"ok"}`

## Technical Context

**Language/Version**: YAML (GitHub Actions workflow syntax); .NET 9 (`src/ai-genius-api/ai-genius-api.csproj` → `net9.0`, satisfies FR-004 "net8 or later LTS")
**Primary Dependencies**: `actions/checkout@v4`, `actions/setup-dotnet@v4`, `azure/login@v2` (OIDC mode), `azure/webapps-deploy@v3` (Zip Deploy), `curl` (preinstalled on `ubuntu-latest`)
**Storage**: N/A (deployment pipeline — no persistent state)
**Testing**: Post-deploy `/health` smoke test via `curl`; the API's own xUnit/integration tests are out of scope of this workflow and run in a separate CI workflow
**Target Platform**: GitHub Actions `ubuntu-latest` runners; Azure App Service (Linux, App Service Plan SKU **B1**); deployment via Zip Deploy
**Project Type**: CI/CD pipeline (a single new YAML file; no new source code)
**Performance Goals**: End-to-end (push → `/health` returning `ok` live) < 10 minutes (SC-006); deploy workflow starts < 1 minute after push (SC-001)
**Constraints**:
- OIDC-only authentication — **no** client secret, **no** publish profile, **no** `AZURE_CREDENTIALS` JSON
- Secrets used: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` (non-sensitive identifiers)
- App Service name supplied as GitHub repository variable `APP_SERVICE_NAME` (`vars.APP_SERVICE_NAME`)
- Job `permissions` MUST include `id-token: write` and `contents: read` (minimum)
- `concurrency: { group: deploy-api-${{ github.ref }}, cancel-in-progress: false }` — serialise main-branch deployments so the latest commit wins without clobbering an in-flight deploy
- Workflow MUST NOT run for pull requests from forks or pushes to non-`main` branches
**Scale/Scope**: 1 new workflow file (`deploy-api.yml`), 1 job, ~7 steps; targets a single App Service (one environment for MVP, mirroring `deploy-infra.yml`'s current shape)

### Dependency on API source code (out of plan, in tasks)

The current `src/ai-genius-api/Program.cs` exposes `/api/health` returning `{"status":"healthy",…}`. The spec (FR-010, SC-002) requires `/health` returning **exactly** `{"status":"ok"}`. A trivial `app.MapGet("/health", () => Results.Ok(new { status = "ok" }));` addition is required for the post-deploy smoke test to pass. This is captured as a task in Phase 2 (`tasks.md`) — it does **not** alter the workflow design.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Security-First** — no secrets committed; HTTPS-only | ✅ PASS | OIDC federation; only `AZURE_CLIENT_ID` / `AZURE_TENANT_ID` / `AZURE_SUBSCRIPTION_ID` (non-sensitive identifiers); HTTPS-only enforced at App Service (Bicep, FR-009); workflow's own `/health` probe uses `https://` |
| **II. Cloud-Native** — Bicep IaC, tagged resources | ✅ PASS | This feature only **deploys** code to a Bicep-provisioned App Service; no portal-based resource creation. Resource provisioning is owned by feature 001 |
| **III. CI/CD-Driven** — every merge triggers automated deployment | ✅ PASS | `on: push: branches: [main]` is the primary trigger (FR-002); manual `workflow_dispatch` retained for re-runs (edge case in spec) |
| **IV. Simplicity** — standard built-in actions preferred | ✅ PASS | Only official actions: `actions/checkout`, `actions/setup-dotnet`, `azure/login`, `azure/webapps-deploy`. Zip step is a single `zip -r` shell command — no third-party packaging action |
| **V. Tested** — every API route covered; CI builds clean | ✅ PASS | The workflow's own correctness is verified end-to-end by the post-deploy `/health` HTTP probe; API unit tests live in a separate test workflow (out of scope) |

**Gate result**: All principles pass. No violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/002-deploy-api-workflow/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output — workflow entities (Workflow, Job, Step, Federated Identity, App Service target)
├── quickstart.md        # Phase 1 output — how to configure secrets/vars and trigger the first deploy
├── contracts/           # Phase 1 output
│   └── workflow-interface.md
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
.github/
└── workflows/
    ├── deploy-infra.yml          # Existing — provisions the App Service (feature 001)
    └── deploy-api.yml            # NEW — this feature

src/
└── ai-genius-api/
    ├── ai-genius-api.csproj      # Existing — TargetFramework=net9.0 (satisfies FR-004)
    └── Program.cs                # Existing — adds new MapGet("/health", …) in Phase 2 (tasks.md)
```

**Structure Decision**: A single new YAML file under `.github/workflows/`. No new source directories. One additional minimal edit to `src/ai-genius-api/Program.cs` is tracked as a task to expose the `/health` endpoint mandated by FR-010; the existing `/api/health` route is left in place untouched.

## Complexity Tracking

> No constitution violations — section not applicable.
