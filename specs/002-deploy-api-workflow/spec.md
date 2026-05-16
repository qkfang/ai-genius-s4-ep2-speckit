# Feature Specification: Deploy API Workflow

**Feature Branch**: `002-deploy-api-workflow`  
**Created**: 2025-05-16  
**Status**: Draft  
**Input**: User description: "Deploy the AI Genius backend API via GitHub Actions. The backend is a .NET API in src/ai-genius-api. Create a GitHub Actions workflow (.github/workflows/deploy-api.yml) that: triggers on every push to main, builds the .NET API project, deploys the API to Azure App Service using azure/webapps-deploy@v3, and uses OIDC (Workload Identity Federation) for authentication. The App Service must enforce HTTPS only. The workflow must produce a green check and the /health endpoint must return { \"status\": \"ok\" }."

## Clarifications

### Session 2025-05-16

- Q: What .NET runtime version targets the API? → A: .NET 8 or later (LTS baseline)
- Q: What App Service Plan SKU/OS hosts the API? → A: Linux, B1 (Basic) plan
- Q: What deployment method does `azure/webapps-deploy@v3` use? → A: Zip deploy (package the publish output and push as a .zip)
- Q: Which GitHub repository secrets are required for OIDC login? → A: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` (no client secret)
- Q: How is the target App Service name supplied to the workflow? → A: Output from Bicep deployment, or configured as GitHub repository variable `APP_SERVICE_NAME`

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automatic deployment on push to main (Priority: P1)

As a backend maintainer, every time I merge a change to the `main` branch, the AI Genius API is automatically built and deployed to its Azure App Service so that the latest code is live without any manual intervention.

**Why this priority**: This is the core promise of the feature. Without automatic deployment from `main`, the team has no CI/CD pipeline for the API and must rely on manual, error-prone deployments. This single story delivers the full MVP value: continuous delivery of the backend.

**Independent Test**: Push (or merge a pull request) any commit to `main`. Observe that the deployment workflow starts automatically, completes with a green check, and the deployed API serves the new code (verified via the `/health` endpoint and a version/build marker).

**Acceptance Scenarios**:

1. **Given** the workflow is configured and a developer has push/merge rights, **When** a commit lands on `main`, **Then** the deployment workflow starts automatically within one minute.
2. **Given** the workflow runs to completion successfully, **When** the run finishes, **Then** the run shows a green check (success status) in the GitHub Actions UI and on the commit.
3. **Given** the deployment has completed successfully, **When** a client issues an HTTPS GET request to the App Service `/health` endpoint, **Then** the response status is `200 OK` and the body is exactly `{ "status": "ok" }`.
4. **Given** a commit is pushed to a branch other than `main`, **When** the push happens, **Then** the deploy workflow does **not** run.

---

### User Story 2 - Secure, secret-less authentication to Azure (Priority: P1)

As a security-conscious team, I need the deployment to authenticate to Azure without any long-lived secrets (no publish profile, no client secret) by using OIDC / Workload Identity Federation, so that credential leakage risk is minimised and rotation is handled automatically.

**Why this priority**: Security is non-negotiable for production deployments. Using OIDC instead of stored secrets is an explicit requirement and a constitutional/best-practice baseline. P1 because shipping the workflow without it would violate the security requirement.

**Independent Test**: Inspect the workflow file and the repository/environment configuration. Confirm there is no Azure client secret or publish profile stored in repo secrets used by this workflow, and that the Azure login step exchanges a GitHub OIDC token for an Azure access token. A successful run end-to-end proves federation is correctly configured.

**Acceptance Scenarios**:

1. **Given** the workflow file, **When** reviewed, **Then** the job declares `permissions: id-token: write` and `contents: read` (minimum needed for OIDC), and authenticates to Azure using a federated identity (no client secret).
2. **Given** repository secrets, **When** reviewed, **Then** no Azure client secret or publish profile is referenced by the deploy job; only non-sensitive identifiers (tenant ID, subscription ID, client ID of the federated app) are used.
3. **Given** the federated credential is correctly configured in Entra ID for this repository and the `main` branch, **When** the workflow runs, **Then** the Azure login step succeeds and a token is issued.
4. **Given** a fork or an unauthorised branch attempts to run the deploy, **When** OIDC token exchange is attempted, **Then** Azure rejects the federation request and the deployment does not proceed.

---

### User Story 3 - HTTPS-only API surface (Priority: P1)

As an API consumer and as a compliance reviewer, I need the deployed API to be reachable only over HTTPS so that traffic is always encrypted and plain-HTTP requests are rejected or redirected.

**Why this priority**: Required by the feature description and standard security practice. Without HTTPS-only enforcement, the deployment does not meet the acceptance bar even if it succeeds.

**Independent Test**: After a successful deploy, issue an HTTP (port 80) request to the App Service hostname. Verify the App Service refuses it or redirects to HTTPS. Issue an HTTPS request to `/health` and verify it returns `{ "status": "ok" }`.

**Acceptance Scenarios**:

1. **Given** the App Service hosting the API, **When** its configuration is inspected, **Then** the "HTTPS Only" setting is enabled.
2. **Given** an HTTP (non-TLS) request to the API hostname, **When** the request is sent, **Then** the App Service returns a redirect to HTTPS or rejects the request; no application content is served over plain HTTP.
3. **Given** an HTTPS request to `/health`, **When** the request is sent, **Then** the response is `200 OK` with body `{ "status": "ok" }`.

---

### Edge Cases

- **Build failure**: If `dotnet build` or `dotnet publish` fails, the workflow MUST fail fast with a red check and MUST NOT attempt to deploy.
- **Deployment failure mid-way**: If `azure/webapps-deploy@v3` fails, the workflow ends with a red check; the previous running version of the API remains serving traffic (no partial swap that leaves the site down).
- **Health check fails post-deploy**: If `/health` does not return `{ "status": "ok" }` after deployment, the workflow MUST surface this as a failure so the team is alerted on the same run (not silently green).
- **Concurrent pushes to `main`**: Two rapid pushes to `main` MUST NOT clobber each other in an inconsistent way; later runs must safely supersede earlier in-flight deployments (e.g., via a concurrency group).
- **OIDC federation misconfigured**: If the federated credential does not match the repo/branch/environment subject, the login step fails with a clear error and no deployment occurs.
- **Manual re-run requested**: A maintainer can re-run the latest failed deployment from the Actions UI without pushing a new commit.
- **Non-main branches**: Pushes to feature branches or PRs from forks must not trigger production deployment.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The repository MUST contain a GitHub Actions workflow file at `.github/workflows/deploy-api.yml`.
- **FR-002**: The workflow MUST trigger automatically on every push to the `main` branch.
- **FR-003**: The workflow MUST NOT trigger production deployment on pushes to non-`main` branches or on pull requests from forks.
- **FR-004**: The workflow MUST build the .NET API project located in `src/ai-genius-api` targeting **.NET 8 (or later LTS)** (restore, build, and publish in Release configuration) before deploying.
- **FR-005**: The workflow MUST fail fast and skip deployment if the build or publish step fails.
- **FR-006**: The workflow MUST deploy the published API artifact to an Azure App Service using the `azure/webapps-deploy@v3` action, using **Zip Deploy** (the publish output is packaged as a `.zip` and pushed to the App Service).
- **FR-007**: The workflow MUST authenticate to Azure using OIDC / Workload Identity Federation (no stored Azure client secret or publish profile). The login step MUST use the repository secrets `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, and `AZURE_SUBSCRIPTION_ID` (these are non-sensitive identifiers, not credentials).
- **FR-008**: The deploy job MUST declare the minimum required token permissions, including `id-token: write` and `contents: read`.
- **FR-009**: The Azure App Service hosting the API MUST be a **Linux** App Service running on an **App Service Plan with SKU B1 (Basic)**, and MUST have the "HTTPS Only" setting enabled so plain-HTTP requests are rejected or redirected.
- **FR-010**: After a successful deployment, an HTTPS GET request to the App Service `/health` endpoint MUST return HTTP `200 OK` with the JSON body `{ "status": "ok" }`.
- **FR-011**: The workflow MUST report a green (success) check on the commit and pull request when the build, deploy, and post-deploy verification all succeed.
- **FR-012**: The workflow MUST report a red (failure) check if any of build, deploy, or post-deploy `/health` verification fails.
- **FR-013**: Configuration values that vary per environment (Azure subscription ID, tenant ID, client/app ID of the federated identity, App Service name, resource group) MUST be sourced from repository or environment configuration, not hard-coded as secrets in the workflow. The **target App Service name** MUST be obtained either as an output of the Bicep deployment that provisions the App Service, **or** from the GitHub repository variable `APP_SERVICE_NAME`.
- **FR-014**: Concurrent runs of the deploy workflow on `main` MUST be serialised (e.g., via a concurrency group) so that the latest commit's deployment ultimately wins without corrupting state.
- **FR-015**: The workflow run MUST surface clear, actionable logs for each major step (checkout, build, login, deploy, health check) to aid troubleshooting.

