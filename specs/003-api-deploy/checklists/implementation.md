# Implementation Checklist: 003-api-deploy

**Purpose**: Pre-merge readiness checklist for the `003 Deploy API to Azure` GitHub Actions workflow.  
**Created**: 2026-05-16  
**Feature**: [spec.md](../spec.md)

## Workflow File

- [ ] CHK001 File `.github/workflows/003-deploy-api.yml` exists
- [ ] CHK002 `name:` is `003 Deploy API to Azure`
- [ ] CHK003 `on.push.branches` includes `main`
- [ ] CHK004 `on.workflow_dispatch.inputs.environment` is a `choice` with options `[dev, qa, prod]` and default `dev`
- [ ] CHK005 Workflow-level `concurrency.group` is `${{ github.workflow }}-${{ github.ref }}`
- [ ] CHK006 Workflow-level `concurrency.cancel-in-progress` is `true`
- [ ] CHK007 `env.ENVIRONMENT` resolves from `github.event.inputs.environment` with fallback `dev`

## Job: `deploy-api`

- [ ] CHK008 `runs-on: ubuntu-latest`
- [ ] CHK009 `environment:` binds to `${{ github.event.inputs.environment || 'dev' }}`
- [ ] CHK010 Step 1 uses `actions/checkout@v4`
- [ ] CHK011 Step 2 uses `actions/setup-dotnet@v4` with `dotnet-version: 10.0.x`
- [ ] CHK012 Step 3 runs `dotnet publish src/ai-genius-api/ai-genius-api.csproj -c Release -r linux-x64 --self-contained true -o ./publish`
- [ ] CHK013 Step 4 zips the `./publish` directory into `./publish.zip`
- [ ] CHK014 Step 5 uses `azure/login@v1` with `creds: ${{ secrets.AZURE_CREDENTIALS }}`
- [ ] CHK015 Step 6 uses `azure/webapps-deploy@v3` with `app-name: ${{ vars.APP_SERVICE_NAME }}` and `package: ./publish.zip`

## Security & Conventions

- [ ] CHK016 No secret values are inlined — only `${{ secrets.* }}` / `${{ vars.* }}` references
- [ ] CHK017 Only official `actions/*` and `azure/*` actions are used (no third-party)
- [ ] CHK018 Action versions match repository standards (`@v4`, `@v1`, `@v3`)

## Verification

- [ ] CHK019 Push to `main` → workflow run completes successfully against `dev`
- [ ] CHK020 Manual dispatch (`qa`) → workflow run completes successfully against `qa`
- [ ] CHK021 `curl` the App Service URL post-deploy → returns the latest code's behaviour

## Notes

- Check items off as completed (`[x]`).
- CHK019–CHK021 are post-merge runtime verifications and may be checked off after the first green run.
