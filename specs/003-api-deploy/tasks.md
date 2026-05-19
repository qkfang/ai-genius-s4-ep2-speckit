---
description: "Task list for feature 003-api-deploy: Backend API CI/CD Pipeline"
---

# Tasks: Backend API CI/CD Pipeline

**Input**: Design documents from `/specs/003-api-deploy/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/workflow-interface.md, quickstart.md

**Tests**: This feature is a CI/CD workflow. The spec does not request automated unit tests; verification is performed via manual/operational checks per `quickstart.md` (push trigger, manual dispatch, concurrency cancellation, failure modes). Validation tasks are included as the equivalent of acceptance tests.

**Organization**: Tasks are grouped by user story (US1, US2, US3) so each can be implemented and verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to a user story in `spec.md` (US1 / US2 / US3)
- All file paths are repository-root-relative

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Pre-flight checks confirming the environment expected by the workflow exists. No code is written here — these tasks are repository / Azure configuration verifications that unblock all user stories.

- [ ] T001 Verify `src/ai-genius-api/ai-genius-api.csproj` exists and its `<TargetFramework>` is `net10.0` (FR-005). If missing or mismatched, stop and reconcile with the spec before proceeding.
- [ ] T002 [P] Verify the GitHub repository secret `AZURE_CREDENTIALS` exists and is the same secret consumed by `.github/workflows/001-deploy-infra.yml` (FR-004, FR-012, SC-006). Do NOT create a new secret.
- [ ] T003 [P] Verify (or create) the three GitHub environments `dev`, `qa`, `prod` under repository → Settings → Environments (FR-009, quickstart.md §Prerequisites).
- [ ] T004 [P] Verify (or create) the GitHub Actions variable `APP_SERVICE_NAME` in each of the `dev`, `qa`, `prod` environments, with the exact App Service name provisioned by `.github/workflows/001-deploy-infra.yml` for that environment (FR-008, quickstart.md §Prerequisites).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the scaffold of the workflow file at the exact path mandated by the spec, with the workflow-level configuration (name, triggers, concurrency, env block, permissions) that every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T005 Create the workflow file at `.github/workflows/003-deploy-api.yml` with `name: 003 Deploy API to Azure` and workflow-level `permissions: contents: read` (FR-003, contracts/workflow-interface.md §Job).
- [ ] T006 In `.github/workflows/003-deploy-api.yml`, declare the workflow-level `env:` block exposing `ENVIRONMENT: ${{ github.event.inputs.environment || 'dev' }}`, `DOTNET_VERSION: 10.0.x`, `PROJECT_PATH: src/ai-genius-api/ai-genius-api.csproj`, and `APP_SERVICE_NAME: ${{ vars.APP_SERVICE_NAME }}` (contracts/workflow-interface.md §Environment Variables, FR-005, FR-008, FR-013).
- [ ] T007 In `.github/workflows/003-deploy-api.yml`, scaffold an empty `jobs.build-and-deploy` job with `runs-on: ubuntu-latest` and `environment: ${{ github.event.inputs.environment || 'dev' }}` so subsequent story tasks can attach steps (FR-009, contracts/workflow-interface.md §Job).

**Checkpoint**: Workflow skeleton exists at the canonical path with shared env, permissions, and the deploy job container. User story implementation can now proceed.

---

## Phase 3: User Story 1 - Automated API Deployment on Code Push (Priority: P1) 🎯 MVP

**Goal**: Every push to `main` triggers a workflow that builds the .NET 10 API at `src/ai-genius-api/ai-genius-api.csproj`, publishes it in Release, zips the publish output, authenticates to Azure via `AZURE_CREDENTIALS`, and Zip Deploys the artifact to the Linux B1 App Service named by `vars.APP_SERVICE_NAME` in the `dev` environment.

**Independent Test**: Merge a commit to `main` that changes a `/health` (or equivalent) response. Wait for the workflow to complete green. `curl https://${APP_SERVICE_NAME}.azurewebsites.net/health` and confirm the response reflects the triggering commit (quickstart.md §Verification).

### Implementation for User Story 1

