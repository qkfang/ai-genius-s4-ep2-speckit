# Feature Specification: AI Genius Backend API Deployment Workflow

**Feature Branch**: `002-deploy-ai-genius`  
**Created**: 2025-01-28  
**Status**: Draft  
**Input**: User description: "Deploy the AI Genius backend API via GitHub Actions. The backend is a .NET API in src/ai-genius-api. Create a GitHub Actions workflow (.github/workflows/deploy-api.yml) that: 1) Triggers on every push to main. 2) Builds the .NET API project. 3) Deploys the API to Azure App Service using azure/webapps-deploy@v3"

## Clarifications

### Session 2026-05-16

- Q: What .NET runtime version targets the API build/deploy? → A: .NET 8+ (workflow uses .NET 8 or newer SDK)
- Q: What App Service Plan size/OS is used? → A: Linux B1
- Q: What deployment mechanism is used to publish to Azure App Service? → A: Zip deploy
- Q: Which GitHub secrets are used for Azure authentication? → A: AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_SUBSCRIPTION_ID (OIDC federated login)
- Q: What is the canonical workflow step sequence? → A: checkout → setup-dotnet → dotnet publish → zip artifact → azure/webapps-deploy@v3
- Q: How is the App Service name supplied to the workflow? → A: Output from Bicep or configured as GitHub variable APP_SERVICE_NAME

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automated Deployment on Push to Main (Priority: P1)

As a developer on the AI Genius team, when I merge a change into the `main` branch of the repository, the backend API is automatically built and published to the team's Azure App Service environment without anyone running deployment steps by hand.

**Why this priority**: This is the entire purpose of the feature. Without an automated push-to-main deployment, every change to the backend would still require a manual build/upload, defeating the goal of continuous delivery for the API.

**Independent Test**: Can be fully tested by pushing a small, observable change (e.g., a version string or health-check response) to `main` and confirming the running App Service serves the new content within the expected window, with the workflow run visible and successful in the GitHub Actions UI.

**Acceptance Scenarios**:

1. **Given** a developer has push access and a working API change, **When** the change is merged into `main`, **Then** a deployment workflow run starts automatically without any manual trigger.
2. **Given** the workflow run completes successfully, **When** a user calls the deployed API endpoint, **Then** the response reflects the newly merged code.
3. **Given** the workflow is triggered, **When** the build step fails (e.g., compilation error), **Then** the deployment step does not run and the workflow is reported as failed in GitHub.

---

### User Story 2 - Visible Build and Deployment Status (Priority: P2)

As a team member reviewing the health of the project, I can see in GitHub whether the latest change to `main` was successfully built and deployed, and I can drill into the logs of any failed step to diagnose the issue.

**Why this priority**: Visibility into deployment health is required for the team to trust the automation; without it, a silent failure could mean `main` and the deployed environment drift apart unnoticed. It is a strong supporting capability but secondary to the deployment itself working.

**Independent Test**: Can be tested by intentionally introducing a build error, pushing to `main`, and confirming the workflow run is marked failed in GitHub with logs that clearly indicate the failing step.

**Acceptance Scenarios**:

1. **Given** a workflow run has completed, **When** a team member opens the Actions tab in GitHub, **Then** they can see the run, its status (success/failure), and the commit that triggered it.
2. **Given** a step in the workflow fails, **When** a team member opens the run, **Then** logs for the failing step are available and identify which stage (build vs. deploy) failed.

---

### User Story 3 - Safe, Repeatable Deployments (Priority: P3)

As a maintainer, I can be confident that re-running the workflow (e.g., after a transient Azure error) will produce a consistent deployment of the current `main` commit, and that deployment credentials are not exposed in logs or source code.

**Why this priority**: Reliability and credential hygiene matter, but they are refinements on top of the core "deploy on push" capability and can be hardened iteratively.

**Independent Test**: Can be tested by re-running a previously successful workflow for the same commit and confirming the App Service still serves the same build, and by inspecting workflow logs to confirm no secret values are printed.

**Acceptance Scenarios**:

1. **Given** a workflow has previously deployed commit X, **When** the same workflow is re-run for commit X, **Then** the App Service ends up running the same code, with no manual intervention required.
2. **Given** the workflow uses an Azure deployment credential, **When** any team member inspects the workflow file or the run logs, **Then** the credential value is not present in plain text (only referenced as a secret).

---

### Edge Cases

