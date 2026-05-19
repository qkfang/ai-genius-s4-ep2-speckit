# Feature Specification: Backend API CI/CD Pipeline

**Feature Branch**: `003-api-deploy`  
**Created**: 2026-03-22  
**Status**: Draft  
**Input**: User description: "Deploy the AI Genius backend API via GitHub Actions."

## Clarifications

### Session 2026-03-22

- Q: Which environment value set should the workflow accept on `workflow_dispatch`? → A: Use the short-form values `dev`, `qa`, `prod` directly (matching the existing `001-deploy-infra.yml` pattern), defaulting to `dev`.
- Q: Should the API pipeline depend on a prior infrastructure run, or stand alone? → A: Stand alone. The workflow assumes the target App Service already exists (provisioned by `001-deploy-infra.yml`) and reads its name from a repository/environment variable.
- Q: How should the .NET API be packaged for App Service? → A: Build with `dotnet publish -c Release -r linux-x64 --self-contained true` and upload the publish output directory to App Service via `azure/webapps-deploy@v3`.
- Q: How should concurrent runs on the same branch be handled? → A: Use a concurrency group scoped to the workflow and branch with `cancel-in-progress: true`, so a newer push supersedes an in-flight run.
- Q: How should the workflow authenticate to Azure? → A: Use `azure/login@v1` with the existing `AZURE_CREDENTIALS` repository secret, matching the convention used by `001-deploy-infra.yml`.

### Session 2026-05-19

- Q: Which .NET version does the API target? → A: .NET 10.
- Q: What App Service Plan SKU/OS hosts the API, and which App Service deployment mode is used? → A: Linux App Service Plan with SKU `B1`, deployed via Zip Deploy.
- Q: What is the exact ordered set of workflow steps for build and deploy? → A: `actions/checkout` → `actions/setup-dotnet` → `dotnet publish` → zip the publish output into a `.zip` artifact → `azure/webapps-deploy@v3` (using the zip package).
- Q: How is the target App Service name supplied to the workflow? → A: It is read from the GitHub Actions variable `vars.APP_SERVICE_NAME` (configured per repository/environment), not composed at runtime from other variables.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automated API Deployment on Code Push (Priority: P1)

A developer merges a backend change to the `main` branch. Without any manual intervention, the CI/CD pipeline triggers, restores and builds the .NET 10 API project located at `src/ai-genius-api`, publishes the output, packages it into a `.zip` artifact, authenticates to Azure, and deploys the zip to the target Linux B1 Azure App Service using Zip Deploy. The pipeline completes successfully and the new code is live on the App Service.

**Why this priority**: This is the core value of the feature. Continuous delivery of backend changes to a running environment is the primary outcome.

**Independent Test**: Can be fully tested by pushing a commit that changes a visible response (e.g., a `/health` endpoint version string) to `main`, then calling the App Service URL after the workflow completes and verifying the new response.

**Acceptance Scenarios**:

1. **Given** a commit is merged to `main`, **When** the workflow runs, **Then** the .NET 10 API is published, zipped, and deployed via Zip Deploy to the target Linux B1 Azure App Service.
2. **Given** a successful deployment, **When** the App Service URL is requested, **Then** it serves the freshly deployed build of the API.
3. **Given** the API project fails to build, **When** the workflow runs, **Then** the deployment step does not execute and the workflow fails with a clear error.

---

### User Story 2 - Manual API Deployment via Workflow Dispatch (Priority: P2)

A developer or operator needs to (re)deploy the API on demand — for example to a non-default environment, to roll forward after a hotfix, or to recover from a failed automated run. They trigger the pipeline manually from the GitHub Actions UI, pick a target environment (`dev`, `qa`, or `prod`), and the same build and deploy steps execute against the selected environment's App Service.

**Why this priority**: Manual triggering is a safety valve for operational scenarios and per-environment promotion. It reuses the automated build/deploy logic of P1 but adds a manual entry point with environment selection.

**Independent Test**: Can be fully tested by using the "Run workflow" button in the GitHub Actions UI, selecting an environment other than the default, and verifying that the corresponding App Service receives the new build.

**Acceptance Scenarios**:

