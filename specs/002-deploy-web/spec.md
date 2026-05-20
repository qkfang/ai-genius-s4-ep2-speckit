# Feature Specification: React Frontend Web Deployment Workflow

**Feature Branch**: `003-002-deploy-web`  
**Created**: 2026-05-20  
**Status**: Draft  
**Input**: User description: "GitHub Actionsを使用して、AI GeniusのReactフロントエンドWebアプリをデプロイしてください。フロントエンドは `src/ai-genius-web` にあるReact + Viteアプリケーションです。新しいGitHub Actionsワークフローのファイル名は `002-deploy-web.yml` とし、`001-deploy-infra.yml` と同様の環境（ENVIRONMENT）および同時実行制御（concurrency）に従うこと。mainブランチへのプッシュごと、および `workflow_dispatch` でトリガーされるようにすること。依存関係のインストール（`npm ci`）とReactアプリのビルド（`npm run build`）を実行すること。ビルド成果物（`dist/`）をAzure Static Web Appsへデプロイすること。`azure/login@v1` アクションを使用し、`secrets.AZURE_CREDENTIALS` を利用すること。`Azure/static-web-apps-deploy@v1` アクションを使用し、`secrets.AZURE_STATIC_WEB_APPS_API_TOKEN` を利用すること。"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Automatic Frontend Deployment on Main Push (Priority: P1)

A developer merges frontend changes into the `main` branch. The AI Genius frontend deployment workflow starts automatically, prepares the web application from `src/ai-genius-web`, builds a production-ready site, and publishes the resulting `dist/` output to Azure Static Web Apps without manual deployment steps.

**Why this priority**: This is the core delivery path for frontend changes. Users only receive updated AI Genius web experiences when commits to `main` are built and deployed reliably.

**Independent Test**: Can be fully tested by pushing a harmless frontend change to `main` and verifying that the workflow runs, completes successfully, and the Azure Static Web Apps site reflects the new build.

**Acceptance Scenarios**:

1. **Given** a commit is pushed to `main`, **When** the frontend deployment workflow runs, **Then** it installs dependencies, builds the frontend, and deploys the generated `dist/` output to Azure Static Web Apps.
2. **Given** a previous run for the same branch is still active, **When** a newer `main` push starts the workflow, **Then** the older run is cancelled so only the latest commit is deployed.
3. **Given** the deployment completes successfully, **When** a user opens the AI Genius web app, **Then** the published site serves the latest frontend build.

---

### User Story 2 - Manual Frontend Deployment by Environment (Priority: P2)

A developer or operator needs to redeploy the frontend on demand, such as after updating repository configuration or recovering from a failed deployment. They start the workflow manually from GitHub Actions, choose the target environment, and the same build-and-deploy process runs using that environment's configuration.

**Why this priority**: Manual deployment gives the team a simple operational fallback without requiring an extra code change.

**Independent Test**: Can be fully tested by using the "Run workflow" action, selecting `dev`, `qa`, or `prod`, and verifying the workflow uses the selected environment throughout the run.

**Acceptance Scenarios**:

1. **Given** the workflow is available in GitHub Actions, **When** a user starts it manually, **Then** the workflow accepts an environment choice of `dev`, `qa`, or `prod`.
2. **Given** a manual run targets `qa` or `prod`, **When** the workflow executes, **Then** the selected environment is used consistently for environment protection and deployment configuration.

---

### User Story 3 - Secure Deployment Credentials (Priority: P3)

A repository administrator reviews the frontend deployment process. The workflow authenticates to Azure using the repository's Azure credentials secret and deploys to Azure Static Web Apps using the Static Web Apps deployment token, with no hard-coded credentials in the workflow file.

**Why this priority**: Secure credential handling is required before the workflow can be trusted for repeated deployments.

**Independent Test**: Can be fully tested by reviewing the workflow file and running the workflow with configured repository secrets, confirming no credential values are stored in source control.

**Acceptance Scenarios**:

1. **Given** required repository secrets are configured, **When** the workflow runs, **Then** Azure authentication uses `secrets.AZURE_CREDENTIALS` and Static Web Apps deployment uses `secrets.AZURE_STATIC_WEB_APPS_API_TOKEN`.
2. **Given** either required secret is missing or invalid, **When** the workflow runs, **Then** the run fails clearly before reporting a successful deployment.

### Edge Cases

