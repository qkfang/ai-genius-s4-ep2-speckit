---
description: "Actionable task list for the AI Genius Backend API Deployment Workflow"
---

# Tasks: AI Genius Backend API Deployment Workflow

**Input**: Design documents from `/specs/002-api-deploy-workflow/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/deploy-api.workflow.md, quickstart.md

**Tests**: Not requested in the spec. The workflow is validated by the manual acceptance tests in `contracts/deploy-api.workflow.md` (AT-1..AT-5) and `quickstart.md`. No automated test tasks are generated.

**Organization**: Tasks are grouped by user story (US1=P1, US2=P2, US3=P3 from spec.md) so each story can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- All file paths are repository-root-relative and exact.

## Path Conventions

- New workflow file: `.github/workflows/deploy-api.yml`
- Backend API project (existing, not modified by this feature): `src/ai-genius-api/ai-genius-api.csproj`
- Existing reference workflow: `.github/workflows/deploy-infra.yml`
- Feature design docs: `specs/002-api-deploy-workflow/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Pre-flight checks for the GitHub repo / Azure tenant prerequisites the workflow will depend on. These are configuration-only tasks (no code yet) but they must be verified before the workflow can succeed.

- [ ] T001 Verify the existing .NET API project at `src/ai-genius-api/ai-genius-api.csproj` builds locally with `dotnet publish -c Release -o ./publish` on a Linux shell, confirming TFM `net9.0` is reachable (data-model.md §BackendApiProject, research.md D1).
- [ ] T002 [P] Confirm/configure GitHub repository **variable** `APP_SERVICE_NAME` in repo Settings → Variables → Actions, pointing at the Linux B1 App Service provisioned by `bicep/` via `.github/workflows/deploy-infra.yml` (FR-009, data-model.md §AzureAppServiceTarget, quickstart.md Prerequisites step 2).
- [ ] T003 [P] Confirm/configure GitHub repository **secrets** `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` for OIDC federated auth (FR-008, data-model.md §AzureCredential, quickstart.md Prerequisites step 3).
- [ ] T004 [P] Confirm the Azure AD app registration has a federated credential whose subject trusts `repo:<owner>/<repo>:ref:refs/heads/main` (and any other allowed environments), and that it holds at least `Website Contributor` on the target App Service (research.md D3, quickstart.md Prerequisites steps 4–5).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the workflow file shell with triggers, permissions, concurrency, and the single job skeleton that every user story will extend. This is the minimum the file must contain before any individual story's behavior can be wired in.

**⚠️ CRITICAL**: No user story implementation can begin until this phase is complete.

- [X] T005 Create the new workflow file `.github/workflows/deploy-api.yml` with:
  - `name: Deploy API to Azure App Service`
  - `on.push.branches: [main]` (FR-002)
  - `on.workflow_dispatch.inputs.environment` (choice `dev`/`qa`/`prod`, default `dev`) (FR-003, research.md D5)
  - Top-level `permissions: { contents: read, id-token: write }` (research.md D3, contract §Permissions)
  - `concurrency: { group: "deploy-api-${{ github.event.inputs.environment || 'dev' }}", cancel-in-progress: false }` (research.md D7)
  - A single job `build-and-deploy` running on `ubuntu-latest` with an empty `steps:` list (research.md D6, data-model.md §DeploymentWorkflow).
- [X] T006 In `.github/workflows/deploy-api.yml`, add a fail-fast guard at the top of the `build-and-deploy` job that errors out with a clear message if `vars.APP_SERVICE_NAME` is empty (FR-009, contract C-03, data-model.md §AzureAppServiceTarget validation). Implement as a shell `run:` step (e.g., `if: ${{ vars.APP_SERVICE_NAME == '' }}` → `run: echo "::error::APP_SERVICE_NAME repository variable is not set" && exit 1`) — must not echo any secret.

**Checkpoint**: Workflow file exists with correct triggers, permissions, concurrency, and pre-flight guard. User story phases can now add the build + deploy steps.

---

## Phase 3: User Story 1 - Automated Deployment on Push to Main (Priority: P1) 🎯 MVP

**Goal**: When a developer merges to `main`, the API in `src/ai-genius-api/` is automatically built (Release) and zip-deployed to the configured Linux B1 Azure App Service via `azure/webapps-deploy@v3`, with the deploy step gated behind a successful build.

