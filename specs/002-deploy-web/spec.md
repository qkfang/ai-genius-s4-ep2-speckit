# Feature Specification: Frontend Web App Deployment via GitHub Actions

**Feature Branch**: `002-deploy-web`  
**Created**: 2026-05-16  
**Status**: Draft  
**Input**: User description: "Deploy the AI Genius React frontend web app via GitHub Actions. The frontend is a React + Vite application in src/ai-genius-web. The new GitHub Actions workflow is called `002-deploy-web.yml` that follows the ENVIRONMENT & concurrency like `001-deploy-infra.yml`, triggers on every push to the main branch and also `workflow_dispatch`, installs dependencies (npm ci) and builds the React app (npm run build), deploys the built output (dist/) to Azure Static Web Apps, uses azure/login@v1 with secrets.AZURE_CREDENTIALS, and Azure/static-web-apps-deploy@v1 uses secrets.AZURE_STATIC_WEB_APPS_API_TOKEN."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automated Frontend Deployment on Code Push (Priority: P1)

A developer merges a change to the `main` branch. Without any manual intervention, the CI/CD pipeline triggers, installs all frontend dependencies, builds the React application, and deploys the compiled output to Azure Static Web Apps. The live site is updated within minutes of the merge.

**Why this priority**: This is the core value of the feature — every frontend change automatically reaches users without a manual deploy step.

**Independent Test**: Can be fully tested by pushing a commit to `main` and verifying in the Azure portal and via the live URL that the updated frontend is served by Azure Static Web Apps.

**Acceptance Scenarios**:

1. **Given** a commit is merged to `main`, **When** the workflow runs, **Then** the React application is built successfully and the updated site is accessible via the Azure Static Web Apps URL.
2. **Given** the `AZURE_STATIC_WEB_APPS_API_TOKEN` secret is valid, **When** the workflow deploys, **Then** the deployment completes without errors and the new build artifacts replace the previous version.
3. **Given** the build step fails (e.g., a syntax error in source code), **When** the workflow runs, **Then** the pipeline halts before deployment and the live site is not affected.

---

### User Story 2 - Manual Frontend Deployment via Workflow Dispatch (Priority: P2)

A developer or operator needs to (re)deploy the frontend on demand — for example to a specific target environment or to recover from an accidental deletion — without pushing a new commit. They trigger the pipeline manually from the GitHub Actions UI, select the target environment, and the same build and deploy steps execute.

**Why this priority**: Manual triggering is an essential operational safety valve. It requires the same pipeline logic as P1 but adds a manual entry point that is useful for hotfix recovery and environment-specific deployments.

**Independent Test**: Can be fully tested by using the "Run workflow" button in the GitHub Actions UI, selecting an environment, and verifying the updated site is served — without any code change being pushed.

**Acceptance Scenarios**:

1. **Given** the `workflow_dispatch` trigger is configured, **When** a user selects "Run workflow" in the GitHub Actions UI and picks an environment, **Then** the build and deploy pipeline runs with the chosen environment context.
2. **Given** a push to `main` triggers the workflow with no explicit input, **When** the environment is resolved, **Then** the pipeline defaults to the `dev` environment.

---

### User Story 3 - Concurrent Run Management (Priority: P3)

Two developers merge commits to `main` in quick succession. Only the most recent deployment attempt should complete; the earlier one should be cancelled automatically to avoid stale artifacts reaching the live site.

**Why this priority**: Concurrency safety prevents race conditions and ensures only the latest frontend version is deployed.

**Independent Test**: Can be tested by triggering two workflow runs in rapid succession and confirming that the first run is cancelled while the second completes, with the final site reflecting the most recent commit.

**Acceptance Scenarios**:

1. **Given** a workflow run is in progress, **When** a new run for the same branch is triggered, **Then** the in-progress run is cancelled and the newer run completes.
2. **Given** two runs complete sequentially without overlap, **When** both succeed, **Then** both deployments proceed normally without interference.

---

### Edge Cases