1. **Given** the `workflow_dispatch` trigger is configured, **When** a user clicks "Run workflow" and selects an environment, **Then** the API is built and deployed to that environment's App Service.
2. **Given** no environment is selected (push trigger), **When** the workflow runs, **Then** it deploys to the default `dev` environment.

---

### User Story 3 - Concurrency-Safe Deployments (Priority: P3)

Two pushes to `main` arrive in quick succession. The first run is mid-build when the second run is queued. The workflow's concurrency policy cancels the in-flight run so that only the latest commit is deployed, preventing an older artifact from overwriting a newer one due to race conditions.

**Why this priority**: This is a correctness/safety property that prevents stale code from being deployed. It is straightforward to configure but important for predictable behavior.

**Independent Test**: Trigger two runs in rapid succession (e.g., two pushes within a few seconds) and verify in the Actions UI that the older run is cancelled and only the most recent commit reaches the App Service.

**Acceptance Scenarios**:

1. **Given** a deployment is already running for `main`, **When** a new push to `main` arrives, **Then** the in-flight run is cancelled and the new run proceeds.
2. **Given** concurrent runs are cancelled, **When** the latest run completes successfully, **Then** the App Service reflects the commit from the latest run only.

---

### Edge Cases

- What happens when the target App Service does not exist in the selected environment? The `azure/webapps-deploy@v3` step must fail with a clear error indicating that infrastructure (`001-deploy-infra.yml`) has not yet been run for that environment.
- What happens when `dotnet publish` succeeds but produces an empty or invalid output directory? The zip packaging step (or the subsequent deploy step) should fail because there is no valid artifact to upload; the workflow must surface the failure rather than reporting a false success.
- What happens when the Azure login step fails (expired or misconfigured credentials)? The workflow must fail fast with an authentication error and not attempt to deploy.
- What happens when a run is cancelled mid-deployment by the concurrency group? The next run that completes will overwrite the App Service contents with its own publish output; App Service swap/replace semantics ensure the service ends in a consistent state.
- What happens when a `workflow_dispatch` run targets `prod`? The same build/publish/deploy steps run; environment-specific protection rules (if configured on the GitHub `prod` environment) gate the deployment.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The pipeline MUST trigger automatically on every push to the `main` branch.
- **FR-002**: The pipeline MUST be triggerable manually via the `workflow_dispatch` event from the GitHub Actions UI, accepting an `environment` input of type `choice` with allowed values `dev`, `qa`, and `prod` (defaulting to `dev`).
- **FR-003**: The workflow file MUST be created at `.github/workflows/003-deploy-api.yml`.
- **FR-004**: The pipeline MUST authenticate to Azure using the `azure/login@v1` action and the `AZURE_CREDENTIALS` repository secret, matching the convention used by `.github/workflows/001-deploy-infra.yml`.
- **FR-005**: The pipeline MUST install the .NET 10 SDK using `actions/setup-dotnet`, then restore and build the .NET API project located at `src/ai-genius-api/ai-genius-api.csproj`.
- **FR-006**: The pipeline MUST publish the API using `dotnet publish` with configuration `Release`, producing a deployable output directory, and MUST then package that output directory into a single `.zip` artifact for Zip Deploy.
- **FR-007**: The pipeline MUST deploy the zipped publish artifact to Azure App Service using `azure/webapps-deploy@v3` in Zip Deploy mode (passing the `.zip` package to the action), targeting the App Service name resolved for the selected environment.
- **FR-008**: The pipeline MUST resolve the target App Service name from the GitHub Actions variable `vars.APP_SERVICE_NAME` (configured at the repository level or scoped to the selected GitHub environment), and the resolved value MUST correspond to the App Service provisioned by `001-deploy-infra.yml`.
- **FR-008a**: The workflow MUST execute the following ordered steps in the deploy job: (1) `actions/checkout`, (2) `actions/setup-dotnet` (pinned to .NET 10), (3) `dotnet publish` of `src/ai-genius-api/ai-genius-api.csproj` in `Release`, (4) zip the publish output into a `.zip` artifact, (5) `azure/login@v1`, (6) `azure/webapps-deploy@v3` deploying the `.zip` package to the App Service named by `vars.APP_SERVICE_NAME`.
- **FR-009**: The pipeline MUST scope the deployment job to a GitHub `environment` matching the selected input value (`dev`/`qa`/`prod`), enabling per-environment secrets, variables, and protection rules.
- **FR-010**: The workflow MUST define a concurrency group scoped to the workflow and triggering ref (e.g., `${{ github.workflow }}-${{ github.ref }}`) with `cancel-in-progress: true`, so that newer runs supersede in-flight runs.
- **FR-011**: The pipeline MUST fail fast on any error — failed restore, build, publish, login, or deploy — preventing partial or silent failures and ensuring the App Service is not updated with an invalid artifact.
- **FR-012**: The pipeline MUST NOT introduce any new long-lived Azure credential beyond the existing `AZURE_CREDENTIALS` secret already used by `001-deploy-infra.yml`.
- **FR-013**: When triggered by a push to `main` (no manual input provided), the pipeline MUST default the `ENVIRONMENT` value to `dev`, mirroring the default behavior of `001-deploy-infra.yml`.