**Independent Test**: Push a small observable change (e.g., bump a version string or `/` response) to `main`; confirm the workflow run starts automatically within 1 minute (SC-001), succeeds end-to-end within 10 minutes (SC-002), and the running App Service serves the new content (AS-1, AS-2, AT-1). Then push a deliberately broken `Program.cs` and confirm the deploy step is skipped and the run is marked failed (AS-3, AT-2, SC-003).

### Implementation for User Story 1

- [X] T007 [US1] In `.github/workflows/deploy-api.yml`, add **Step 1 — Checkout code**: use `actions/checkout@v4` (no inputs) as the first step of `build-and-deploy` (contract step 1, FR-012).
- [X] T008 [US1] In `.github/workflows/deploy-api.yml`, add **Step 2 — Setup .NET**: use `actions/setup-dotnet@v4` with `dotnet-version: 9.0.x` (FR-004, contract step 2, research.md D1).
- [X] T009 [US1] In `.github/workflows/deploy-api.yml`, add **Step 3 — Publish API (Release)**: shell step running `dotnet publish src/ai-genius-api/ai-genius-api.csproj -c Release -o ./publish` (FR-005, contract step 3, research.md D2, data-model.md §PublishArtifact).
- [X] T010 [US1] In `.github/workflows/deploy-api.yml`, add **Step 4 — Zip publish output**: shell step `cd publish && zip -r ../publish.zip .` so the zip contains the publish output's **contents**, not the `publish/` directory itself (FR-005, contract step 4, research.md D2).
- [X] T011 [US1] In `.github/workflows/deploy-api.yml`, add **Step 5a — Azure login (OIDC)**: use `azure/login@v2` with `client-id: ${{ secrets.AZURE_CLIENT_ID }}`, `tenant-id: ${{ secrets.AZURE_TENANT_ID }}`, `subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}` (FR-008, contract step 5a, research.md D3).
- [X] T012 [US1] In `.github/workflows/deploy-api.yml`, add **Step 5b — Deploy to App Service**: use `azure/webapps-deploy@v3` with `app-name: ${{ vars.APP_SERVICE_NAME }}` and `package: ./publish.zip` (FR-007, FR-009, contract step 5b). Verify the step has no `if:` override so it relies on the default `success()` gate (FR-006, contract C-01/C-02, research.md D6).
- [X] T013 [US1] Validate the workflow YAML syntax locally (e.g., `actionlint .github/workflows/deploy-api.yml` or VS Code GitHub Actions extension) and confirm step ordering matches the canonical FR-012 sequence `checkout → setup-dotnet → publish → zip → azure/login → webapps-deploy` (plan.md Testing, contract §Canonical Step Sequence).
- [ ] T014 [US1] Execute Acceptance Test **AT-1**: merge a trivial backend change to `main`; verify the workflow auto-runs, succeeds, and the App Service serves the new build (spec AS-1, AS-2; SC-001, SC-002).
- [ ] T015 [US1] Execute Acceptance Test **AT-2**: push a deliberate compile error in `src/ai-genius-api/Program.cs`; verify the run fails at Step 3 (Publish), Steps 5a/5b are skipped, and the App Service is unchanged (spec AS-3; FR-006; SC-003). Revert the breaking commit afterwards.

**Checkpoint**: At this point User Story 1 (the MVP) is fully delivered — every push to `main` deploys the API automatically, and broken builds never reach Azure.

---

## Phase 4: User Story 2 - Visible Build and Deployment Status (Priority: P2)

**Goal**: Anyone on the team can see in the GitHub Actions UI whether the latest `main` commit was successfully built and deployed, and can drill into per-step logs of any failed run to identify whether build or deploy failed.

**Independent Test**: Break the build, push to `main`, then open the Actions tab → the run is marked failed and the failing step is clearly identified in the logs (AS-1, AS-2 of US2; AT-2).

### Implementation for User Story 2

- [X] T016 [US2] In `.github/workflows/deploy-api.yml`, confirm/set the workflow `name: Deploy API to Azure App Service` (matches quickstart §Happy-Path label) and give every step a human-readable `name:` matching the contract step names (`Checkout code`, `Setup .NET`, `Publish API (Release)`, `Zip publish output`, `Azure login (OIDC)`, `Deploy to App Service`) so each failure point is unambiguous in the Actions UI (FR-011, contract C-06, quickstart §Diagnosing a Failed Run).
- [X] T017 [US2] Verify that the workflow does **not** suppress step output: ensure no `continue-on-error: true`, no global `2>/dev/null` redirection, and no `if:` clauses on the build/deploy steps that would hide failures (FR-010, contract C-04).
- [ ] T018 [US2] Execute acceptance check for US2: open the Actions tab after the AT-2 failure from T015 (or rerun a deliberately broken push) and confirm the run lists commit SHA + actor, and that clicking the failed step shows the .NET compiler error (US2 AS-1, AS-2; quickstart Diagnosing table row 1).