- [ ] T008 [US1] Add the `on.push.branches: [main]` trigger to `.github/workflows/003-deploy-api.yml` (FR-001, contracts/workflow-interface.md §Triggers).
- [ ] T009 [US1] Add Step 1 — `actions/checkout@v4` — as the first step of `jobs.build-and-deploy` in `.github/workflows/003-deploy-api.yml` (FR-008a step 1).
- [ ] T010 [US1] Add Step 2 — `actions/setup-dotnet@v4` with `dotnet-version: ${{ env.DOTNET_VERSION }}` — to `.github/workflows/003-deploy-api.yml` (FR-005, FR-008a step 2).
- [ ] T011 [US1] Add Step 3 — a `run:` step executing `dotnet publish ${{ env.PROJECT_PATH }} --configuration Release --output ./publish` — to `.github/workflows/003-deploy-api.yml` (FR-006, FR-008a step 3).
- [ ] T012 [US1] Add Step 4 — a `run:` step packaging the publish output: `cd publish && zip -r ../publish.zip .` producing `./publish.zip` — to `.github/workflows/003-deploy-api.yml` (FR-006, FR-008a step 4).
- [ ] T013 [US1] Add Step 5 — `azure/login@v1` with `creds: ${{ secrets.AZURE_CREDENTIALS }}` — to `.github/workflows/003-deploy-api.yml` (FR-004, FR-008a step 5).
- [ ] T014 [US1] Add Step 6 — `azure/webapps-deploy@v3` with `app-name: ${{ env.APP_SERVICE_NAME }}` and `package: ./publish.zip` — to `.github/workflows/003-deploy-api.yml` (FR-007, FR-008, FR-008a step 6).
- [ ] T015 [US1] Verify in `.github/workflows/003-deploy-api.yml` that the six deploy steps appear in exactly the order checkout → setup-dotnet → publish → zip → login → webapps-deploy, with no extra/intervening steps that would violate FR-008a (contracts/workflow-interface.md §Ordered steps).
- [ ] T016 [US1] Manual validation: push a trivial change to `main`, observe the `003 Deploy API to Azure` run complete green within 10 minutes, then `curl https://${APP_SERVICE_NAME}.azurewebsites.net/health` and confirm the response is served from the triggering commit (SC-001, SC-002, Acceptance Scenarios 1–2).
- [ ] T017 [US1] Failure-path validation: introduce a deliberate compile error in `src/ai-genius-api`, push to `main`, and confirm the workflow fails at the `dotnet publish` step and that no `azure/webapps-deploy@v3` step is executed (FR-011, SC-005, Acceptance Scenario 3). Revert the change.

**Checkpoint**: At this point, User Story 1 should be fully functional — push-to-`main` produces a successful Zip Deploy to the `dev` App Service, and build failures abort the pipeline before any deploy.

---

## Phase 4: User Story 2 - Manual API Deployment via Workflow Dispatch (Priority: P2)