### Key Entities

- **GitHub Actions Workflow**: The automation file `.github/workflows/003-deploy-api.yml` containing a single deploy job that builds, publishes, and deploys the .NET API.
- **.NET API Project**: The backend project at `src/ai-genius-api/ai-genius-api.csproj`, targeting .NET 10, published and packaged into a `.zip` artifact for Zip Deploy.
- **Azure App Service**: The target compute resource (one per environment) provisioned by `001-deploy-infra.yml`, hosted on a Linux App Service Plan with SKU `B1`, identified by name via the GitHub Actions variable `vars.APP_SERVICE_NAME` and updated via Zip Deploy.
- **GitHub Environment**: One of `dev`, `qa`, or `prod`, used to scope environment-specific variables, secrets, and protection rules to the deployment job.
- **Azure Credentials Secret**: The repository secret `AZURE_CREDENTIALS` consumed by `azure/login@v1` to authenticate the deploy job to Azure.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every push to `main` results in an API deployment pipeline run completing (success or failure) within 10 minutes with no manual intervention required.
- **SC-002**: 100% of successful pipeline runs result in the target App Service serving the build produced from the triggering commit, verifiable by inspecting a version or health endpoint immediately after deployment.
- **SC-003**: Engineers can trigger an on-demand API deployment to any of `dev`, `qa`, or `prod` in under 2 minutes of elapsed time from clicking "Run workflow" to the pipeline starting.
- **SC-004**: When two runs are triggered on the same branch within a short interval, only the latest run completes a deployment; the older run is cancelled, verifiable in the GitHub Actions run history.
- **SC-005**: A failed build, publish, or deploy step causes the workflow to halt with a non-zero exit code, preventing a broken artifact from being uploaded to App Service.
- **SC-006**: No new long-lived Azure credentials are introduced in repository secrets; the workflow reuses the existing `AZURE_CREDENTIALS` secret, verifiable by reviewing the repository secrets list before and after this feature.

## Assumptions

- The Azure App Service for each environment (`dev`, `qa`, `prod`) has already been provisioned by `.github/workflows/001-deploy-infra.yml` on a Linux App Service Plan with SKU `B1` prior to running this workflow; this pipeline does not create infrastructure.
- The repository (or each GitHub environment) defines the variable `vars.APP_SERVICE_NAME` resolving to the exact name of the target App Service for that environment.
- The `AZURE_CREDENTIALS` secret already exists in the repository (added as part of the `001-bicep-deploy` feature) and grants permission to deploy to all three target App Services.
- The .NET 10 SDK is installed via `actions/setup-dotnet`; the project's `TargetFramework` in `src/ai-genius-api/ai-genius-api.csproj` is set to `net10.0`.
- App Service is configured for Linux (B1) and runs the deployed application from the uploaded `.zip` package via Zip Deploy.
- Default behavior for automated push triggers is to deploy to `dev`; promotion to `qa` and `prod` occurs through manual `workflow_dispatch` runs (and any GitHub environment protection rules configured on those environments).
- This feature only defines the specification document; the workflow file `.github/workflows/003-deploy-api.yml` will be created in a subsequent implementation step, not as part of this spec task.
