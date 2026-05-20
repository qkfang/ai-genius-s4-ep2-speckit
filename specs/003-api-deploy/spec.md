---
feature: 003-api-deploy
risk: low
breaking: false
reviewer-team: spec-reviewer
---

# Feature Specification: Backend API Deployment via GitHub Actions

**Feature Branch**: `003-api-deploy`  
**Created**: 2026-05-20  
**Status**: Draft  
**Input**: User description: "Deploy the AI Genius backend API via GitHub Actions. The backend is a .NET API in `src/ai-genius-api`. New GitHub Actions workflow (.github/workflows/003-deploy-api.yml). Follow the ENVIRONMENT & concurrency like `001-deploy-infra.yml`. Triggers on every push to main. Builds the .NET API project as linux-x64 & self-contained. Deploys the API to Azure App Service using `azure/webapps-deploy@v3`."

## Clarifications

### Session 2026-05-20

- Q: Which .NET runtime version does the API target? → A: .NET 10 (`net10.0`, matches `src/ai-genius-api/ai-genius-api.csproj`).
- Q: Which App Service Plan SKU and deployment mode are used? → A: Linux B1 plan; Zip deploy via `azure/webapps-deploy@v3`.
- Q: What is the exact build/deploy step sequence? → A: `checkout` → `setup-dotnet` → `dotnet publish` (linux-x64, self-contained) → zip the publish output → `azure/webapps-deploy@v3`.
- Q: How is the target App Service name supplied to the workflow? → A: Read from GitHub repository variable `APP_SERVICE_NAME` (configured per environment).
- Q: Which environment input and concurrency pattern is used? → A: Same as `001-deploy-infra.yml` — `workflow_dispatch` input `environment` (choice: `dev`, `qa`, `prod`, default `dev`); concurrency group `${{ github.workflow }}-${{ github.ref }}` with `cancel-in-progress: true`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automated API Deployment on Push to Main (Priority: P1)

A developer merges a change to the `main` branch. The CI/CD pipeline automatically builds the .NET API in `src/ai-genius-api`, packages it as a self-contained linux-x64 zip artifact, authenticates to Azure, and deploys the package to the configured Azure App Service. The deployed API immediately serves the new build.

**Why this priority**: Core value of the feature — every backend change must reach Azure App Service without manual intervention.

**Independent Test**: Push an empty commit to `main`, verify the workflow runs to success, and confirm the App Service returns the new build's response (`/` or any health endpoint).

**Acceptance Scenarios**:

1. **Given** a commit lands on `main`, **When** the workflow runs, **Then** the API is built, zipped, and deployed to the App Service named by `vars.APP_SERVICE_NAME`.
2. **Given** the build succeeds, **When** `azure/webapps-deploy@v3` runs, **Then** the App Service shows the new package and responds successfully on its public URL.
3. **Given** a previous run is still in progress for the same branch, **When** a new run starts, **Then** the older run is cancelled by the concurrency group.

---

### User Story 2 - Manual Environment-Targeted Deployment (Priority: P2)

An operator triggers the workflow manually from the GitHub Actions UI and selects a target environment (`dev`, `qa`, or `prod`). The workflow deploys to the App Service configured for that environment.

**Why this priority**: Enables hotfix and re-deploy scenarios without requiring a code change.

**Independent Test**: Use **Run workflow** in the Actions UI, pick `qa`, and confirm the deployment lands on the QA App Service.

**Acceptance Scenarios**:

1. **Given** the `workflow_dispatch` trigger is configured with an `environment` choice input, **When** an operator selects `qa`, **Then** the workflow uses the QA environment's `APP_SERVICE_NAME` variable.
2. **Given** a push event runs the workflow, **When** no environment input is provided, **Then** the workflow defaults to `dev`.

---

### Edge Cases

- If `vars.APP_SERVICE_NAME` is empty for the selected environment, `azure/webapps-deploy@v3` will fail fast with a clear error.
- If `dotnet publish` fails (build errors), the workflow halts before any deploy step runs.
- If a deploy is in progress and a new commit lands, the concurrency group cancels the in-flight run.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The workflow file MUST live at `.github/workflows/003-deploy-api.yml`.
- **FR-002**: The workflow MUST trigger on every push to `main` and on `workflow_dispatch` with an `environment` choice input (`dev`, `qa`, `prod`; default `dev`).
- **FR-003**: The workflow MUST define a concurrency group `${{ github.workflow }}-${{ github.ref }}` with `cancel-in-progress: true`.
- **FR-004**: The workflow MUST resolve the selected environment via `${{ github.event.inputs.environment || 'dev' }}` and bind the job to that GitHub Environment.
- **FR-005**: The workflow MUST build `src/ai-genius-api/ai-genius-api.csproj` using `dotnet publish -c Release -r linux-x64 --self-contained true` targeting .NET 10.
- **FR-006**: The workflow MUST zip the publish output into a single deployable artifact.
- **FR-007**: The workflow MUST authenticate to Azure using `azure/login@v1` with `secrets.AZURE_CREDENTIALS`.
- **FR-008**: The workflow MUST deploy the zip artifact to App Service `vars.APP_SERVICE_NAME` using `azure/webapps-deploy@v3`.
- **FR-009**: The workflow MUST fail fast on any failed step.

### Key Entities

- **GitHub Actions Workflow**: `.github/workflows/003-deploy-api.yml`, single job that builds and deploys the API.
- **.NET API Project**: `src/ai-genius-api/ai-genius-api.csproj` (TargetFramework `net10.0`).
- **Azure App Service**: Linux B1 plan host; name supplied via `vars.APP_SERVICE_NAME`.

## Success Criteria *(mandatory)*

- **SC-001**: Every push to `main` deploys the API to the dev App Service within 10 minutes.
- **SC-002**: Manual `workflow_dispatch` runs deploy to the selected environment's App Service.
- **SC-003**: The deployed App Service serves the newly built API package (verifiable via response from the public URL).
- **SC-004**: No long-lived credentials are added; the workflow reuses existing `AZURE_CREDENTIALS`, `APP_SERVICE_NAME` settings.

## Assumptions

- `vars.APP_SERVICE_NAME` is configured per GitHub Environment (`dev`, `qa`, `prod`).
- `secrets.AZURE_CREDENTIALS` exists and grants deploy rights to the target App Service.
- The Azure App Service Plan (Linux B1) and App Service already exist (provisioned by `001-deploy-infra.yml`).
- The runner image includes the .NET 10 SDK via `actions/setup-dotnet@v4` with `dotnet-version: 10.0.x`.