- What happens when a push to `main` contains no changes to the API project (e.g., only documentation or unrelated files)? The workflow still runs, builds the API, and deploys; the result is a no-op redeployment of the same code.
- How does the system handle a failed build (compilation or test failure)? The deployment step MUST NOT execute, and the workflow MUST be reported as failed.
- How does the system handle a failed deployment after a successful build (e.g., Azure outage, invalid publish profile)? The workflow MUST be reported as failed, the App Service MUST be left in its previous state, and logs MUST indicate the deployment step as the failure point.
- What happens when two pushes land on `main` in quick succession? Each push triggers its own workflow run; the later-completing run determines the final deployed state. Ordering guarantees beyond GitHub's default behavior are out of scope.
- What happens if the required Azure secret is missing or expired? The deployment step MUST fail with a clear error and MUST NOT partially deploy.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The repository MUST contain a GitHub Actions workflow file at `.github/workflows/deploy-api.yml` dedicated to deploying the AI Genius backend API.
- **FR-002**: The workflow MUST trigger automatically on every push to the `main` branch.
- **FR-003**: The workflow MUST also be runnable on demand (manual `workflow_dispatch`) so maintainers can redeploy without pushing a new commit.
- **FR-004**: The workflow MUST build the .NET API project located at `src/ai-genius-api` using a .NET 8 (or newer) SDK before any deployment step runs.
- **FR-005**: The workflow MUST produce a publishable artifact of the API (release configuration) packaged as a zip suitable for zip deployment to Azure App Service.
- **FR-006**: If the build step fails, the workflow MUST NOT execute the deployment step and MUST report an overall failed status.
- **FR-007**: The workflow MUST deploy the built API to a Linux B1 Azure App Service instance using the `azure/webapps-deploy@v3` action via zip deploy.
- **FR-008**: The workflow MUST authenticate to Azure using OIDC federated credentials referenced by the GitHub repository secrets `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, and `AZURE_SUBSCRIPTION_ID`; no credentials may be hard-coded in the workflow file or printed to logs.
- **FR-009**: The target Azure App Service name MUST be supplied either from a Bicep deployment output or from a GitHub repository variable named `APP_SERVICE_NAME`, so the same workflow can be retargeted without code changes to the API.
- **FR-010**: The workflow MUST report success only when both the build and the `azure/webapps-deploy@v3` step complete successfully.
- **FR-011**: The workflow run history MUST be visible in the GitHub Actions UI, including which commit and actor triggered each run.
- **FR-012**: The workflow MUST execute the following canonical step sequence: `actions/checkout` → `actions/setup-dotnet` → `dotnet publish` → zip the publish output as an artifact → `azure/webapps-deploy@v3` (zip deploy).

### Key Entities

- **Backend API Project**: The .NET web API (targeting .NET 8 or newer) located at `src/ai-genius-api`; the unit that is built and deployed by the workflow.
- **Deployment Workflow**: The GitHub Actions workflow defined at `.github/workflows/deploy-api.yml`; the orchestrator that ties build to zip-deploy on every push to `main`.
- **Azure App Service Instance**: The hosted Linux B1 App Service runtime that receives the deployed API; identified by an App Service name sourced from a Bicep output or the `APP_SERVICE_NAME` GitHub variable, within the resource group provisioned by the infra workflow.
- **Azure Deployment Credential**: OIDC federated credentials referenced by the GitHub repository secrets `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, and `AZURE_SUBSCRIPTION_ID`, granting the workflow permission to publish to the target App Service.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of pushes to `main` automatically start a deployment workflow run within 1 minute of the push being recorded, with no manual action required.
- **SC-002**: For a successful workflow run, the deployed API reflects the newly merged code within 10 minutes of the push to `main`, measured end-to-end from push timestamp to the App Service serving the new build.
- **SC-003**: When the .NET build fails, the workflow reports failure and performs zero deployment actions in 100% of cases (no partial deploys).
- **SC-004**: Manual deployment effort for routine API changes drops to zero: team members no longer need to run local publish or `az` commands to deploy `main` to the target App Service environment.
- **SC-005**: Zero deployment credentials appear in plain text in the repository or in workflow run logs across all runs.

## Assumptions

- The team is willing to deploy every commit on `main` directly to the configured App Service environment (no separate staging gate within this workflow); environment promotion beyond `main` is out of scope for this feature.
- An Azure App Service instance for the API (Linux B1 plan) has already been provisioned (or will be provisioned by the existing `deploy-infra.yml` / Bicep workflow), and its name is exposed either as a Bicep deployment output or as the `APP_SERVICE_NAME` GitHub repository variable.
- The OIDC federated credentials referenced by the GitHub secrets `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, and `AZURE_SUBSCRIPTION_ID` have, or will be granted, sufficient permissions to publish to the target App Service via zip deploy; no new secret rotation process is introduced by this feature.
- The default environment for automatic deployments is `dev`, matching the default in `deploy-infra.yml`; non-default environments are reached via manual `workflow_dispatch`.
- The .NET API project at `src/ai-genius-api/ai-genius-api.csproj` builds cleanly with `dotnet build` / `dotnet publish` on the standard `ubuntu-latest` runner using a .NET 8 (or newer) SDK installed via `actions/setup-dotnet`.
- Database migrations, configuration changes, and infrastructure changes are handled by other workflows or processes and are not the responsibility of this workflow.