- What happens when the `npm run build` step fails due to a missing environment variable (e.g., `VITE_API_URL` is not set)? The workflow must fail at the build step and not deploy a broken bundle to Azure Static Web Apps.
- What happens when the `AZURE_STATIC_WEB_APPS_API_TOKEN` secret is missing or expired? The deploy step must fail with a clear authentication error rather than a silent timeout.
- What happens when `AZURE_CREDENTIALS` is misconfigured? The Azure login step must fail immediately, preventing any deployment from proceeding.
- What happens when a concurrent run is cancelled mid-deployment? The partially uploaded artifacts should not leave the site in a broken state; Azure Static Web Apps atomic deployments ensure the previous version remains live until a full deployment is committed.
- What happens when the `dist/` output directory is empty after the build step? The deployment action must either fail clearly or produce a valid (empty) deployment — not silently succeed with no content served.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The pipeline MUST trigger automatically on every push to the `main` branch.
- **FR-002**: The pipeline MUST be triggerable manually via the `workflow_dispatch` event from the GitHub Actions UI, accepting an `environment` input with allowed values `dev`, `qa`, and `prod` (defaulting to `dev`).
- **FR-003**: The pipeline MUST install all frontend dependencies using a reproducible, locked dependency install before building.
- **FR-004**: The pipeline MUST build the React application and produce a compiled output directory ready for static hosting.
- **FR-005**: The pipeline MUST deploy the compiled output to Azure Static Web Apps using the environment-scoped Static Web Apps deployment token.
- **FR-006**: The pipeline MUST authenticate to Azure using a service principal credential stored as a GitHub secret before performing any Azure operations.
- **FR-007**: The pipeline MUST apply a concurrency group using `${{ github.workflow }}-${{ github.ref }}` scoped to the workflow and branch so that a newer run cancels any in-progress run (`cancel-in-progress: true`).
- **FR-008**: The pipeline MUST default to the `dev` environment when triggered by a push to `main` (i.e., no explicit `workflow_dispatch` input is provided).
- **FR-009**: The pipeline MUST fail the entire run if any step — dependency install, build, Azure login, or deployment — exits with an error.
- **FR-010**: The pipeline MUST use a per-environment variable (`VITE_API_URL`) injected at build time — via the `environment:` job context (`vars.VITE_API_URL`) — so the compiled frontend targets the correct backend endpoint for the chosen environment.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every push to `main` results in an updated frontend being live on Azure Static Web Apps within 5 minutes of the commit.
- **SC-002**: A manual `workflow_dispatch` run completes and publishes the correct build to the chosen environment without requiring any changes to source code.
- **SC-003**: When two workflow runs are triggered in rapid succession for the same branch, the earlier run is cancelled and only the later run's artifacts are served.
- **SC-004**: A pipeline run that encounters a build or deployment failure does not update the live site, preserving the last known-good version.
- **SC-005**: 100% of pipeline runs use the correct `VITE_API_URL` value for the selected environment, ensuring the frontend connects to the right backend.

## Assumptions

- The Azure Static Web App resource already exists (provisioned by the `001-deploy-infra` workflow or equivalent). It uses the **Free** tier for `dev` and the **Standard** tier for `prod`.
- `AZURE_STATIC_WEB_APPS_API_TOKEN` is stored as a single GitHub repository-level secret shared across all environments.
- `AZURE_CREDENTIALS` is stored as a GitHub repository secret in the standard service principal JSON format.
- `VITE_API_URL` is available as a per-environment GitHub Actions variable set on each GitHub Environment (`dev`, `qa`, `prod`). The workflow job must declare an `environment:` key matching the target environment to access it via `vars.VITE_API_URL`.
- Node.js 20 is sufficient for building the React + Vite application.
- `APP_NAME` and `ENVIRONMENT` are available as GitHub repository-level variables.
- The `npm run build` command in `src/ai-genius-web/package.json` produces output in `src/ai-genius-web/dist/`.
- No backend API deployment or infrastructure provisioning occurs within this workflow — it is purely frontend build and deploy.

## Clarifications

### Session 2026-05-16

- Q: Is `VITE_API_URL` a per-environment variable or a repository-level variable? → A: Per-environment variable — set on each GitHub Environment (dev, qa, prod); workflow job must declare `environment:` key to access it via `vars.VITE_API_URL`.
- Q: What is the concurrency strategy for the workflow? → A: Group by `${{ github.workflow }}-${{ github.ref }}`; newer run cancels any in-progress run (`cancel-in-progress: true`).
- Q: What Azure Static Web App tier is used per environment? → A: Free tier for `dev`; Standard tier for `prod`.
