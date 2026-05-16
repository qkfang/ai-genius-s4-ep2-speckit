# Feature Specification: Deploy AI Genius Backend API via GitHub Actions

**Feature Branch**: `002-deploy-api`  
**Created**: 2026-05-16  
**Status**: Draft  
**Input**: User description: "Deploy the AI Genius backend API via GitHub Actions. The backend is a .NET API in `src/ai-genius-api`. New GitHub Actions workflow (.github/workflows/003-deploy-api.yml), follow the ENVIRONMENT & concurrency like `001-deploy-infra.yml`, triggers on every push to main, builds the .NET API project as linux-x64 & self-contained, deploys the API to Azure App Service using `azure/webapps-deploy@v3`."

## Clarifications

### Session 2026-05-16

- Q: Which .NET version targets the API? → A: .NET 10
- Q: What hosting tier is the App Service Plan? → A: Linux B1
- Q: Which deployment method does `azure/webapps-deploy@v3` use? → A: Zip deploy
- Q: What is the ordered set of workflow steps? → A: checkout → setup-dotnet → dotnet publish → zip artifact → azure/webapps-deploy@v3
- Q: How is the App Service name supplied? → A: GitHub Actions variable `APP_SERVICE_NAME` (environment-scoped)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automatic API deployment on merge to main (Priority: P1)

As a developer on the AI Genius team, every time my pull request is merged to `main`, the backend API should automatically be built and deployed to the dev Azure App Service instance, so that the running environment always reflects the latest code without requiring any manual steps.

**Why this priority**: This is the core value of the feature. Without automated deployment on push to `main`, the team must deploy manually, which is slow, error-prone, and causes drift between source and running code. All other capabilities (multi-env support, build correctness) only matter if this base flow works.

**Independent Test**: Merge any trivial change (e.g., a comment) into `main` and verify that (a) the workflow named "003 Deploy API to Azure App Service" runs automatically, (b) it completes successfully, and (c) the App Service is serving the new build (e.g., a version/health endpoint reflects the new commit).

**Acceptance Scenarios**:

1. **Given** a clean `main` branch with the workflow installed, **When** a commit is pushed to `main`, **Then** the deploy-API workflow is triggered automatically.
2. **Given** the workflow is running, **When** the build step completes, **Then** the API has been published as a Linux x64, self-contained artifact suitable for direct execution on the App Service runtime.
3. **Given** a successful build, **When** the deploy step completes, **Then** the configured Azure App Service is updated and the new version responds to HTTP requests at its public URL.

---

### User Story 2 - On-demand deployment to a selected environment (Priority: P2)

As a release engineer, I want to manually trigger the API deployment from the GitHub Actions UI and choose the target environment (`dev`, `qa`, or `prod`), so that I can promote or redeploy a build without pushing a new commit.

**Why this priority**: Push-to-main covers the common case, but real release operations (hotfix to prod, redeploy after rotating secrets, promote a green build to qa) require explicit manual control. This is consistent with how `001-deploy-infra.yml` already operates and keeps the API workflow's UX aligned with the rest of the pipeline.

**Independent Test**: Open the workflow in the GitHub Actions UI, click "Run workflow", select `qa`, and confirm that the run uses the `qa` GitHub Environment (with its variables/secrets) and deploys to the `qa` App Service.

**Acceptance Scenarios**:

1. **Given** the workflow exists on `main`, **When** a user opens it in the Actions UI, **Then** a "Run workflow" control is available with an `environment` choice of `dev`, `qa`, or `prod` (default `dev`).
2. **Given** a manual run with `environment = qa`, **When** the job executes, **Then** it runs under the `qa` GitHub Environment so that environment-scoped variables and secrets are applied and any required approvals/protections take effect.
3. **Given** a push to `main` (no manual input), **When** the workflow runs, **Then** it targets the `dev` environment by default.

---

### User Story 3 - Safe handling of overlapping runs (Priority: P3)

As a team, when several commits land on `main` in quick succession, we don't want multiple API deploys racing against each other and producing unpredictable results in App Service.

**Why this priority**: Concurrency control prevents bad states but isn't required to prove the workflow works end-to-end. It's a hardening behavior that matches the convention already established in `001-deploy-infra.yml`.

**Independent Test**: Push two commits to `main` within a few seconds of each other and verify that the earlier in-progress run is cancelled in favor of the later one, leaving exactly one successful deployment of the latest commit.

**Acceptance Scenarios**:

1. **Given** an in-progress API deploy on `main`, **When** a new commit is pushed to `main`, **Then** the in-progress run is cancelled and a fresh run begins for the new commit.
2. **Given** two pushes to different branches (hypothetically), **When** workflows run, **Then** they do not block each other because concurrency is scoped per workflow + ref.

---

### Edge Cases

