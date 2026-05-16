---
description: "Task list for feature 003-api-deploy implementation"
---

# Tasks: AI Genius API Deployment via GitHub Actions

**Feature**: `003-api-deploy`  
**Generated**: 2026-05-16  
**Input**: `specs/003-api-deploy/plan.md`, `spec.md`, `data-model.md`, `contracts/workflow-interface.md`, `research.md`, `quickstart.md`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Maps to a user story in `spec.md` — US1 (P1) or US2 (P2)
- Exact file paths are included in every task description

---

## Phase 1: Setup

**Purpose**: Confirm the API project is buildable and the workflow file slot is available.

- [ ] T001 Verify `src/ai-genius-api/ai-genius-api.csproj` targets `net10.0` and the project builds locally with `dotnet publish -c Release -r linux-x64 --self-contained true` (sanity check only; no file edits)
- [ ] T002 Confirm `.github/workflows/003-deploy-api.yml` does not already exist (this feature creates it)

---

## Phase 2: Foundational

**Purpose**: None. No shared scaffolding is required — the workflow is a single self-contained file.

---

## Phase 3: User Story 1 — Automated API Deployment on Push to main (Priority: P1) 🎯 MVP

**Goal**: Every push to `main` automatically builds the .NET 10 API as `linux-x64` self-contained, zips the publish output, authenticates to Azure with `AZURE_CREDENTIALS`, and Zip-deploys to the App Service named by `vars.APP_SERVICE_NAME` (resolving against the `dev` GitHub environment).

**Independent Test**: Push a trivial commit to `main`; in **Actions**, confirm the `003 Deploy API to Azure` run completes green; then `curl` the App Service URL and verify the latest behaviour.

- [ ] T003 [US1] Create `.github/workflows/003-deploy-api.yml` with `name: 003 Deploy API to Azure` and the `on:` block: `push.branches: [main]` plus `workflow_dispatch` with `inputs.environment` (choice: `dev`/`qa`/`prod`, default `dev`) — matching the structure of `.github/workflows/001-deploy-infra.yml`
- [ ] T004 [US1] In `.github/workflows/003-deploy-api.yml`, add the workflow-level `concurrency` block (`group: ${{ github.workflow }}-${{ github.ref }}`, `cancel-in-progress: true`) and `env.ENVIRONMENT: ${{ github.event.inputs.environment || 'dev' }}`
- [ ] T005 [US1] In `.github/workflows/003-deploy-api.yml`, add a `deploy-api` job: `runs-on: ubuntu-latest`, `environment: ${{ github.event.inputs.environment || 'dev' }}`
- [ ] T006 [US1] Add step `Checkout` (`uses: actions/checkout@v4`) to the `deploy-api` job in `.github/workflows/003-deploy-api.yml`
- [ ] T007 [US1] Add step `Setup .NET` (`uses: actions/setup-dotnet@v4`, `with: { dotnet-version: 10.0.x }`) to the `deploy-api` job in `.github/workflows/003-deploy-api.yml`
- [ ] T008 [US1] Add step `Publish API` running `dotnet publish src/ai-genius-api/ai-genius-api.csproj -c Release -r linux-x64 --self-contained true -o ./publish` in `.github/workflows/003-deploy-api.yml`
- [ ] T009 [US1] Add step `Zip publish output` running `cd publish && zip -r ../publish.zip .` in `.github/workflows/003-deploy-api.yml`
- [ ] T010 [US1] Add step `Azure CLI Login` (`uses: azure/login@v1`, `with: { creds: ${{ secrets.AZURE_CREDENTIALS }} }`) to `.github/workflows/003-deploy-api.yml`
- [ ] T011 [US1] Add step `Deploy to App Service` (`uses: azure/webapps-deploy@v3`, `with: { app-name: ${{ vars.APP_SERVICE_NAME }}, package: ./publish.zip }`) to `.github/workflows/003-deploy-api.yml`

**Checkpoint**: US1 complete — pushing to `main` runs the full pipeline end-to-end against the `dev` environment.

---

## Phase 4: User Story 2 — Manual API Deployment via Workflow Dispatch (Priority: P2)

**Goal**: Operators can re-deploy the API to any environment (`dev`/`qa`/`prod`) from the GitHub Actions UI without pushing a commit.

**Independent Test**: From **Actions → 003 Deploy API to Azure → Run workflow**, select `qa`, click **Run workflow**; verify the run binds to the `qa` GitHub environment and deploys to the QA App Service (`APP_SERVICE_NAME` resolves to the QA value).

- [ ] T012 [US2] (Already covered by T003) Confirm the `workflow_dispatch` trigger and `environment` input are present in `.github/workflows/003-deploy-api.yml` and that the `deploy-api` job binds to `environment: ${{ github.event.inputs.environment || 'dev' }}` so per-environment `vars.APP_SERVICE_NAME` resolves correctly

**Checkpoint**: US2 complete — manual dispatch to any environment works using the same single-job pipeline.

---

## Final Phase: Polish & Validation

- [ ] T013 [P] Validate `.github/workflows/003-deploy-api.yml` syntax (e.g., `yamllint` or VS Code GitHub Actions extension); confirm step ordering matches `contracts/workflow-interface.md`
- [ ] T014 [P] Spot-check that no secret value is hard-coded in `.github/workflows/003-deploy-api.yml` — only references like `${{ secrets.AZURE_CREDENTIALS }}` and `${{ vars.APP_SERVICE_NAME }}` appear

---

## Dependencies

```
Phase 1 (Setup: T001, T002)
   │
   ▼
Phase 3 / US1 (T003 → T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011)
   │
   ▼
Phase 4 / US2 (T012 — verification only, covered by T003)
   │
   ▼
Final (T013, T014 in parallel)
```

## Parallel Execution

The implementation is a single workflow file, so the body of US1 (T003–T011) is sequential. Only the final validation tasks (T013, T014) can run in parallel.

## Implementation Strategy

**MVP = Phase 3 (US1)**. Once US1 lands, push-triggered deploys to `dev` work end-to-end. US2 is verified by the same file (the `workflow_dispatch` trigger is added in T003).
