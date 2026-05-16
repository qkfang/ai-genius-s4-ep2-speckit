# Feature Specification: Frontend Static Web App Deployment via GitHub Actions

**Feature Branch**: `003-frontend-swa-deploy`  
**Created**: 2026-05-16  
**Status**: Draft  
**Input**: User description: "Deploy the AI Genius React frontend web app via GitHub Actions. The frontend is a React 18 + Vite application in src/ai-genius-web. The GitHub Actions workflow is called `002-deploy-web.yml` that: 1- Follow the ENVIRONMENT & concurrency like `001-deploy-infra.yml`, 2. Triggers on every push to the main branch, 3. Installs dependencies (npm ci) and builds the React app (npm run build). 4. Deploys the built output (dist/) to Azure Static Web Apps. 5. Uses azure/login@v1 with: secrets.AZURE_CREDENTIALS. 6- Azure/static-web-apps-deploy@v1 uses secrets.AZURE_STATIC_WEB_APPS_API_TOKEN"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automated Frontend Deployment on Code Push (Priority: P1)

A developer merges a change to the `main` branch. Without any manual intervention, the CI/CD pipeline triggers, installs Node.js dependencies, builds the React + Vite application, and deploys the compiled output to Azure Static Web Apps. The live site is updated automatically within minutes of the merge.

**Why this priority**: This is the core value of the feature — removing the manual deployment step and ensuring every merge to `main` results in the latest frontend being publicly accessible.

**Independent Test**: Can be fully tested by pushing a commit to `main`, observing the workflow run to completion in GitHub Actions, then verifying the updated site is accessible at the Azure Static Web Apps URL.

**Acceptance Scenarios**:

1. **Given** a commit is pushed to `main`, **When** the `002-deploy-web` workflow runs, **Then** the workflow completes successfully and the React application is live on Azure Static Web Apps.
2. **Given** the `npm ci` step runs, **When** `package-lock.json` is present in `src/ai-genius-web`, **Then** all dependencies are installed without errors.
3. **Given** the `npm run build` step runs, **When** the Vite build succeeds, **Then** a `dist/` folder is produced containing the compiled static assets.
4. **Given** the built `dist/` folder exists, **When** the Static Web Apps deploy step runs with the deployment token, **Then** assets are uploaded and the site reflects the new build.

---

### User Story 2 - Manual Deployment to a Specific Environment (Priority: P2)

A developer or operator needs to redeploy the frontend on demand — for example after a configuration change or to a non-default environment — without pushing a new commit. They trigger the workflow manually from the GitHub Actions UI, select the target environment, and the same build-and-deploy steps execute.

**Why this priority**: Manual triggering provides an operational safety net for redeployments and environment-specific releases without requiring code changes.

**Independent Test**: Can be fully tested by using the "Run workflow" button in GitHub Actions, selecting an environment, and confirming the site updates without a code change.

**Acceptance Scenarios**:

1. **Given** the `workflow_dispatch` trigger is configured, **When** a user clicks "Run workflow" and selects `dev`, `qa`, or `prod`, **Then** the pipeline runs against the specified environment.
2. **Given** a manual run completes successfully, **When** the deployment finishes, **Then** the Static Web App reflects the latest build from the current `main` branch.

---

### User Story 3 - Concurrent Run Cancellation (Priority: P3)

Two pushes land on `main` in quick succession. The first workflow run is still in progress when the second is triggered. The second run cancels the first, ensuring only the most recent code is deployed and no stale build overwrites a newer one.

**Why this priority**: Concurrency control prevents race conditions and wasted compute. It mirrors the pattern already established in `001-deploy-infra.yml`.

**Independent Test**: Can be tested by pushing two commits rapidly, observing in the GitHub Actions UI that the first run is cancelled when the second starts.

**Acceptance Scenarios**:

1. **Given** a workflow run is in progress, **When** a new push to `main` triggers another run, **Then** the in-progress run is cancelled and the new run proceeds.
2. **Given** a `workflow_dispatch` run is active, **When** a push to `main` triggers a concurrent run in the same concurrency group, **Then** only one run proceeds at a time.

---

### Edge Cases

