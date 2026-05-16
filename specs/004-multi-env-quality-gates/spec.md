---
feature: 004-multi-env-quality-gates
risk: medium
breaking: false
reviewer-team: platform
---

# Spec: Multi-Environment Bicep Deployment Pipeline with Approvals

## Overview

Add a GitHub Actions workflow that runs on every pull request to `main` and
executes a sequential, gated Bicep deployment pipeline across three Azure
environments: **dev → qa → prod**.  Promotion between environments is enforced
by GitHub Environment protection rules (required reviewers for qa and prod).
The workflow uses `az deployment group validate` and `az deployment group
what-if` as lightweight "plan" stages, matching the Terraform plan/apply
pattern without leaving Terraform tooling.

## Requirements

### Functional

| ID | Requirement |
|----|-------------|
| F-1 | Workflow triggers on every `pull_request` targeting `main`. |
| F-2 | Stage order: `validate → plan-dev → deploy-dev → plan-qa → deploy-qa → plan-prod → deploy-prod`. |
| F-3 | Each stage is a separate GitHub Actions job so approval gates can block between them. |
| F-4 | `validate` runs `az deployment group validate` against the dev parameter file. |
| F-5 | Every `plan-*` job runs `az deployment group what-if` for its environment. |
| F-6 | Every `deploy-*` job runs `az deployment group create` for its environment. |
| F-7 | Parameter files `bicep/parameters.dev.json`, `bicep/parameters.qa.json`, `bicep/parameters.prod.json` supply per-environment values. |
| F-8 | Prod uses a higher SKU (`B2` App Service Plan, `Standard` Static Web App); dev and qa use `B1`/`Free`. |

### Non-Functional

| ID | Requirement |
|----|-------------|
| NF-1 | Concurrency group `${{ github.workflow }}-${{ github.ref }}` with `cancel-in-progress: true` (matches existing workflows). |
| NF-2 | Approval gates for qa and prod configured via GitHub Environment protection rules — **not** in the workflow YAML. **Note**: required-reviewer gates are a deliberate deviation from Constitution Principle III ("no manual steps in the happy path") accepted as a production-safety trade-off. |
| NF-3 | Branch protection on `main` configured in GitHub repo Settings — **not** in the workflow YAML. |
| NF-4 | No new third-party actions; only `actions/checkout@v4` and `azure/login@v1`. |
| NF-5 | GitHub Secret `AZURE_CREDENTIALS` and GitHub Variables `AZURE_RESOURCE_GROUP` and `APP_NAME` must exist at repository scope before the workflow can execute. Environment-level `AZURE_RESOURCE_GROUP` overrides are optional (see quickstart.md). |

## User Stories

| ID | Story | Acceptance Criteria | Maps to |
|----|-------|---------------------|---------|
| US1 | As a developer, I want every PR to `main` to automatically trigger the full 7-job Bicep pipeline so that infrastructure changes are validated before merge. | Workflow `004 Multi-Env Bicep CI` appears in PR checks; `validate`, `plan-dev`, `deploy-dev` complete without error on every PR. | F-1, F-2, F-3, F-4, F-5, F-6 |
| US2 | As an operator, I want human approval gates on the `qa` and `prod` environments so that no deployment reaches production without explicit sign-off. | Pipeline pauses at `plan-qa` with a **"Review deployments"** button; after approval `deploy-qa` runs, then pipeline pauses at `plan-prod`; after approval `deploy-prod` runs. | NF-2 |
| US3 | As a team lead, I want branch protection on `main` to require the `Bicep Validate` status check to pass before merging, so that no unvalidated Bicep reaches `main`. | Attempting to merge a PR without `Bicep Validate` passing is blocked; once all checks pass and approvals are granted the merge is allowed. | NF-3 |

## Out of Scope

- Application build or test steps (covered by 002 and 003 workflows).
- Terraform; the project is Bicep-only.
- Automated creation of Azure resource groups per environment.
- Rollback automation.

## Artifacts Produced

| File | Status |
|------|--------|
| `.github/workflows/004-multi-env-ci.yml` | ✅ already created (untracked) |
| `bicep/parameters.dev.json` | ✅ already exists |
| `bicep/parameters.qa.json` | ✅ already exists |
| `bicep/parameters.prod.json` | ✅ already exists |
| GitHub Environment setup (dev/qa/prod) | 📋 manual — see quickstart.md |
| Branch protection on `main` | 📋 manual — see quickstart.md |
