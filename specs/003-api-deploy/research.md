# Phase 0 Research: Backend API Deployment

## Decisions

- **Trigger pattern** mirrors `001-deploy-infra.yml`: `push` to `main` + `workflow_dispatch` with `environment` choice (`dev`/`qa`/`prod`, default `dev`).
- **Concurrency** group: `${{ github.workflow }}-${{ github.ref }}`, `cancel-in-progress: true`.
- **Build**: `dotnet publish -c Release -r linux-x64 --self-contained true`. Self-contained avoids App Service runtime version mismatch for .NET 10 (preview-fast SDK).
- **Package**: Zip the publish output (`./publish`) into `publish.zip`.
- **Deploy**: `azure/webapps-deploy@v3` with `package: ./publish.zip` (zip deploy).
- **Auth**: Reuse `secrets.AZURE_CREDENTIALS` with `azure/login@v1` (matches infra workflow).
- **App Service name**: `vars.APP_SERVICE_NAME` resolved per GitHub Environment.

## Alternatives Considered

| Option | Decision | Reason |
|--------|----------|--------|
| Framework-dependent publish | Rejected | Requires App Service runtime alignment for .NET 10. |
| OIDC federated login | Rejected for now | `001-deploy-infra.yml` uses `AZURE_CREDENTIALS`; stay consistent. |
| Multi-job (build + deploy) | Rejected | Single job is simpler for a small artifact. |
