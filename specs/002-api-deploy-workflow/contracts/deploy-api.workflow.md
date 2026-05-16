# Contract: `.github/workflows/deploy-api.yml`

This is the external contract the deployment workflow MUST satisfy. The exact YAML keys, secrets, variables, and step ordering below are normative — implementations that deviate from them violate the spec.

## Trigger Contract

| Event | Filter | Required |
|---|---|---|
| `push` | `branches: [main]` | Yes (FR-002) |
| `workflow_dispatch` | input `environment` (choice: `dev`/`qa`/`prod`, default `dev`) | Yes (FR-003) |

## Inputs the Workflow Reads

| Kind | Name | Required | Purpose |
|---|---|---|---|
| Secret | `AZURE_CLIENT_ID` | Yes | OIDC federated app client ID (FR-008) |
| Secret | `AZURE_TENANT_ID` | Yes | OIDC tenant (FR-008) |
| Secret | `AZURE_SUBSCRIPTION_ID` | Yes | Target subscription (FR-008) |
| Variable | `APP_SERVICE_NAME` | Yes | Target App Service name (FR-009) |
| Dispatch input | `environment` | Optional | Logical environment label; defaults to `dev` |

The workflow MUST NOT read any other secrets and MUST NOT print any of the above values.

## Permissions (job-level)

```yaml
permissions:
  contents: read
  id-token: write   # required for azure/login OIDC
```

## Canonical Step Sequence (FR-012)

The single job `build-and-deploy` MUST execute these steps in this exact order:

| # | Step name | Action / Command | Required inputs |
|---|---|---|---|
| 1 | Checkout code | `actions/checkout@v4` | — |
| 2 | Setup .NET | `actions/setup-dotnet@v4` | `dotnet-version: 9.0.x` (≥ 8.0 per FR-004) |
| 3 | Publish API (Release) | `dotnet publish src/ai-genius-api/ai-genius-api.csproj -c Release -o ./publish` | — |
| 4 | Zip publish output | `cd publish && zip -r ../publish.zip .` | — |
| 5a | Azure login (OIDC) | `azure/login@v2` | `client-id`, `tenant-id`, `subscription-id` (from secrets) |
| 5b | Deploy to App Service | `azure/webapps-deploy@v3` | `app-name: ${{ vars.APP_SERVICE_NAME }}`, `package: ./publish.zip` |

> Step 5a (login) is the OIDC prerequisite for step 5b; both together implement the spec's single "azure/webapps-deploy@v3" step. They MUST both run after the zip step.

## Behavioral Guarantees

| ID | Guarantee | Mapped to |
|---|---|---|
| C-01 | If steps 1–4 succeed and `azure/login` succeeds, `azure/webapps-deploy@v3` MUST run. | FR-010 |
| C-02 | If any of steps 1–4 fails, neither `azure/login` nor `azure/webapps-deploy@v3` MUST run. | FR-006 |
| C-03 | If `APP_SERVICE_NAME` is unset/empty, the deploy step MUST fail before contacting Azure with a clear error. | FR-009 |
| C-04 | The workflow MUST report a single overall status (success only if all steps succeeded). | FR-010, SC-003 |
| C-05 | No secret value MUST appear in workflow logs. | SC-005 |
| C-06 | The workflow MUST be visible in the Actions UI with commit + actor metadata. | FR-011 (this is GitHub default; the contract is "don't suppress it") |

## Non-Goals (explicitly out of scope of this contract)

- Running unit/integration tests of the API (not required by spec; can be added later).
- Slot swaps, blue/green, or canary deploys.
- Database migrations, configuration drift detection, or post-deploy smoke tests.
- Cross-environment promotion (e.g., dev → qa → prod orchestration in a single run).
- Uploading the zip as a downloadable GitHub artifact.

## Acceptance Tests (executed manually for v1)

| AT | Procedure | Expected |
|---|---|---|
| AT-1 | Push a trivial change to `main`. | Workflow runs automatically, succeeds, App Service serves new build (SC-001, SC-002, AS-1, AS-2). |
| AT-2 | Break the build (`syntax error` in `Program.cs`) and push to `main`. | Workflow fails at step 3; deploy step is skipped; App Service unchanged (FR-006, AS-3, SC-003). |
| AT-3 | Trigger `workflow_dispatch` for an unchanged `main`. | Workflow runs, succeeds, App Service redeploys the same commit idempotently (FR-003, US3-AS-1). |
| AT-4 | Inspect the run log for `AT-1`. | None of `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` values appear in plain text (SC-005, US3-AS-2). |
| AT-5 | Temporarily unset `vars.APP_SERVICE_NAME` and dispatch the workflow. | Deploy step fails with a clear "app-name is required" error; App Service unchanged. |
