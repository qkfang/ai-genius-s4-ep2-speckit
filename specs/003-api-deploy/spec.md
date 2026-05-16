# Feature Specification: AI Genius API Deployment via GitHub Actions

**Feature Branch**: `003-api-deploy`  
**Created**: 2026-05-16  
**Status**: Draft  
**Input**: User description: "Deploy the AI Genius backend API via GitHub Actions. The backend is a .NET API in `src/ai-genius-api`. New GitHub Actions workflow (`.github/workflows/003-deploy-api.yml`). Follow the ENVIRONMENT & concurrency like `001-deploy-infra.yml`. Triggers on every push to main. Builds the .NET API project as linux-x64 & self-contained. Deploys the API to Azure App Service using `azure/webapps-deploy@v3`."

## Clarifications

### Session 2026-05-16

- Q: Which .NET version does the API target? → A: .NET 10 (`setup-dotnet` with `dotnet-version: 10.0.x`).
- Q: What App Service Plan SKU and deployment style are used? → A: Linux B1 plan; Zip deploy via `azure/webapps-deploy@v3` with a `.zip` package.
- Q: What are the workflow steps? → A: `checkout` → `setup-dotnet` → `dotnet publish` (linux-x64, self-contained) → zip the publish output → `azure/webapps-deploy@v3`.
- Q: How is the target App Service named? → A: GitHub repository/environment variable `APP_SERVICE_NAME` (per-environment).
- Q: How does the workflow authenticate to Azure? → A: `azure/login@v1` using the `AZURE_CREDENTIALS` secret (matches `001-deploy-infra.yml`).
- Q: How are concurrency and environment selection handled? → A: Same pattern as `001-deploy-infra.yml` — `concurrency: group: ${{ github.workflow }}-${{ github.ref }}`, `cancel-in-progress: true`; `workflow_dispatch` choice input `environment` (`dev`/`qa`/`prod`, default `dev`); push to `main` defaults to `dev`; job binds to GitHub `environment:` of the selected value.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automated API Deployment on Push to main (Priority: P1) 🎯 MVP

A developer merges a change to the `main` branch. The CI/CD pipeline automatically builds the .NET API from `src/ai-genius-api` as a `linux-x64` self-contained publish, packages it into a zip artifact, authenticates to Azure, and deploys the package to the configured Azure App Service. The deployment completes without manual intervention and the live API reflects the committed code.

**Why this priority**: This is the core value of the feature. Every code change must reach the App Service without manual steps.

**Independent Test**: Push a commit to `main` that changes an API endpoint response, wait for the workflow to complete, then `curl` the App Service URL and confirm the new response.

**Acceptance Scenarios**:

1. **Given** a commit is merged to `main`, **When** workflow `003 Deploy API to Azure` runs, **Then** the API is built, zipped, and deployed to the App Service named by `vars.APP_SERVICE_NAME` for the `dev` environment.
2. **Given** the publish step succeeds, **When** the zip step runs, **Then** a single `publish.zip` artifact is produced and supplied to `azure/webapps-deploy@v3`.
3. **Given** the deploy step completes successfully, **When** the workflow finishes, **Then** the workflow run is green and the App Service exposes the latest code.

---

### User Story 2 - Manual API Deployment via Workflow Dispatch (Priority: P2)

An operator needs to redeploy the API on demand — to a non-default environment (`qa`, `prod`) or to recover from a transient failure — without pushing a commit. They click **Run workflow** in the GitHub Actions UI, choose an environment, and the same build-and-deploy pipeline runs against that environment’s App Service.

**Why this priority**: Manual dispatch is a safety valve for operational scenarios and multi-environment promotion. It reuses the entire P1 pipeline, only adding an entry point.

**Independent Test**: From **Actions → 003 Deploy API to Azure → Run workflow**, select `qa`, click **Run workflow**, and verify the workflow deploys to the QA App Service (`vars.APP_SERVICE_NAME` resolved against the `qa` GitHub environment).

**Acceptance Scenarios**:

1. **Given** the workflow declares a `workflow_dispatch` trigger with an `environment` choice input, **When** an operator selects an environment and runs the workflow, **Then** the job binds to that GitHub environment and deploys to its `APP_SERVICE_NAME`.
2. **Given** an in-progress run for the same branch is still executing, **When** a newer run is triggered, **Then** the older run is cancelled via the workflow-level concurrency group (`${{ github.workflow }}-${{ github.ref }}`, `cancel-in-progress: true`).

---