- What happens when `npm run build` fails (e.g., compile error)? The workflow must stop and report a failure; no partial or stale build is deployed.
- What happens when the deployment token secret (`AZURE_STATIC_WEB_APPS_API_TOKEN`) is missing or expired? The deployment step must fail with a clear error rather than silently succeed with no update.
- What happens when `dist/` is empty or missing after the build step? The deploy action must fail rather than deploy an empty site.
- What happens when two branches other than `main` are pushed simultaneously? The concurrency group is scoped to the workflow and ref, so each branch has an independent concurrency slot.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The workflow MUST trigger automatically on every push to the `main` branch.
- **FR-002**: The workflow MUST support manual triggering via `workflow_dispatch` with a required environment input (`dev`, `qa`, `prod`) defaulting to `dev`.
- **FR-003**: The workflow MUST use a concurrency group scoped to `${{ github.workflow }}-${{ github.ref }}` with `cancel-in-progress: true`, matching the pattern in `001-deploy-infra.yml`.
- **FR-004**: The workflow MUST install Node.js dependencies using `npm ci` from the `src/ai-genius-web` directory.
- **FR-005**: The workflow MUST prepare a runtime `.env` file before building by copying `src/ai-genius-web/.env.example` to `src/ai-genius-web/.env` and replacing the `VITE_API_URL` line with the value from the `vars.VITE_API_URL` GitHub Actions variable (e.g., `sed -i 's|^VITE_API_URL=.*|VITE_API_URL=${{ vars.VITE_API_URL }}|' .env`). The `.env` file MUST NOT be committed to the repository.
- **FR-005a**: The workflow MUST build the React 18 + Vite application using `npm run build` (from `src/ai-genius-web/`), producing output in `src/ai-genius-web/dist/`. The build step picks up the generated `.env` automatically.
- **FR-006**: The workflow MUST authenticate to Azure using `azure/login@v1` with the `AZURE_CREDENTIALS` secret.
- **FR-007**: The workflow MUST deploy the built `dist/` output to Azure Static Web Apps using `Azure/static-web-apps-deploy@v1` with the following parameters: `action: upload`, `app_location: src/ai-genius-web/dist`, `output_location: ""`, `skip_app_build: true`, `repo_token: ${{ secrets.GITHUB_TOKEN }}`, and `azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}`. The SWA action MUST NOT re-run the build.
- **FR-008**: The workflow file MUST be named `002-deploy-web.yml` and reside in `.github/workflows/`.
- **FR-009**: The workflow MUST NOT deploy if any prior step (dependency install or build) fails.
- **FR-010**: The active environment for the deployment job MUST be resolved as `${{ github.event.inputs.environment || 'dev' }}` for GitHub environment protection rule support.

### Key Entities

- **Workflow File**: The GitHub Actions YAML file (`002-deploy-web.yml`) that defines all jobs and steps.
- **React 18 + Vite Application**: The frontend source code located in `src/ai-genius-web`, built into static assets in `dist/`.
- **Azure Static Web App**: The Azure hosting target that serves the compiled frontend.
- **Deployment Token**: The `AZURE_STATIC_WEB_APPS_API_TOKEN` secret used to authenticate the Static Web Apps deploy action.
- **Azure Credentials**: The `AZURE_CREDENTIALS` secret used for `azure/login@v1`.
- **VITE_API_URL**: A GitHub Actions repository variable (`vars.VITE_API_URL`) holding the backend API base URL (e.g., `https://aigenius4-api-dev.azurewebsites.net`). Injected into the Vite build at CI runtime by patching a generated `.env` file; never committed to source control.
- **GitHub Environment**: A named environment (`dev`, `qa`, `prod`) that can have protection rules applied in GitHub repository settings.
- **APP_NAME**: A GitHub environment variable available in this repo but not consumed by `002-deploy-web.yml`; it is used by `001-deploy-infra.yml` and `003-deploy-api.yml` for resource naming only.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every push to `main` results in an automatic workflow run that completes successfully and the updated frontend is live within 10 minutes of the push.
- **SC-002**: A developer can manually trigger a deployment to any of the three environments (`dev`, `qa`, `prod`) from the GitHub Actions UI without editing any files.
- **SC-003**: When two pushes occur in quick succession, only one deployment completes; the superseded run is cancelled rather than deploying a stale build.
- **SC-004**: A failed build (e.g., compile error) prevents any deployment — zero cases where a broken or empty site is published.
- **SC-005**: The workflow follows the same environment and concurrency conventions as `001-deploy-infra.yml`, requiring no special knowledge to operate beyond what is already documented for the infra workflow.

## Assumptions

- The `src/ai-genius-web/package.json` defines a `build` script that invokes Vite and outputs to `dist/`.
- `package-lock.json` is committed to the repository, enabling `npm ci` to run deterministically.
- The `AZURE_STATIC_WEB_APPS_API_TOKEN` and `AZURE_CREDENTIALS` secrets are pre-configured in the GitHub repository (or per-environment) settings.
- The Azure Static Web App resource has already been provisioned (e.g., by `001-deploy-infra.yml`) before this workflow runs.
- Node.js 20.x is the target runtime version for the build, consistent with the project's standard action versions.
- A `.env.example` file exists in `src/ai-genius-web/` with a `VITE_API_URL=` placeholder; the workflow generates `.env` from it at runtime.
- The `dist/` folder contains all assets needed; no server-side rendering or API routes are part of this feature.

## Clarifications

### Session 2026-05-16

- Q: How should `VITE_API_URL` be injected into the Vite build? → A: Copy `.env.example` to `.env` at CI runtime, then patch with `sed -i 's|^VITE_API_URL=.*|VITE_API_URL=${{ vars.VITE_API_URL }}|' .env`; the committed `.env.example` holds the placeholder.
- Q: What parameters does `Azure/static-web-apps-deploy@v1` require? → A: `action: upload`, `app_location: src/ai-genius-web/dist`, `output_location: ""`, `skip_app_build: true`, `repo_token: ${{ secrets.GITHUB_TOKEN }}`, `azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}`.
- Q: Is `APP_NAME` used in the `002-deploy-web.yml` workflow? → A: No — `APP_NAME` is scoped to `001-deploy-infra.yml` and `003-deploy-api.yml` for resource naming; it is not consumed by the frontend deploy workflow.