**Checkpoint**: Build/deploy outcomes are observable per-commit in the Actions UI, with per-step logs sufficient to diagnose any failure.

---

## Phase 5: User Story 3 - Safe, Repeatable Deployments (Priority: P3)

**Goal**: Re-running the workflow for the same `main` commit produces the same deployed state (idempotent), and no credential values ever appear in plain text in the workflow file or run logs.

**Independent Test**: (a) Trigger `workflow_dispatch` on the current `main` and confirm the App Service ends up serving the same commit with no manual intervention (US3 AS-1, AT-3). (b) Inspect a recent run log and confirm none of `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` values appear in plain text (US3 AS-2, AT-4, SC-005). (c) Temporarily unset `APP_SERVICE_NAME` and dispatch; confirm a clear failure with App Service unchanged (AT-5, C-03).

### Implementation for User Story 3

- [X] T019 [US3] In `.github/workflows/deploy-api.yml`, audit every `run:` step and confirm there is no `echo "$AZURE_..."`, no `printenv`, no `set -x`, and no logging of `${{ secrets.* }}` values directly — secrets must only be passed as `with:` inputs to actions (FR-008, SC-005, research.md D8, contract C-05).
- [X] T020 [US3] [P] In `.github/workflows/deploy-api.yml`, re-verify that the concurrency group is `deploy-api-${{ github.event.inputs.environment || 'dev' }}` with `cancel-in-progress: false` so re-runs and rapid pushes serialize cleanly per environment (research.md D7, spec Edge Cases on rapid pushes).
- [ ] T021 [US3] Execute Acceptance Test **AT-3**: trigger the workflow via `workflow_dispatch` on the current `main` (no new commit); confirm it runs the same 6 canonical steps and the App Service redeploys the same commit successfully (FR-003, US3 AS-1, plan.md Testing item b).
- [ ] T022 [US3] Execute Acceptance Test **AT-4**: open the run log from T021 (or T014) and confirm none of the three Azure secrets appear in plain text anywhere in the log (US3 AS-2, SC-005).
- [ ] T023 [US3] Execute Acceptance Test **AT-5**: in a throwaway test setup (or by temporarily renaming the variable), trigger the workflow with `APP_SERVICE_NAME` unset and confirm the T006 guard fails the job with a clear message before Azure is contacted; restore the variable afterwards (FR-009, contract C-03, quickstart Diagnosing row 3).

**Checkpoint**: Workflow is idempotent on re-run, leaks no secrets, and fails fast with a clear error when its single required variable is missing.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and final verification once US1–US3 are merged.

- [ ] T024 Update `specs/002-api-deploy-workflow/quickstart.md` only if any step name, secret name, or variable name diverged from what was actually implemented in `.github/workflows/deploy-api.yml` during T007–T012 (keep names in sync with the contract).
- [X] T025 [P] Cross-reference `.github/workflows/deploy-api.yml` against `contracts/deploy-api.workflow.md` row-by-row (Triggers, Inputs, Permissions, Canonical Step Sequence, Behavioral Guarantees C-01..C-06) and record any intentional deviation in plan.md §Complexity Tracking — there should be none.
- [X] T026 [P] Confirm `.github/workflows/deploy-infra.yml` is left untouched (this feature only adds a new file under `.github/workflows/`, per plan.md §Project Structure).
- [ ] T027 Final end-to-end smoke test: from a fresh commit on `main`, observe push-to-deployed time and record it; confirm it is well under the SC-002 10-minute budget (target ≤ 5 min per plan.md Performance Goals).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001–T004)** → no internal dependencies between T002/T003/T004 (all [P]); T001 is local and also independent.
- **Foundational (T005–T006)** → depends on Setup. T006 depends on T005 (same file).
- **User Story 1 (T007–T015)** → depends on Foundational complete. **This is the MVP.**
- **User Story 2 (T016–T018)** → depends on US1 (needs the step list from T007–T012 to name/verify). Can be worked in parallel with US3 conceptually, but both edit the same file as US1, so sequence after US1.
- **User Story 3 (T019–T023)** → depends on US1 (needs the deployed-and-working workflow); independent of US2 in terms of acceptance.
- **Polish (T024–T027)** → depends on US1, US2, US3.