- **Build failure**: If `dotnet publish` fails (compile error, restore failure), the workflow must stop before the deploy step and surface a clearly failed run; the existing App Service deployment must remain untouched.
- **Missing environment configuration**: If the selected environment is missing required configuration (App Service name, Azure credentials), the run must fail with a clear, actionable error rather than silently deploying to the wrong target.
- **Authentication failure to Azure**: If the Azure login step fails, the deploy step must not run.
- **Deployment failure**: If `azure/webapps-deploy` fails mid-deploy, the workflow must be marked as failed and the failure must be visible in the Actions UI.
- **Manual trigger from a non-`main` ref**: The workflow may be dispatched manually from any branch via `workflow_dispatch`; the deployment must still target the environment the user selected, not be silently rerouted.
- **Concurrent push and manual dispatch**: When automatic (push) and manual (dispatch) runs would overlap on the same ref, only the latest run proceeds.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The repository MUST include a new GitHub Actions workflow file at `.github/workflows/003-deploy-api.yml` dedicated to building and deploying the backend API.
- **FR-002**: The workflow MUST be triggered automatically on every push to the `main` branch.
- **FR-003**: The workflow MUST also support manual invocation (`workflow_dispatch`) with an `environment` input of `dev`, `qa`, or `prod`, defaulting to `dev`, matching the pattern used by `001-deploy-infra.yml`.
- **FR-004**: The workflow MUST execute its deploy job within a GitHub Environment named after the selected environment (`dev` by default), so that environment-scoped variables, secrets, and protection rules apply.
- **FR-005**: The workflow MUST apply a concurrency group keyed on workflow + git ref with `cancel-in-progress: true`, mirroring `001-deploy-infra.yml`, so superseded runs are cancelled.
- **FR-006**: The workflow MUST build the .NET project located at `src/ai-genius-api/ai-genius-api.csproj` in `Release` configuration using the .NET 10 SDK, targeting `linux-x64`, as a self-contained publish, producing a deployable output directory.
- **FR-007**: The workflow MUST package the published output as a zip artifact suitable for the zip-deploy method used by `azure/webapps-deploy@v3`.
- **FR-008**: The workflow MUST authenticate to Azure using the same credentials mechanism already used by the existing infra workflow (an `AZURE_CREDENTIALS` secret consumed by the official Azure login action).
- **FR-009**: The workflow MUST deploy the zipped artifact to Azure App Service using the `azure/webapps-deploy@v3` action via zip deploy.
- **FR-010**: The target App Service name MUST be sourced from the GitHub Actions configuration variable `APP_SERVICE_NAME` (environment-scoped, not hard-coded), so that each environment (`dev`/`qa`/`prod`) resolves to its own App Service.
- **FR-011**: The workflow MUST fail fast: if any step (checkout, .NET setup, publish, packaging, Azure login, deploy) fails, subsequent steps MUST not run and the overall run MUST be marked failed.
- **FR-012**: The workflow MUST run on `ubuntu-latest` runners, consistent with sibling workflows in the repository.
- **FR-013**: The workflow MUST not require any code changes inside `src/ai-genius-api` to function (it should build the project as-is).
- **FR-014**: The workflow MUST execute the following ordered steps: (1) `actions/checkout`, (2) `actions/setup-dotnet` (installing the .NET 10 SDK), (3) `dotnet publish` of the API project, (4) zip the publish output as the deploy artifact, (5) `azure/webapps-deploy@v3` to perform a zip deploy to the target App Service.
- **FR-015**: The target Azure App Service Plan is Linux B1; the workflow's publish output and deployment method MUST remain compatible with that tier (Linux x64 runtime, zip deploy).

### Key Entities

- **GitHub Actions workflow**: The YAML file at `.github/workflows/003-deploy-api.yml`. Owns triggers, environment selection, concurrency, build, and deploy.
- **GitHub Environment (`dev`/`qa`/`prod`)**: Configuration scope holding the App Service name (variable) and Azure credentials (secret) per target. Determines which Azure App Service receives the build.
- **Build artifact**: The self-contained, Linux x64 published output of the .NET API project, packaged for upload to App Service.
- **Azure App Service instance**: The deployment target. One instance per environment, identified by name resolved from environment-scoped configuration.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of pushes to `main` automatically trigger the API deployment workflow without any manual action.
- **SC-002**: A successful end-to-end run (push → build → publish → deploy → live in App Service) completes in under 10 minutes on a clean runner.
- **SC-003**: After a successful run, the public App Service URL serves the build corresponding to the triggering commit, verifiable within 2 minutes of workflow completion.
- **SC-004**: When two pushes to `main` occur within 60 seconds, no more than one deployment ultimately reaches App Service, and it is the deployment for the latest commit (older in-progress runs are cancelled).
- **SC-005**: Manual `workflow_dispatch` runs deploy to the user-selected environment (`dev`/`qa`/`prod`) in 100% of cases, with zero cross-environment deployments observed.
- **SC-006**: When any build or deploy step fails, the workflow run is marked failed and the previously deployed App Service version continues to serve traffic unchanged (no partial/broken deploys).

## Assumptions

- Each GitHub Environment (`dev`, `qa`, `prod`) is already configured with:
  - A GitHub Actions variable named `APP_SERVICE_NAME` resolving to the target Azure App Service name.
  - An `AZURE_CREDENTIALS` secret with permission to deploy to that App Service, consistent with `001-deploy-infra.yml`.
- The Azure App Service instances are pre-provisioned by the infra workflow (`001-deploy-infra.yml`) on a Linux B1 App Service Plan and configured to host a self-contained Linux x64 .NET 10 application via zip deploy.
- The `src/ai-genius-api/ai-genius-api.csproj` project targets .NET 10 and builds cleanly with the .NET 10 SDK installed by `actions/setup-dotnet` in the workflow.
- Branch protections on `main` (if any) are out of scope; this feature only specifies what happens *once* a commit lands on `main`.
- Database migrations, configuration changes, and feature flags are out of scope for this workflow.
