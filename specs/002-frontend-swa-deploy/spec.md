# Feature Specification: Frontend Static Web App Deployment via CI/CD

**Feature Branch**: `002-frontend-swa-deploy`  
**Created**: 2026-05-16  
**Status**: Draft  
**Input**: User description: "Deploy the AI Genius React frontend web app via GitHub Actions. The frontend is a React + Vite application in src/ai-genius-web. Create a GitHub Actions workflow that: 1. Triggers on every push to the main branch. 2. Installs dependencies (npm ci) and builds the React app (npm run build). 3. Deploys the built output (dist/) to Azure Static Web Apps. 4. Uses OIDC (Workload Identity Federation) for Azure authentication - no long-lived secrets stored in the repository."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automatic Deployment on Code Merge (Priority: P1)

A developer merges a code change to the main branch. Without any manual intervention, the frontend is automatically built and deployed to the live static web hosting environment. The developer can confirm success by checking the pipeline status in the repository's CI/CD dashboard.

**Why this priority**: This is the core value of the feature — eliminating manual deployment steps and ensuring the live site always reflects the latest merged code.

**Independent Test**: Can be fully tested by pushing any change to the main branch and verifying a green check appears on the Actions tab and the deployed site reflects the change.

**Acceptance Scenarios**:

1. **Given** a developer pushes a commit to the main branch, **When** the CI/CD pipeline starts automatically, **Then** the pipeline installs dependencies, builds the frontend, and deploys the output to the static web hosting environment without manual intervention.
2. **Given** the pipeline completes successfully, **When** the developer checks the CI/CD status, **Then** they see a green passing check on the commit/Actions tab.
3. **Given** a successful deployment completes, **When** a user navigates to the Static Web App URL, **Then** the site loads and reflects the latest deployed content.

---

### User Story 2 - Build Failure Blocks Deployment (Priority: P2)

A developer accidentally introduces a build-breaking change. The CI/CD pipeline detects the failure during the build step, stops before deploying, and reports a red/failed status. The previously deployed version of the site remains accessible.

**Why this priority**: Prevents broken code from reaching users and preserves site availability during failures.

**Independent Test**: Can be tested by introducing a deliberate build error on a branch, observing the pipeline fails, and confirming the live site is unchanged.

**Acceptance Scenarios**:

1. **Given** a code change causes the build step to fail, **When** the pipeline runs, **Then** it stops at the build step and does not deploy any artifact.
2. **Given** a failed deployment pipeline, **When** a user navigates to the Static Web App URL, **Then** the previously deployed version of the site remains accessible and functional.
3. **Given** a build failure, **When** the developer checks the CI/CD status, **Then** they see a clear failed status indicator on the commit.

---

### User Story 3 - Secretless Cloud Authentication (Priority: P3)

An operations team member reviews the repository and CI/CD configuration. They confirm that no long-lived cloud credentials or API keys are stored in the repository secrets or environment variables — authentication is performed via short-lived, federated identity tokens.

**Why this priority**: Eliminates the risk of credential leakage from the repository while still allowing the pipeline to authenticate with the cloud provider.

**Independent Test**: Can be tested by auditing repository secrets (confirming absence of long-lived tokens) and verifying the workflow successfully deploys using only federated identity credentials.

**Acceptance Scenarios**:

1. **Given** the CI/CD workflow is configured, **When** an auditor reviews the repository secrets, **Then** no long-lived cloud credentials (e.g., service principal passwords, SAS tokens) are present.
2. **Given** the pipeline runs on a push to main, **When** it authenticates with the cloud provider, **Then** it uses a short-lived federated identity token obtained at runtime.
3. **Given** the federated identity is misconfigured, **When** the pipeline attempts to authenticate, **Then** the pipeline fails with a clear authentication error rather than silently bypassing authentication.

---

### Edge Cases

- What happens when the build step succeeds but the deployment step fails? The pipeline must report failure and the previous version of the site remains accessible.
- What happens when the federated identity credentials are expired or misconfigured? The pipeline fails with a descriptive authentication error, no partial deployment occurs.
- What happens when dependencies cannot be installed (e.g., registry unavailable)? The pipeline fails at the install step before any build or deployment is attempted.
- What happens when the deployment is already in progress and a second push arrives? The second run queues or cancels the first, ensuring the latest code is eventually deployed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The CI/CD pipeline MUST trigger automatically on every push to the main branch without manual intervention.
- **FR-002**: The pipeline MUST install all declared frontend dependencies from the package manifest before building.
- **FR-003**: The pipeline MUST produce a production-optimised build artifact from the frontend source code.
- **FR-004**: The pipeline MUST deploy the build artifact to the Azure Static Web Apps hosting environment.
- **FR-005**: The pipeline MUST authenticate with the cloud provider using short-lived, federated identity credentials — no long-lived secrets or API keys may be stored in the repository.
- **FR-006**: The pipeline MUST report a passing status check on the repository commit and Actions tab after a successful deployment.
- **FR-007**: The pipeline MUST report a failed status check and stop all subsequent steps if any step (install, build, or deploy) fails.
- **FR-008**: The deployed site MUST be reachable at the Static Web App URL within a reasonable time after the pipeline completes successfully.
- **FR-009**: A previously deployed version of the site MUST remain accessible while a new deployment is in progress or if a new deployment fails.

### Key Entities

- **CI/CD Workflow**: The automated pipeline definition that orchestrates install, build, and deploy steps on each main branch push.
- **Build Artifact**: The compiled, static output produced by the build step, ready for hosting without further processing.
- **Static Web App**: The cloud-hosted static web environment that serves the frontend to end users.
- **Federated Identity**: The short-lived, cloud-issued credential used by the pipeline to authenticate with the cloud provider without storing secrets.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every push to the main branch triggers the pipeline automatically and completes with a green status check within 5 minutes under normal conditions.
- **SC-002**: The deployed site is reachable at the Static Web App URL within 3 minutes of a successful pipeline completion.
- **SC-003**: Zero long-lived cloud credentials are stored in the repository — authentication relies entirely on federated identity tokens issued at runtime.
- **SC-004**: A build failure prevents deployment 100% of the time — no broken build artifact is ever deployed to the live environment.
- **SC-005**: The live site remains accessible during active deployments; end users experience no downtime caused by the deployment process itself.

## Assumptions

- The Azure Static Web App resource already exists (or will be provisioned separately) and its resource identifier is available for the workflow configuration.
- The federated identity trust relationship between the repository and the cloud provider will be set up prior to first use of the workflow.
- The frontend build command (`npm run build`) produces a self-contained static output in the `dist/` directory.
- The Node.js version required by the project (≥18) is available in the CI/CD runner environment.
- Only pushes to the `main` branch trigger deployment; other branches do not deploy to the production Static Web App.