**Goal**: An operator can click "Run workflow" in the GitHub Actions UI, choose `dev`, `qa`, or `prod`, and the same build+deploy pipeline runs against the App Service of the selected environment (resolved via that environment's `vars.APP_SERVICE_NAME`).

**Independent Test**: From *Actions → 003 Deploy API to Azure → Run workflow*, select `qa`, run the workflow, and verify the `qa` App Service is updated (and `dev`/`prod` are not). Repeat with no input on a `push` trigger and confirm `dev` is targeted by default (quickstart.md §Usage, Acceptance Scenarios 1–2).

### Implementation for User Story 2

- [ ] T018 [US2] Add the `on.workflow_dispatch` trigger to `.github/workflows/003-deploy-api.yml` with an `inputs.environment` of `type: choice`, `required: true`, `default: dev`, and `options: [dev, qa, prod]` (FR-002, contracts/workflow-interface.md §Inputs).
- [ ] T019 [US2] Confirm `.github/workflows/003-deploy-api.yml` resolves the deploy `environment:` and the `ENVIRONMENT` env var via `${{ github.event.inputs.environment || 'dev' }}` so that push runs default to `dev` and dispatch runs honor the selected value (FR-009, FR-013, G6).
- [ ] T020 [US2] Manual validation: trigger a `workflow_dispatch` run selecting `qa`; confirm the deploy job's GitHub environment shows `qa`, `vars.APP_SERVICE_NAME` resolves to the qa App Service, and only the qa App Service serves the new build (SC-003, Acceptance Scenario 1).
- [ ] T021 [US2] Manual validation: trigger a `workflow_dispatch` run accepting the default (`dev`) and an automatic `push` to `main`; confirm both target the `dev` environment's App Service (FR-013, Acceptance Scenario 2).
- [ ] T022 [US2] (Optional) Configure GitHub environment protection rules on the `prod` environment (required reviewers and/or wait timer) so that `workflow_dispatch` runs targeting `prod` pause for approval before `azure/login@v1` (Edge Case: `workflow_dispatch` targeting `prod`).

**Checkpoint**: Manual dispatch from the Actions UI works against any of `dev`/`qa`/`prod`, and default behavior on push remains `dev`. User Story 2 is independently complete.

---

## Phase 5: User Story 3 - Concurrency-Safe Deployments (Priority: P3)

**Goal**: When two runs are triggered on the same ref in quick succession, the older in-flight run is cancelled so that only the latest commit reaches the App Service.

**Independent Test**: Push two empty commits ~5 seconds apart to `main` (see quickstart.md §Verify concurrency cancellation). In Actions, the first run shows **Cancelled** and only the second run reaches the deploy step (Acceptance Scenarios 1–2).

### Implementation for User Story 3

- [ ] T023 [US3] Add a workflow-level `concurrency:` block to `.github/workflows/003-deploy-api.yml` with `group: ${{ github.workflow }}-${{ github.ref }}` and `cancel-in-progress: true` (FR-010, contracts/workflow-interface.md §Concurrency Contract).
- [ ] T024 [US3] Manual validation: run the two-empty-commit sequence from quickstart.md §Verify concurrency cancellation and confirm in the Actions run history that the first run is cancelled and only the second run completes a deploy (SC-004, Acceptance Scenarios 1–2).

**Checkpoint**: Concurrent push runs on the same ref correctly supersede each other. All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cross-story verifications, documentation alignment, and the final acceptance sweep against the spec's measurable outcomes (SC-001 through SC-006).

- [ ] T025 [P] Lint/validate `.github/workflows/003-deploy-api.yml` with `actionlint` (or equivalent) and resolve any reported issues without altering the ordered six steps required by FR-008a.
- [ ] T026 [P] Cross-check `.github/workflows/003-deploy-api.yml` against `.github/workflows/001-deploy-infra.yml` and confirm both use the same authentication pattern (`azure/login@v1` + `AZURE_CREDENTIALS`) and `concurrency` policy shape (FR-004, FR-012, SC-006).
- [ ] T027 Edge-case validation: in a non-prod environment, temporarily unset `vars.APP_SERVICE_NAME` and trigger a `workflow_dispatch` run; confirm the deploy step fails with a clear `app-name` validation error and that no deployment occurs. Restore the variable afterwards (Edge Case: missing App Service, FR-011).
- [ ] T028 Edge-case validation: in a non-prod environment, temporarily set `AZURE_CREDENTIALS` to an invalid value (or test against a service principal with no rights); trigger a run and confirm `azure/login@v1` fails fast before any artifact is uploaded. Restore the secret afterwards (Edge Case: Azure login failure, FR-011, G2).
- [ ] T029 [P] Update `specs/003-api-deploy/quickstart.md` if any step deviates from the as-implemented workflow (e.g., step names, output paths) so onboarding instructions match reality.
- [ ] T030 Final acceptance sweep: walk through `spec.md` §Success Criteria and confirm SC-001, SC-002, SC-003, SC-004, SC-005, SC-006 each have at least one validation task above marked complete. Record the verifying run URLs in the PR description.

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 (Setup, T001–T004)** → must complete before Phase 2.
- **Phase 2 (Foundational, T005–T007)** → MUST complete before any user-story phase. Creates the workflow file scaffold every story edits.
- **Phase 3 (US1, T008–T017)** → depends on Phase 2. Delivers the MVP.
- **Phase 4 (US2, T018–T022)** → depends on Phase 2; independent of Phase 3 (only adds the `workflow_dispatch` trigger and validates environment routing), but in practice runs after US1 so the build+deploy steps already exist to exercise on dispatch.
- **Phase 5 (US3, T023–T024)** → depends on Phase 2; independent of Phase 3 and Phase 4. Adds the workflow-level `concurrency` block, which can be merged at any time after the workflow file exists.
- **Phase 6 (Polish, T025–T030)** → depends on all prior phases.

### User story independence

- **US1 (push → deploy)**: needs only Phase 2 + Steps 1–6.
- **US2 (manual dispatch)**: needs only Phase 2 + the `workflow_dispatch` input wiring; reuses the same job steps from US1, but the trigger/input contract itself can be added/tested in isolation.
- **US3 (concurrency)**: needs only Phase 2; adds a single top-level `concurrency:` key.

Each story is independently shippable once Phase 2 is in place.

### Within-phase dependencies

- T005 must precede T006–T007 (file must exist before adding `env:` / `jobs:`).
- T008–T014 each edit `.github/workflows/003-deploy-api.yml` and therefore run sequentially (no `[P]`).
- T016–T017 require T008–T015 to be merged so a real run can be triggered.
- T020–T021 require T018–T019.
- T024 requires T023.

---

## Parallel Execution Examples

### Phase 1 (Setup)

T002, T003, T004 are independent repository-configuration checks and can be done in parallel by separate operators:

```text
T002 [P] — verify AZURE_CREDENTIALS secret
T003 [P] — verify/create dev/qa/prod environments
T004 [P] — verify/create vars.APP_SERVICE_NAME per environment
```

T001 (csproj target framework check) can also be parallelized with T002–T004 since it touches a different surface (the .NET project, not GitHub settings).

### Phase 6 (Polish)

T025 (actionlint), T026 (cross-check with 001 workflow), and T029 (quickstart edits) touch different artifacts and can run in parallel:

```text
T025 [P] — actionlint on .github/workflows/003-deploy-api.yml
T026 [P] — diff/compare with .github/workflows/001-deploy-infra.yml
T029 [P] — update specs/003-api-deploy/quickstart.md
```

T027 and T028 are exclusive environment-mutation tests and must run sequentially (and against a non-prod environment).

---

## Implementation Strategy

### MVP first (User Story 1 only)

1. Complete Phase 1 (T001–T004) — confirm prerequisites.
2. Complete Phase 2 (T005–T007) — scaffold `.github/workflows/003-deploy-api.yml`.
3. Complete Phase 3 (T008–T017) — push trigger + 6 ordered steps + validation.
4. **STOP and DELIVER**: the MVP — push to `main` deploys the API to `dev` — is shippable here.

### Incremental delivery

5. Add Phase 4 (US2) to unlock manual dispatch to `qa`/`prod` — ship.
6. Add Phase 5 (US3) to harden against concurrent pushes — ship.
7. Run Phase 6 polish + acceptance sweep before declaring the feature complete.

### Suggested MVP scope

Just **User Story 1** (Phases 1 → 2 → 3). This alone satisfies the primary feature goal: "Deploy the AI Genius backend API via GitHub Actions" on every merge to `main`.

---

## Format Validation

All 30 tasks above conform to the required format `- [ ] [TaskID] [P?] [Story?] Description with file path`:

- ✅ Every task starts with a markdown checkbox `- [ ]`.
- ✅ Every task has a sequential ID `T001`–`T030`.
- ✅ `[P]` is applied only where the task touches a different artifact than its siblings and has no incomplete dependencies.
- ✅ `[US1]`/`[US2]`/`[US3]` labels appear on every Phase 3/4/5 task; Setup, Foundational, and Polish tasks correctly omit a story label.
- ✅ Every task names a concrete file path (`.github/workflows/003-deploy-api.yml`, `src/ai-genius-api/ai-genius-api.csproj`, `specs/003-api-deploy/quickstart.md`) or a concrete repository/Azure configuration target.
