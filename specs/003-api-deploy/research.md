# Phase 0 Research: 003-api-deploy

**Feature**: `003-api-deploy`  
**Date**: 2026-05-16

## Decisions

### D1. .NET version

- **Decision**: Use .NET 10 (`actions/setup-dotnet@v4` with `dotnet-version: 10.0.x`).
- **Rationale**: `src/ai-genius-api/ai-genius-api.csproj` declares `<TargetFramework>net10.0</TargetFramework>`. Pinning to the `10.0.x` patch line keeps the workflow on the latest patch within the GA channel.
- **Alternatives considered**: .NET 9 / .NET 8 — rejected because the project does not target them.

### D2. Publish flavor

- **Decision**: `dotnet publish -c Release -r linux-x64 --self-contained true`.
- **Rationale**: The user requirement explicitly asks for `linux-x64` & self-contained. App Service Plan is Linux B1, so `linux-x64` is the correct RID. Self-contained avoids requiring a specific framework version on the App Service.
- **Alternatives considered**: Framework-dependent (`--self-contained false`) — rejected per user instruction; smaller zip but couples to App Service .NET stack.

### D3. Deployment mechanism

- **Decision**: Zip Deploy via `azure/webapps-deploy@v3` with `package: ./publish.zip`.
- **Rationale**: Explicitly requested by the user; standard, well-supported path for App Service code deploys.
- **Alternatives considered**: Run-from-package, container deploy — out of scope per user instruction.

### D4. Authentication

- **Decision**: `azure/login@v1` with `creds: ${{ secrets.AZURE_CREDENTIALS }}`.
- **Rationale**: Matches `001-deploy-infra.yml` (existing in this repository) and the documented repository convention (see project overview / `AGENTS.md`). Reuses the existing service principal secret — no new secret needed.
- **Alternatives considered**: OIDC federated credentials (`azure/login@v2` with `client-id`/`tenant-id`/`subscription-id`) — rejected to stay consistent with the existing workflow in this repo.

### D5. Environment & concurrency

- **Decision**: Reuse the exact pattern from `001-deploy-infra.yml`:
  - `on.push.branches: [main]` plus `workflow_dispatch` with `inputs.environment` (choice: `dev`/`qa`/`prod`, default `dev`).
  - Workflow-level `concurrency: { group: ${{ github.workflow }}-${{ github.ref }}, cancel-in-progress: true }`.
  - Job-level `environment: ${{ github.event.inputs.environment || 'dev' }}` so per-environment GitHub variables (`APP_SERVICE_NAME`) resolve correctly.
- **Rationale**: User explicitly asked to follow `001-deploy-infra.yml`. Avoids divergence and surprises.

### D6. App Service name source

- **Decision**: `vars.APP_SERVICE_NAME` (per-environment GitHub variable).
- **Rationale**: Documented repository convention (see project overview: "Required GitHub Variables (per environment) — `APP_SERVICE_NAME`"). Avoids hard-coding resource names and supports multi-environment deploys.

### D7. Action versions

- **Decision**: Pin to the major versions already used in this repository:
  - `actions/checkout@v4`
  - `actions/setup-dotnet@v4`
  - `azure/login@v1`
  - `azure/webapps-deploy@v3`
- **Rationale**: Matches the repository’s "Standard Action Versions (Locked)" list. No new third-party actions are introduced.

## Open Questions

None — all clarifications captured in `spec.md` § Clarifications.
