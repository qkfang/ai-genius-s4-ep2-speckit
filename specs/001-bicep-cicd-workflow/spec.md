# Feature Specification: Bicep Infrastructure-as-Code CI/CD Pipeline

**Feature Branch**: `001-bicep-cicd-workflow`  
**Created**: 2026-03-22  
**Status**: Draft  
**Input**: User description: "Add Bicep infrastructure-as-code CI/CD to the AI Genius project."

## Clarifications

### Session 2026-03-22

- Q: How should deploy-api and deploy-web obtain resource names once deploy-infra finishes? → A: All three stages are jobs in one combined `deploy-infra.yml` file; downstream jobs consume outputs via `needs.infra.outputs.*` directly.
- Q: Which environment value set should the workflow use — Bicep-native short forms (`dev`/`qa`/`prod`) or human-readable long forms (`development`/`staging`/`production`)? → A: Use `development`, `staging`, `production` as the workflow `workflow_dispatch` input values; a mapping step inside the workflow translates them to `dev`, `qa`, `prod` before passing to Bicep.
- Q: How should the `infra` job handle the Static Web App deployment token when emitting it as a job output? → A: Emit as a plain job output with no masking — keep it simple.
- Q: When a push to `main` auto-triggers the pipeline, what environment should be used as the default, and how should concurrent runs be handled? → A: Default to `dev`; use a concurrency group scoped to the branch so a newer run cancels any in-flight run (`cancel-in-progress: true`).
- Q: How should Bicep parameters be supplied to `az deployment group create`? → A: Create a dedicated parameter file for each environment (`bicep/parameters.dev.json`, `bicep/parameters.qa.json`, `bicep/parameters.prod.json`); the workflow selects the correct file based on the mapped environment value.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automated Infrastructure Provisioning on Code Push (Priority: P1)

A developer merges a change to the `main` branch. Without any manual intervention, the CI/CD pipeline triggers, authenticates to Azure using a secure federated identity, creates or verifies the target resource group, and applies the Bicep template. All required Azure resources — App Service Plan, Web App (API), and Static Web App (frontend) — are provisioned or updated in place. The pipeline completes successfully and reports the App Service name and Static Web App deployment token as outputs so downstream workflows can consume them.

**Why this priority**: This is the core value of the feature. Every subsequent story depends on this automated, keyless pipeline running reliably.

**Independent Test**: Can be fully tested by pushing a commit to `main` (or triggering manually), then verifying in the Azure portal that all resources exist, are tagged correctly, and that the pipeline job outputs contain the expected values.

**Acceptance Scenarios**:

1. **Given** a commit is merged to `main`, **When** the workflow runs, **Then** all three Azure resources (App Service Plan, Web App, Static Web App) are present in the target resource group.
2. **Given** the resource group does not yet exist, **When** the workflow runs, **Then** the resource group is created automatically before Bicep deployment.
3. **Given** a successful deployment, **When** the workflow completes, **Then** the `app-service-name` and `static-web-app-token` job outputs are populated and the sibling `deploy-api` and `deploy-web` jobs within the same workflow file can consume them via `needs.infra.outputs.*`.

---

### User Story 2 - Manual Infrastructure Deployment via Workflow Dispatch (Priority: P2)

A developer or operator needs to (re)deploy infrastructure on demand — for example to a non-default environment or to recover from drift — without pushing a commit. They trigger the pipeline manually from the GitHub Actions UI, supply optional parameters (environment name, Bicep parameter overrides), and the same provisioning steps execute.

**Why this priority**: Manual triggering is a safety valve for operational scenarios and environment-specific deployments. It requires the same pipeline logic as P1 but adds a manual entry point.

**Independent Test**: Can be fully tested by using the "Run workflow" button in the GitHub Actions UI and verifying that infrastructure is provisioned without any code change.

**Acceptance Scenarios**:

1. **Given** the `workflow_dispatch` trigger is configured, **When** a user clicks "Run workflow" in the GitHub Actions UI, **Then** the infrastructure pipeline runs with the supplied parameters.
2. **Given** a manual run targets an existing resource group, **When** deployment completes, **Then** existing resources are updated in place and not recreated.