### Key Entities

- **Deployment Workflow**: The GitHub Actions workflow definition that orchestrates build, authentication, deployment, and verification of the API.
- **Backend API**: The .NET application in `src/ai-genius-api` that exposes the `/health` endpoint and other business endpoints.
- **Azure App Service (API host)**: The Azure resource that hosts the running API; provisioned on a **Linux App Service Plan, SKU B1**, configured for HTTPS-only, and the target of `azure/webapps-deploy@v3` via Zip Deploy. Its name is exposed to the workflow either as a Bicep deployment output or via the `APP_SERVICE_NAME` GitHub repository variable.
- **Federated Identity (Workload Identity)**: The Entra ID application/service principal with a federated credential trusting this GitHub repository's `main` branch (or environment) for OIDC token exchange.
- **Health Endpoint**: The `/health` route on the deployed API used as the post-deploy smoke test; contract: `200 OK` with body `{ "status": "ok" }`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of pushes to `main` automatically trigger the deploy workflow within 1 minute of the push event.
- **SC-002**: When the workflow succeeds, the deployed API responds to an HTTPS GET on `/health` with `200 OK` and the exact body `{ "status": "ok" }` within 2 minutes of the workflow's reported completion.
- **SC-003**: 0 long-lived Azure credentials (client secrets, publish profiles) are stored in or referenced by the workflow; authentication is exclusively via OIDC federation.
- **SC-004**: 100% of HTTP (non-TLS) requests to the API hostname are either redirected to HTTPS or rejected; 0% return application content over plain HTTP.
- **SC-005**: A maintainer unfamiliar with the deployment can re-run or diagnose a failed deployment using only the GitHub Actions run logs, without needing additional tooling or local access (verified by a dry-run review).
- **SC-006**: End-to-end pipeline duration (push to `/health` returning `ok` on the live App Service) completes in under 10 minutes for a typical change.
- **SC-007**: A failing build, failing deploy, or failing post-deploy health check results in a red check on the commit/PR in 100% of cases — no silent failures.