### Edge Cases

- What happens if `dotnet publish` fails (compilation error)? The workflow MUST fail fast before the Azure login or deploy steps run.
- What happens if `APP_SERVICE_NAME` is unset for the selected environment? `azure/webapps-deploy@v3` MUST fail with a clear missing-input error; no partial deployment occurs.
- What happens if the `AZURE_CREDENTIALS` secret is missing or invalid? `azure/login@v1` MUST fail and short-circuit the deploy step.
- What happens if a newer push arrives mid-deploy? The concurrency group cancels the in-flight run; only the latest commit reaches the App Service.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The workflow file MUST live at `.github/workflows/003-deploy-api.yml`.
- **FR-002**: The workflow MUST trigger automatically on every `push` to the `main` branch.
- **FR-003**: The workflow MUST also be triggerable via `workflow_dispatch` with a required `environment` choice input (`dev`, `qa`, `prod`; default `dev`), matching the pattern in `001-deploy-infra.yml`.
- **FR-004**: The workflow MUST define a workflow-level concurrency group `${{ github.workflow }}-${{ github.ref }}` with `cancel-in-progress: true`.
- **FR-005**: The deploy job MUST set `environment: ${{ github.event.inputs.environment || 'dev' }}` so GitHub environment-scoped variables (e.g., `APP_SERVICE_NAME`) resolve correctly.
- **FR-006**: The job MUST run `actions/checkout@v4` to fetch the source.
- **FR-007**: The job MUST run `actions/setup-dotnet@v4` with `dotnet-version: 10.0.x`.
- **FR-008**: The job MUST run `dotnet publish src/ai-genius-api/ai-genius-api.csproj` with `--configuration Release`, `--runtime linux-x64`, `--self-contained true`, and an explicit `--output` directory.
- **FR-009**: The job MUST package the publish output into a single zip file (`publish.zip`) suitable for Zip Deploy.
- **FR-010**: The job MUST authenticate to Azure using `azure/login@v1` with `creds: ${{ secrets.AZURE_CREDENTIALS }}`, matching the convention in `001-deploy-infra.yml`.
- **FR-011**: The job MUST deploy the zip to Azure App Service using `azure/webapps-deploy@v3` with `app-name: ${{ vars.APP_SERVICE_NAME }}` and `package: ./publish.zip`.
- **FR-012**: The workflow MUST fail fast: any failing step (publish, zip, login, deploy) MUST stop the run with a non-zero exit code.

### Key Entities

- **GitHub Actions Workflow**: `.github/workflows/003-deploy-api.yml` — single job (`deploy-api`) that builds and deploys the API.
- **.NET Publish Artifact**: `linux-x64` self-contained publish output for `src/ai-genius-api`, packaged as `publish.zip`.
- **Azure App Service**: The Linux B1 App Service whose name is supplied by the per-environment GitHub variable `APP_SERVICE_NAME`.
- **Azure Credentials Secret**: `AZURE_CREDENTIALS` — service principal JSON used by `azure/login@v1`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every push to `main` results in a `003 Deploy API to Azure` workflow run that completes (success or failure) within 10 minutes with no manual intervention.
- **SC-002**: On a successful run, the deployed App Service responds with the latest committed code on its default hostname within 2 minutes of workflow completion.
- **SC-003**: 100% of deploy steps use Zip Deploy (`publish.zip`) via `azure/webapps-deploy@v3` — no alternate deploy mechanisms are introduced.
- **SC-004**: Manual `workflow_dispatch` runs targeting `qa` or `prod` deploy to the App Service identified by the matching GitHub environment’s `APP_SERVICE_NAME` variable, verifiable by the workflow run log.
- **SC-005**: A failed publish, zip, login, or deploy step causes the workflow to halt with a non-zero exit code; no partial deployment is left behind.

## Assumptions

- The Bicep-provisioned Linux B1 App Service already exists for each target environment and its name is exposed via the per-environment GitHub variable `APP_SERVICE_NAME`.
- `AZURE_CREDENTIALS` is configured as a repository secret containing a service principal JSON with permission to deploy to the App Service (matches `001-deploy-infra.yml`).
- The API project `src/ai-genius-api/ai-genius-api.csproj` targets .NET 10 and builds cleanly with `dotnet publish -r linux-x64 --self-contained true -c Release`.
- The default branch is `main`; no other branch triggers an automatic deploy.
- Push-triggered runs default to the `dev` environment; `qa` and `prod` are reached only via manual `workflow_dispatch`.