---

### User Story 3 - Consistent Tagging of All Azure Resources (Priority: P3)

An operations team member audits Azure costs and governance compliance. Every resource provisioned by this pipeline — App Service Plan, Web App, and Static Web App — bears three mandatory tags: `app` (application name), `environment` (e.g., `dev`, `qa`, `prod`), and `managedBy=bicep`. This lets cost reports and policy assignments filter resources reliably.

**Why this priority**: Tagging is a non-functional correctness requirement. Resources already exist in the Bicep templates with tags, so this story validates that the pipeline passes parameters correctly and that no resource is deployed without tags.

**Independent Test**: After a successful pipeline run, use Azure Resource Graph or the portal to confirm all three tagged fields are present on every resource in the resource group.

**Acceptance Scenarios**:

1. **Given** a deployment completes, **When** resource tags are inspected, **Then** every provisioned resource has `app`, `environment`, and `managedBy=bicep` tags with non-empty values.
2. **Given** the environment parameter is changed (e.g., from `dev` to `prod`), **When** the pipeline runs, **Then** all resources reflect the updated `environment` tag.

---

### Edge Cases

- What happens when the Azure OIDC federated credential is misconfigured or expired? The workflow must fail with a clear authentication error rather than a silent timeout.
- What happens when the resource group already exists but in a different Azure region? Bicep deployment should succeed because `az deployment group create` operates within the resource group, not on its location.
- What happens when a downstream workflow attempts to use outputs before the infrastructure job completes? The pipeline must express an explicit job dependency (`needs:`) to prevent race conditions.
- What happens when the Bicep deployment produces a no-op (no changes needed)? The pipeline must still complete successfully and emit outputs.
- What happens if a run is cancelled mid-deployment by the concurrency group? Azure ARM deployments that are in progress when the runner is cancelled may leave rollback state; the next run that completes will reconcile drift by applying the full Bicep template idempotently.
- What happens if the per-environment parameter file is missing (e.g., `parameters.qa.json` does not exist)? The `az deployment group create` command will fail immediately with a file-not-found error, halting the pipeline before any Azure resources are modified.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The pipeline MUST trigger automatically on every push to the `main` branch.
- **FR-002**: The pipeline MUST be triggerable manually via the `workflow_dispatch` event from the GitHub Actions UI, accepting an `environment` input with allowed values `development`, `staging`, and `production` (defaulting to `development`).
- **FR-003**: The pipeline MUST authenticate to Azure using OIDC federated credentials (no long-lived secrets stored in repository secrets).
- **FR-004**: The pipeline MUST create the target Azure resource group if it does not already exist before running the Bicep deployment.
- **FR-005**: The pipeline MUST deploy `bicep/main.bicep` using an Azure resource-group-scoped deployment, provisioning an App Service Plan (Linux B1), Web App, and Static Web App.
- **FR-006**: All Azure resources provisioned by the Bicep templates MUST carry the tags `app`, `environment`, and `managedBy=bicep`.
- **FR-007**: The `infra` job MUST expose the deployed App Service name as a named job output (`app-service-name`), consumable by sibling jobs via `needs.infra.outputs.app-service-name`.
- **FR-008**: The `infra` job MUST expose the Static Web App deployment token as a named plain job output (`static-web-app-token`), consumable by sibling jobs via `needs.infra.outputs.static-web-app-token`.
- **FR-009**: The pipeline MUST NOT store long-lived Azure credentials (passwords, client secrets) in GitHub repository secrets; authentication MUST use a workload identity federation approach.
- **FR-010**: The pipeline MUST fail fast and report a clear error if any deployment step fails, preventing partial or silent failures.
- **FR-011**: The infrastructure provisioning stage (`infra` job), the API deployment stage (`deploy-api` job), and the frontend deployment stage (`deploy-web` job) MUST all be defined as jobs within the single workflow file `.github/workflows/deploy-infra.yml`; `deploy-api` and `deploy-web` MUST declare `needs: [infra]` to enforce sequencing.
- **FR-012**: Before invoking the Bicep deployment, the `infra` job MUST map the human-readable `environment` input (`development` → `dev`, `staging` → `qa`, `production` → `prod`) to the short-form value required by the Bicep `@allowed` constraint; the mapped value MUST be used for both the Bicep parameter and all resource tags.
- **FR-013**: The workflow MUST define a concurrency group scoped to the triggering branch (e.g., `deploy-${{ github.ref }}`). When a new run is triggered while a previous run is still in progress for the same branch, the in-flight run MUST be cancelled (`cancel-in-progress: true`) so that only the latest commit is deployed.
- **FR-014**: Three environment-specific Bicep parameter files MUST exist — `bicep/parameters.dev.json`, `bicep/parameters.qa.json`, and `bicep/parameters.prod.json` — each containing the full set of parameters for that environment. The `infra` job MUST select the correct file by matching the mapped short-form environment value (e.g., `dev` → `parameters.dev.json`) and pass it to `az deployment group create` via `--parameters @bicep/parameters.<env>.json`.

