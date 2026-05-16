# Phase 0 — Research: deploy-api.yml

All open questions from the spec have been resolved through the `## Clarifications` session (2026-05-16). This document captures the supporting decisions and rejected alternatives so future readers don't have to re-derive them.

## Decisions

### D1. .NET SDK version pinned by the workflow

- **Decision**: `actions/setup-dotnet@v4` with `dotnet-version: 9.0.x`.
- **Rationale**: The spec requires ".NET 8 or newer"; the `ai-genius-api.csproj` already targets `net9.0`. Pinning to `9.0.x` satisfies both the spec floor and the actual project TFM, and the floating patch keeps the workflow on the latest 9.0 servicing release without an explicit upgrade PR.
- **Alternatives considered**:
  - `dotnet-version: 8.0.x` — would fail to build the `net9.0` project. Rejected.
  - `global.json` driven — adds an extra file (a `global.json`) outside this feature's scope; rejected for Simplicity.

### D2. Build & package mechanism

- **Decision**: `dotnet publish src/ai-genius-api/ai-genius-api.csproj -c Release -o ./publish`, then `cd publish && zip -r ../publish.zip .`, then pass `publish.zip` to `azure/webapps-deploy@v3`.
- **Rationale**: Zip deploy is the spec-mandated mechanism (FR-007). Publishing to a directory and zipping its **contents** (not the directory itself) avoids a redundant top-level folder inside the package, which is the form `azure/webapps-deploy@v3` expects for Linux App Service zip deploy.
- **Alternatives considered**:
  - `dotnet publish ... -p:PublishProfile=...` — requires a checked-in publish profile; rejected (Simplicity, no profile exists).
  - `dotnet publish -p:GenerateZipPackageForPublish=true` — Windows-oriented, not idiomatic on Linux runner. Rejected.
  - Container deploy / run-from-package URL — out of scope; clarification chose zip deploy.

### D3. Azure authentication

- **Decision**: OIDC federated login via `azure/login@v2` with `client-id: ${{ secrets.AZURE_CLIENT_ID }}`, `tenant-id: ${{ secrets.AZURE_TENANT_ID }}`, `subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}`, and the job-level permission `id-token: write`.
- **Rationale**: Matches spec clarification (OIDC, no client secret). No long-lived credential is stored anywhere; the GitHub OIDC token is exchanged for an Azure access token at job runtime.
- **Alternatives considered**:
  - Reuse `AZURE_CREDENTIALS` JSON service-principal secret (as `deploy-infra.yml` currently does) — rejected by spec clarification (would store a secret password in the repo's secrets store unnecessarily and would not match the chosen federated identity flow).
  - Publish profile (`AZUREAPPSERVICE_PUBLISHPROFILE_*`) — long-lived secret coupled to a single App Service; rejected (Security-First).

### D4. App Service name resolution

- **Decision**: Read `vars.APP_SERVICE_NAME` (GitHub repository variable). The Bicep workflow may export an output to populate this variable, but at deploy time the workflow only consumes the variable.
- **Rationale**: Decouples the API deploy from the infra workflow's run timing — the variable can be set once when infra is first provisioned. Retargeting only requires updating the variable, with zero code change (FR-009).
- **Alternatives considered**:
  - Hard-code the App Service name in the workflow file — rejected (FR-009, retargeting requires code change).
  - Pull the name on every run via `az deployment group show` — slower, requires extra Azure RBAC, and couples this workflow to infra resource-group names. Rejected for Simplicity.

### D5. Triggers

- **Decision**: `on.push.branches: [main]` plus `on.workflow_dispatch` with an `environment` input (default `dev`, choices `dev|qa|prod`), matching `deploy-infra.yml`'s shape.
- **Rationale**: FR-002 (auto on push) + FR-003 (manual dispatch). Mirroring the existing infra workflow's input keeps the operator UX consistent across infra/app deployments.
- **Alternatives considered**: `pull_request` triggers (would deploy unreviewed code — rejected); `schedule` (no requirement — rejected).

### D6. Job topology

- **Decision**: A single job `build-and-deploy` running on `ubuntu-latest`, executing the canonical 5-step sequence (checkout → setup-dotnet → publish → zip → webapps-deploy). The deploy step runs only if all prior steps succeed (the default `success()` condition is sufficient — FR-006 is satisfied without an explicit `if:`).
- **Rationale**: Simplicity (one job, one runner image). Splitting into separate `build` and `deploy` jobs would require artifact upload/download and add ~30–60 s of runtime with no benefit at the current scale.
- **Alternatives considered**: Two-job pipeline with `actions/upload-artifact` / `download-artifact` — rejected for Simplicity and SC-002 (10-min budget).

### D7. Concurrency

- **Decision**: `concurrency.group: deploy-api-${{ github.event.inputs.environment || 'dev' }}`, `cancel-in-progress: false`.
- **Rationale**: Prevents two simultaneous deploys into the same App Service environment; preserves "last push wins" semantics noted in spec edge cases without dropping in-flight deploys mid-zip.

### D8. Log hygiene

- **Decision**: Do not `echo`/`printenv` secrets. Reference all sensitive values only as `${{ secrets.* }}` inputs to actions. No `set -x` in shell steps.
- **Rationale**: SC-005 (zero credentials in logs).

## Resolved NEEDS CLARIFICATION

| Spec topic | Resolution source |
|---|---|
| .NET runtime version | Clarification 2026-05-16 → .NET 8+ (workflow pins 9.0.x to match `net9.0` TFM) |
| App Service plan/OS | Clarification → Linux B1 (provisioned by Bicep, consumed here) |
| Deployment mechanism | Clarification → zip deploy via `azure/webapps-deploy@v3` |
| Azure auth | Clarification → OIDC with `AZURE_CLIENT_ID` / `AZURE_TENANT_ID` / `AZURE_SUBSCRIPTION_ID` |
| App Service name source | Clarification → Bicep output **or** `APP_SERVICE_NAME` GitHub variable (workflow reads `vars.APP_SERVICE_NAME`) |
| Step sequence | Clarification → checkout → setup-dotnet → publish → zip → `azure/webapps-deploy@v3` |

No open `NEEDS CLARIFICATION` markers remain.
