# Phase 0 Research: Backend API CI/CD Pipeline

**Feature**: `003-api-deploy`
**Date**: 2026-05-19

This document captures the design decisions and the alternatives that were considered for the `003-deploy-api.yml` workflow. All `NEEDS CLARIFICATION` items from the spec's Technical Context were resolved by the two clarification sessions recorded in `spec.md` (2026-03-22 and 2026-05-19).

---

## R1. Authentication to Azure

- **Decision**: Use `azure/login@v1` with the existing `AZURE_CREDENTIALS` repository secret.
- **Rationale**: Convention is already established by `.github/workflows/001-deploy-infra.yml`. Reusing the secret satisfies FR-012 and SC-006 (no new long-lived credentials). It is the simplest path that works for all three environments without provisioning OIDC federated credentials specifically for the API workflow.
- **Alternatives considered**:
  - `azure/login@v2` with OIDC federated credentials (as `001-bicep-deploy` plan originally targeted). Rejected for this feature because the spec explicitly mandates parity with the current `001-deploy-infra.yml` (which uses `@v1` + `AZURE_CREDENTIALS`), and introducing OIDC here would require new federated credential setup outside the scope of this spec.
  - Publish profile (`AZUREAPPSERVICE_PUBLISHPROFILE_*` secret) consumed by `azure/webapps-deploy`. Rejected: would introduce a *new* long-lived per-environment secret, violating FR-012.

## R2. .NET SDK installation

- **Decision**: `actions/setup-dotnet@v4` pinned to `dotnet-version: '10.0.x'`.
- **Rationale**: The project's `TargetFramework` is `net10.0` (confirmed in `src/ai-genius-api/ai-genius-api.csproj`). `10.0.x` accepts patch updates while preventing accidental upgrade to a future major SDK.
- **Alternatives considered**:
  - Pinning to an exact SDK version (e.g. `10.0.100`). Rejected as too brittle for a demo CI/CD pipeline; patch drift is desirable.
  - Using a `global.json` to lock SDK version. Rejected as out of scope and not required by the spec.

## R3. Build & package strategy

- **Decision**: `dotnet publish src/ai-genius-api/ai-genius-api.csproj --configuration Release --output ./publish`, then `cd publish && zip -r ../publish.zip .` to produce a single `.zip` artifact for Zip Deploy.
- **Rationale**: The spec's 2026-05-19 clarification fixes the ordered steps and the Zip Deploy mode. Linux B1 App Service runs framework-dependent .NET apps via the platform's bundled runtime, so a plain `dotnet publish` (framework-dependent) produces the smallest, fastest-to-deploy artifact. The `zip` CLI is preinstalled on `ubuntu-latest`.
- **Alternatives considered**:
  - `dotnet publish -r linux-x64 --self-contained true` (mentioned in the earlier 2026-03-22 clarification). Superseded by the 2026-05-19 clarifications, which specify Zip Deploy without mandating self-contained. Self-contained inflates the artifact ~70 MB+ and is unnecessary because App Service Linux ships the .NET 10 runtime. The implementation MAY include the `-r linux-x64 --self-contained true` flags if a future operator decides framework drift is a risk, but the canonical recipe in this plan is framework-dependent.
  - Container image deployment (Docker → ACR → App Service). Rejected: violates the **Simplicity** principle and contradicts the spec's explicit "Zip Deploy" choice (FR-007).
  - GitHub artifact upload/download split across jobs. Rejected: single-job pipeline is simpler and faster (SC-001), and there are no other consumers of the artifact.

## R4. Deployment action

- **Decision**: `azure/webapps-deploy@v3` with `package: ./publish.zip` and `app-name: ${{ vars.APP_SERVICE_NAME }}`.
- **Rationale**: Official Microsoft action; `@v3` is the current major and supports passing a zip package directly. Spec FR-007/FR-008a mandate this action explicitly.
- **Alternatives considered**:
  - `az webapp deploy --src-path publish.zip --type zip` via Azure CLI. Equivalent functionality but loses the action's built-in status reporting and PR annotations; rejected for ergonomics.

## R5. App Service name resolution

- **Decision**: Read the App Service name from `vars.APP_SERVICE_NAME`, scoped to the selected GitHub environment (`dev`/`qa`/`prod`).
- **Rationale**: 2026-05-19 clarification mandates this. Using GitHub environment variables (`vars.*`) lets each environment hold its own value without composing strings at runtime, and naturally inherits the protection rules attached to that environment.
- **Alternatives considered**:
  - Composing the name at runtime as `${{ vars.APP_NAME }}-api-${{ env.ENVIRONMENT }}` (the pattern currently in the file). Explicitly rejected by the spec: the resolved value must match the App Service name produced by `001-deploy-infra.yml` exactly, and that mapping is owned by the environment variable, not the workflow.
  - Looking up the App Service name via `az webapp list` filtered by tags. Rejected: adds an Azure CLI roundtrip per run and depends on tag conventions that may drift.

## R6. Concurrency

- **Decision**: `concurrency.group: ${{ github.workflow }}-${{ github.ref }}` with `cancel-in-progress: true`.
- **Rationale**: Matches the convention in `001-deploy-infra.yml` and satisfies FR-010 and SC-004. Scoping by `(workflow, ref)` lets pushes to feature branches (when added to triggers in the future) run independently of `main`, while still cancelling stale runs on the same branch.
- **Alternatives considered**:
  - Group on `github.ref` only. Rejected: would cross-cancel runs of different workflows on the same branch (e.g., `001-deploy-infra.yml` and this workflow), which is wrong.
  - `cancel-in-progress: false` (queue instead of cancel). Rejected: spec explicitly mandates cancellation so that only the latest commit reaches the App Service (FR-010, SC-004).

## R7. Trigger surface

- **Decision**: `on: push: branches: [main]` plus `workflow_dispatch` with a single `environment` input of type `choice` (allowed `dev`/`qa`/`prod`, default `dev`).
- **Rationale**: Mirrors `001-deploy-infra.yml` (FR-001, FR-002, FR-013). The `ENVIRONMENT` env var defaults to `dev` via `${{ github.event.inputs.environment || 'dev' }}` for push triggers (which carry no input).
- **Alternatives considered**:
  - Adding `pull_request` triggers to preview deployments. Out of scope; not in the spec.
  - Restricting `workflow_dispatch` to specific actors. Handled at the GitHub `environment` protection-rule layer, not in the workflow file itself (FR-009).

## R8. Permissions

- **Decision**: Top-level `permissions: contents: read` for the workflow.
- **Rationale**: Principle of least privilege; the workflow does not push commits, comment on PRs, or write artifacts. `azure/login@v1` with `AZURE_CREDENTIALS` does not require `id-token: write` (that is only needed for OIDC).
- **Alternatives considered**:
  - Default GitHub-token permissions (broader). Rejected on security grounds.
  - Adding `id-token: write`. Not needed because authentication is `AZURE_CREDENTIALS`-based, not OIDC.

---

## Open questions

None. All `NEEDS CLARIFICATION` items raised during planning were resolved by spec clarifications.