### Key Entities

- **GitHub Actions Workflow**: The single automation file `.github/workflows/deploy-infra.yml` containing three jobs — `infra`, `deploy-api`, and `deploy-web` — that execute sequentially within each run.
- **Azure OIDC Federated Credential**: The trust relationship between a GitHub repository/branch and an Azure identity, enabling keyless authentication.
- **Bicep Deployment**: A resource-group-scoped invocation of `bicep/main.bicep` that provisions or updates the App Service Plan, Web App, and Static Web App.
- **Job Output**: Named values (`app-service-name`, `static-web-app-token`) set by the `infra` job and consumed by sibling jobs via `needs.infra.outputs.*` within the same workflow run.
- **Resource Tags**: Key-value metadata (`app`, `environment`, `managedBy`) applied to every Azure resource for governance and cost tracking.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every push to `main` results in an infrastructure pipeline run completing (success or failure) within 10 minutes with no manual intervention required.
- **SC-002**: 100% of Azure resources provisioned by the pipeline carry all three required tags (`app`, `environment`, `managedBy=bicep`), verifiable via a resource query immediately after deployment.
- **SC-003**: The pipeline produces non-empty `app-service-name` and `static-web-app-token` outputs on every successful run, enabling downstream deploy jobs to proceed without additional lookup steps.
- **SC-004**: No Azure credentials (passwords or client secrets) are stored in GitHub repository secrets; authentication is entirely token-based, verifiable by reviewing the repository secrets list.
- **SC-005**: Engineers can trigger an infrastructure deployment on demand in under 2 minutes of elapsed time from clicking "Run workflow" to the pipeline starting.
- **SC-006**: A failed deployment step causes the entire workflow to halt with a non-zero exit code, preventing downstream jobs from executing against a partially provisioned environment.

## Assumptions

- The Azure subscription ID, tenant ID, and OIDC client/app ID will be stored as GitHub repository secrets (`AZURE_SUBSCRIPTION_ID`, `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`) prior to pipeline execution. These are non-sensitive identifiers, not credentials.
- The default Bicep parameter values in `bicep/main.bicep` (e.g., `appName=aigenius`, `appServicePlanSku=B1`) are appropriate for the CI/CD target environment; the default environment for automated `push` triggers is `dev` (mapped from `development`).
- Manual `workflow_dispatch` runs default to `development` (i.e., `dev`) unless the operator selects `staging` or `production`.
- The `workflow_dispatch` input accepts `development`, `staging`, or `production`; the workflow translates these to `dev`, `qa`, or `prod` respectively before passing them to Bicep.
- A single target resource group name (e.g., `rg-aigenius-dev`) will be configured as a repository variable or workflow default.
- Three per-environment Bicep parameter files will be created as part of this feature: `bicep/parameters.dev.json`, `bicep/parameters.qa.json`, and `bicep/parameters.prod.json`. The existing `bicep/main.parameters.json` serves as a reference but is not used directly by the workflow.
- The Static Web App deployment token is emitted as a plain job output with no log masking.