- What happens when frontend dependencies cannot be installed? The workflow must fail before any deployment attempt.
- What happens when the frontend build fails? The workflow must stop and leave the previously deployed site unchanged.
- What happens when the Azure login secret is missing or invalid? The workflow must fail during authentication with a clear error.
- What happens when the Static Web Apps deployment token is missing or invalid? The workflow must fail during deployment and must not report success.
- What happens when multiple commits are pushed to `main` in quick succession? The workflow must use the same concurrency behavior as the infrastructure workflow so only the latest run for the branch continues.
- What happens when a manual run does not provide an environment value? The workflow must default to `dev`, matching the infrastructure workflow.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The repository MUST include a GitHub Actions workflow file named `.github/workflows/002-deploy-web.yml` for the AI Genius frontend deployment.
- **FR-002**: The workflow MUST trigger automatically on every push to the `main` branch.
- **FR-003**: The workflow MUST support manual `workflow_dispatch` runs with an `environment` input whose allowed values are `dev`, `qa`, and `prod`, defaulting to `dev`.
- **FR-004**: The workflow MUST define the same environment variable pattern as the infrastructure workflow, including `ENVIRONMENT` resolving to the selected manual input or `dev` for push-triggered runs.
- **FR-005**: The workflow MUST define the same concurrency behavior as the infrastructure workflow, with a group scoped to workflow name and git ref and with in-progress runs cancelled when superseded.
- **FR-006**: The workflow MUST run from the frontend application located at `src/ai-genius-web`.
- **FR-007**: The workflow MUST install frontend dependencies using the clean dependency installation command before building.
- **FR-008**: The workflow MUST build the React frontend application before any deployment step runs.
- **FR-009**: The workflow MUST deploy only the generated `dist/` build output to Azure Static Web Apps.
- **FR-010**: The workflow MUST authenticate to Azure using the `azure/login@v1` action with `secrets.AZURE_CREDENTIALS`.
- **FR-011**: The workflow MUST deploy to Azure Static Web Apps using the `Azure/static-web-apps-deploy@v1` action with `secrets.AZURE_STATIC_WEB_APPS_API_TOKEN`.
- **FR-012**: The workflow MUST use `secrets.GITHUB_TOKEN` only for the repository token expected by the Static Web Apps deployment action.
- **FR-013**: The workflow MUST fail fast when dependency installation, build, Azure authentication, or Static Web Apps deployment fails.
- **FR-014**: The workflow MUST NOT contain hard-coded Azure credentials, deployment tokens, or environment-specific secret values.

### Key Entities

- **Frontend Deployment Workflow**: The GitHub Actions workflow responsible for building and publishing the AI Genius web frontend.
- **Target Environment**: The selected deployment environment value (`dev`, `qa`, or `prod`) used to align the frontend deployment with repository environment rules and configuration.
- **Frontend Build Output**: The production-ready `dist/` artifact generated from the React frontend application.
- **Azure Credentials Secret**: The repository secret used by the workflow to authenticate to Azure.
- **Static Web Apps Deployment Token**: The repository secret used by the workflow to publish the build output to Azure Static Web Apps.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of pushes to `main` start a frontend deployment workflow run without manual intervention.
- **SC-002**: A successful workflow run publishes the latest frontend build to Azure Static Web Apps within 10 minutes for the normal project size.
- **SC-003**: Manual deployments can be started for `dev`, `qa`, or `prod` in under 2 minutes from the GitHub Actions UI.
- **SC-004**: When two runs are triggered for the same branch, no more than one run remains active after concurrency cancellation completes.
- **SC-005**: 100% of successful deployments use generated build output rather than source files as the published site content.
- **SC-006**: Repository review confirms zero hard-coded Azure credential or deployment token values in the workflow file.
- **SC-007**: If dependency installation, build, authentication, or deployment fails, the workflow reports failure and does not mark the deployment as successful.

## Assumptions

- The infrastructure workflow already provisions or identifies the Azure Static Web Apps resource needed by this frontend deployment.
- Repository secret `AZURE_CREDENTIALS` contains the Azure service principal JSON required by `azure/login@v1`.
- Repository secret `AZURE_STATIC_WEB_APPS_API_TOKEN` contains a valid Azure Static Web Apps deployment token for the target app.
- The repository-provided `GITHUB_TOKEN` is available to workflow runs.
- The frontend application's existing dependency lockfile and build script are valid for CI use.
- Push-triggered deployments target `dev` by default, matching the existing infrastructure workflow behavior.
