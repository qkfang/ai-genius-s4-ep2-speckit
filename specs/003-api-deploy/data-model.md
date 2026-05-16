# Data Model: 003-api-deploy

**Feature**: `003-api-deploy`  
**Date**: 2026-05-16

This feature is a CI/CD workflow — it has no persistent data model. The "data" consists of workflow inputs/outputs, GitHub Secrets/Variables, and the build artifact.

## Workflow Inputs

| Name | Source | Type | Required | Default | Notes |
|------|--------|------|----------|---------|-------|
| `environment` | `workflow_dispatch.inputs.environment` | `choice` of `dev`/`qa`/`prod` | Yes (on dispatch) | `dev` | Push events skip the input and the workflow falls back to `dev`. |

## GitHub Secrets (repository)

| Name | Used By | Purpose |
|------|---------|---------|
| `AZURE_CREDENTIALS` | `azure/login@v1` | Service principal JSON granting deploy permission on the target App Service. |

## GitHub Variables (per environment)

| Name | Used By | Example | Purpose |
|------|---------|---------|---------|
| `APP_SERVICE_NAME` | `azure/webapps-deploy@v3` | `aigenius4-api-dev` | Resolves to the App Service resource name for the selected GitHub environment. |

## Build Artifact

| Name | Path | Producer | Consumer |
|------|------|----------|----------|
| Publish output | `./publish` (job working directory) | `dotnet publish ... --output ./publish` | `zip` step |
| `publish.zip` | `./publish.zip` | `zip` step | `azure/webapps-deploy@v3` (`package` input) |

## Invariants & Guarantees

- **G1**: The `azure/webapps-deploy@v3` step runs **only** if `dotnet publish` and the zip step both succeed.
- **G2**: The job binds to the GitHub environment named by the `environment` input (falling back to `dev`), so `vars.APP_SERVICE_NAME` resolves to the correct per-environment value.
- **G3**: A newer run for the same `github.ref` cancels any in-flight run via the workflow-level `concurrency` block.
- **G4**: No long-lived Azure credentials appear in the workflow file — only the `AZURE_CREDENTIALS` secret reference.