### User Story Independence

- US1 alone is a complete, deployable MVP (auto-deploy on push).
- US2 adds **no behavior** — it is a verification/labeling layer on top of US1 (step names, log visibility).
- US3 adds **no new steps** — it is a hardening/verification layer (no secret leakage, idempotent re-run, fail-fast guard already added in T006).

This means **US1 can ship to `main` on its own** and US2/US3 acceptance can be performed against the same workflow file with only minor edits (step names in T016).

### Within Each User Story

- T007 → T008 → T009 → T010 → T011 → T012 must be appended **in order** to `.github/workflows/deploy-api.yml` to honor the canonical step sequence (FR-012). They are **not** parallelizable because they all edit the same file in a strict order.
- T013 (lint) depends on T007–T012.
- T014 (AT-1) depends on T013 and merge to `main`.
- T015 (AT-2) depends on T014 having confirmed the happy path.
- T018 depends on T016 and T017.
- T021/T022 depend on T019; T023 depends on T006 + T019.

### Parallel Opportunities

- Phase 1 Setup: **T002, T003, T004 in parallel** (different external systems — GitHub variables, GitHub secrets, Azure AD app); T001 is local and can also run in parallel.
- Phase 6 Polish: **T025 and T026 in parallel** (different verification targets).
- No parallelism within US1/US2/US3 implementation steps because they all edit the single file `.github/workflows/deploy-api.yml`.

### Parallel Example — Phase 1 Setup

```text
# Launch in parallel (different systems, no shared state):
Task T002: Set repo variable APP_SERVICE_NAME in GitHub repo Settings → Variables.
Task T003: Set repo secrets AZURE_CLIENT_ID / AZURE_TENANT_ID / AZURE_SUBSCRIPTION_ID.
Task T004: Configure Azure AD app federated credential + Website Contributor RBAC.
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1 (Setup): T001–T004.
2. Complete Phase 2 (Foundational): T005–T006.
3. Complete Phase 3 (US1): T007–T015.
4. **STOP and validate**: AT-1 passes (push deploys), AT-2 passes (broken build is gated). This is the deployable MVP and fully satisfies FR-001, FR-002, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-012 and SC-001, SC-002, SC-003, SC-004.

### Incremental Delivery

5. Layer US2 (T016–T018): step naming + log-visibility verification → satisfies FR-011 and observability acceptance scenarios.
6. Layer US3 (T019–T023): secret hygiene audit + idempotent re-run + fail-fast guard validation → satisfies FR-003 (acceptance), SC-005, and contract C-03/C-05.
7. Polish phase (T024–T027): documentation sync + contract reconciliation + perf measurement.

Each layer leaves `main` deployable; nothing in US2 or US3 changes the canonical step sequence established in US1.

---

## Task Summary

- **Total tasks**: 27 (T001–T027)
- **Per user story**:
  - Setup (no story): 4 (T001–T004)
  - Foundational (no story): 2 (T005–T006)
  - US1 (P1, MVP): 9 (T007–T015)
  - US2 (P2): 3 (T016–T018)
  - US3 (P3): 5 (T019–T023)
  - Polish (no story): 4 (T024–T027)
- **Parallelizable tasks**: 5 marked `[P]` (T002, T003, T004, T020, T025, T026) — primarily in Setup and Polish phases, since the core implementation phases all edit the single file `.github/workflows/deploy-api.yml` in a strict order.
- **Suggested MVP scope**: Phases 1 + 2 + 3 (Setup + Foundational + US1) — 15 tasks (T001–T015).
- **Independent test criteria**: each user-story phase defines its own pass criteria above (AT-1/AT-2 for US1, log-visibility checks for US2, AT-3/AT-4/AT-5 for US3) so stories can be accepted in isolation.
- **Format validation**: every task above uses the required `- [ ] TID [P?] [Story?] Description with file path` checklist format, with explicit file paths (`.github/workflows/deploy-api.yml`, `src/ai-genius-api/ai-genius-api.csproj`, `src/ai-genius-api/Program.cs`, `specs/002-api-deploy-workflow/...`) and [USx] story labels on every story-phase task.
