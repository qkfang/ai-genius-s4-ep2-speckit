# Feature Specification: Frontend React App Deployment via GitHub Actions

**Feature Branch**: `002-frontend-swa-deploy`  
**Created**: 2026-04-13  
**Status**: Draft  
**Input**: User description: "Deploy the AI Genius React frontend web app via GitHub Actions. The frontend is a React 18 + Vite application in src/ai-genius-web. Create a GitHub Actions workflow that: 1. Triggers on every push to the main branch. 2. Installs dependencies (npm ci) and builds the React app (npm run build). 3. Deploys the built output (dist/) to Azure Static Web Apps. 4. Uses OIDC (Workload Identity Federation) for Azure authentication - no long-lived secrets stored in the repository. The workflow must produce a green check on the Actions tab and the deployed site must be reachable at the Static Web App URL."

## Clarifications

### Session 2026-04-13

- Q: When two commits are pushed to `main` in rapid succession and two workflow runs start concurrently, what should happen to the in-flight older run? → A: Cancel the older run (`cancel-in-progress: true` concurrency group) — newest commit always wins.
- Q: How tightly should the OIDC federated identity subject claim be scoped in Azure? → A: Lock to the entire repository (any branch, any event; subject: `repo:qkfang/ai-genius-s4-ep2-speckit`).
- Q: If the deployment step fails after a successful build, what should the workflow do? → A: Fail the run immediately with a clear error; no automatic retry — the developer re-triggers manually.
- Q: How should the Node.js version be pinned in the workflow? → A: Use the runner's default Node.js version; no explicit pinning required.
- Q: Should the workflow cache npm dependencies between runs? → A: No caching — always fetch all packages fresh on every run.
- Q: What React version and where is the frontend source located? → A: React 18 + Vite; source is in `src/ai-genius-web`.
- Q: What file path should the GitHub Actions workflow use? → A: `.github/workflows/deploy-web.yml`.
- Q: Which GitHub Action should be used for the Static Web App deployment step? → A: `Azure/static-web-apps-deploy@v1`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automated Deployment on Push to Main (Priority: P1)

A developer merges a change to the React frontend and pushes to the `main` branch. Without any manual intervention, the GitHub Actions workflow triggers automatically, installs the frontend's dependencies, builds the production artifact, and deploys it to Azure Static Web Apps using a secure, secretless identity. The developer sees a green check on the Actions tab confirming the deployment succeeded.

**Why this priority**: This is the core value of the feature. It eliminates manual deployment steps and gives every developer immediate confidence that merged changes are live.

**Independent Test**: Can be fully tested by pushing any commit to `main`, observing the workflow run on the Actions tab, and verifying the deployed site reflects the change at the Static Web App URL.

**Acceptance Scenarios**:

1. **Given** a commit is pushed to `main`, **When** the workflow triggers, **Then** the frontend dependencies are installed and the production artifact is built successfully.
2. **Given** a successful build, **When** the deploy step runs, **Then** the built output is published to the Azure Static Web App and the workflow job shows a green check on the Actions tab.
3. **Given** a green deployment, **When** a user visits the Static Web App URL, **Then** the React app loads and is the version from the latest merged commit.

---

### User Story 2 - Keyless Azure Authentication via Workload Identity Federation (Priority: P2)

A security-conscious team lead audits the repository's secrets. They find no long-lived Azure credentials — no service principal passwords, no client secrets, no storage account keys — stored as repository secrets or anywhere in the codebase. The deployment workflow authenticates to Azure using OIDC tokens issued by GitHub for each run, with the trust relationship configured in Azure rather than by storing keys in GitHub.

**Why this priority**: Eliminating long-lived secrets reduces the attack surface significantly. This requirement shapes how the workflow is structured and how Azure is configured, and must be satisfied from day one.

**Independent Test**: Can be fully tested by inspecting all repository secrets (confirming none contain Azure credentials), then triggering a deployment and verifying it succeeds — proving authentication works without stored secrets.

**Acceptance Scenarios**:

1. **Given** the repository contains no Azure credential secrets, **When** the workflow runs, **Then** it authenticates to Azure successfully using a federated identity.
2. **Given** the OIDC trust relationship is configured in Azure, **When** the workflow requests an access token from GitHub's OIDC provider, **Then** Azure issues a short-lived token for the duration of the run only.
3. **Given** the OIDC configuration is intact, **When** the workflow completes, **Then** no credential material outlives the individual workflow run.

---

### User Story 3 - Build Failure Visibility (Priority: P3)

A developer accidentally introduces a build-breaking change (for example, a syntax error or a missing import) and pushes to `main`. The workflow fails fast at the build step and the Actions tab shows a red ✗. The developer receives a clear indication of what went wrong and can fix it without the partially-broken state ever being deployed.

