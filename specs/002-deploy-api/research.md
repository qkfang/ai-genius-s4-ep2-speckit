# Phase 0 Research: Deploy AI Genius Backend API

All clarifications resolved in spec (Session 2026-05-16). No outstanding NEEDS CLARIFICATION.

## Decisions

### .NET SDK version
- **Decision**: .NET 10 via `actions/setup-dotnet@v4` with `dotnet-version: 10.0.x`.
- **Rationale**: Spec FR-006; csproj already targets `net10.0`.
- **Alternatives**: .NET 8/9 — rejected; would require csproj retarget.

### Publish mode
- **Decision**: `dotnet publish -c Release -r linux-x64 --self-contained true`.
- **Rationale**: App Service Plan is Linux B1; self-contained avoids runtime version coupling on the host.
- **Alternatives**: Framework-dependent — rejected; requires matching runtime on host.

### Packaging
- **Decision**: Plain `zip -r` of publish output to `publish.zip`.
- **Rationale**: `azure/webapps-deploy@v3` uses zip deploy (spec clarification).
- **Alternatives**: `Publish Profile` / `actions/upload-artifact` — unnecessary indirection.

### Deploy action
- **Decision**: `azure/webapps-deploy@v3` with `app-name` from `vars.APP_SERVICE_NAME`, `package: ./publish.zip`.
- **Rationale**: Specified in feature input; environment-scoped variable provides per-env target.
- **Alternatives**: `az webapp deploy` CLI — equivalent, but action is the convention used here.

### Authentication
- **Decision**: `azure/login@v1` with `creds: ${{ secrets.AZURE_CREDENTIALS }}`.
- **Rationale**: Matches `001-deploy-infra.yml`; service principal already provisioned.
- **Alternatives**: OIDC federated credentials — out of scope for this feature.

### Trigger + environment selection
- **Decision**: `on.push.branches: [main]` + `workflow_dispatch` with `environment` input (`dev`/`qa`/`prod`, default `dev`); `environment: ${{ github.event.inputs.environment || 'dev' }}` on the job.
- **Rationale**: Mirrors `001-deploy-infra.yml`; satisfies FR-002, FR-003, FR-004.

### Concurrency
- **Decision**: `concurrency.group: ${{ github.workflow }}-${{ github.ref }}` with `cancel-in-progress: true`.
- **Rationale**: FR-005; matches infra workflow; satisfies SC-004.

### Runner
- **Decision**: `ubuntu-latest`. Rationale: FR-012; matches sibling workflows.