**Why this priority**: Build failure visibility protects the deployed site's integrity. A passing workflow guarantees only valid, buildable code reaches production.

**Independent Test**: Can be fully tested by introducing an intentional syntax error, pushing, and confirming the workflow fails before the deploy step and that the Static Web App is unchanged.

**Acceptance Scenarios**:

1. **Given** the frontend code contains a build error, **When** the workflow runs, **Then** the build step fails and the deployment step does not execute.
2. **Given** a failed build, **When** the developer views the Actions tab, **Then** the run shows a red status and the build logs contain enough detail to identify the cause.

---

### Edge Cases

- When two pushes arrive to `main` in rapid succession, the older in-flight run is cancelled immediately and only the newest run completes deployment (`cancel-in-progress: true`).
- What happens when the Azure Static Web App resource does not yet exist at the time the workflow runs?
- What happens when the OIDC federation trust relationship in Azure is misconfigured or expired?
- What happens when `npm ci` fails due to a registry outage or a corrupted `package-lock.json`?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The deployment workflow MUST trigger automatically on every push to the `main` branch with no manual intervention required.
- **FR-002**: The workflow MUST install all frontend dependencies using a clean install (reproducing the exact locked dependency tree) before building.
- **FR-003**: The workflow MUST execute the standard frontend build command and package the output into a deployable artifact.
- **FR-004**: The workflow MUST deploy the built artifact to the designated Azure Static Web App, replacing the previously deployed version.
- **FR-005**: The workflow MUST authenticate to Azure exclusively through a short-lived, run-scoped OIDC token — no long-lived credentials or passwords may be stored in the repository.
- **FR-006**: The workflow MUST report a clear pass or fail status on the repository's Actions tab after each run.
- **FR-007**: The deployment step MUST NOT execute if the build step fails.
- **FR-008**: The deployed site MUST be reachable at the Azure Static Web App's public URL immediately after a successful deployment.
- **FR-009**: The Azure identity used by the workflow MUST be granted only the permissions required to publish to the target Static Web App — no broader access than necessary. The OIDC federation trust in Azure MUST be scoped to the entire repository (`repo:qkfang/ai-genius-s4-ep2-speckit`) rather than a specific branch or environment.
- **FR-010**: The workflow MUST use a concurrency group scoped to the `main` branch such that a newer run cancels any already in-progress run for the same branch (`cancel-in-progress: true`).
- **FR-011**: If the deployment step fails, the workflow MUST mark the run as failed immediately with no automatic retry; recovery requires a developer to trigger a new run manually.

### Key Entities

- **Workflow Run**: A single execution of the GitHub Actions pipeline, triggered by a push to `main`. Has a status (success/failure), duration, and logs.
- **Build Artifact**: The compiled, production-ready static files produced by the frontend build. Consumed by the deploy step.
- **Azure Static Web App**: The hosting target. Receives the build artifact and serves it publicly at a fixed URL.
- **Federated Identity**: The Azure identity (app registration or managed identity) trusted by GitHub's OIDC provider. The federation trust subject is scoped to the entire repository (`repo:qkfang/ai-genius-s4-ep2-speckit`), permitting any branch or event within the repo to authenticate.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every push to `main` triggers a workflow run within 60 seconds of the push completing.
- **SC-002**: When the frontend code is valid and buildable, the workflow produces a green check on the Actions tab 100% of the time.
- **SC-003**: The deployed site is reachable at the Static Web App URL within 5 minutes of a successful workflow completion.
- **SC-004**: Zero long-lived Azure credentials are stored in the repository — confirmed by a full audit of repository secrets showing no Azure keys, passwords, or tokens.
- **SC-005**: A build error in the frontend code prevents deployment — the site at the Static Web App URL continues to serve the last known-good version.
- **SC-006**: The workflow completes (install + build + deploy) in under 10 minutes for typical frontend changes.

## Assumptions

- The Azure Static Web App resource already exists (or will be created by a separate infrastructure workflow, such as the one defined in `001-bicep-cicd-workflow`) before this workflow first runs.
- A GitHub environment or repository-level OIDC configuration will be set up in Azure ahead of the first run (the spec scope is the workflow code; the Azure-side trust configuration is a prerequisite, not in scope).
- The `main` branch is the sole production branch; no staging or preview environment deployments are in scope for this feature.
- The frontend build output directory is `dist/` as produced by the standard Vite build.
- Node.js version compatibility is not explicitly pinned; the workflow uses the GitHub-hosted runner's default Node.js version.
- npm dependency caching is explicitly not used; every run performs a full clean install to guarantee reproducibility.
- The frontend application is built with **React 18** and Vite; the source root is `src/ai-genius-web`.
- The workflow file is located at `.github/workflows/deploy-web.yml`.
- The Static Web App deployment step uses the `Azure/static-web-apps-deploy@v1` GitHub Action.
