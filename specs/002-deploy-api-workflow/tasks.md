---
description: "Task list for feature 002-deploy-api-workflow"
---

# Tasks: Deploy API Workflow

**Input**: Design documents from `/specs/002-deploy-api-workflow/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/workflow-interface.md ✅, quickstart.md ✅

**Tests**: No automated tests requested for this CI/CD pipeline. The workflow's correctness is verified end-to-end by the post-deploy `/health` HTTP probe (Step 7 of the job), which is part of the workflow itself. API unit tests are out of scope (separate `ci.yml`).

**Organization**: Tasks are grouped by the three P1 user stories from spec.md. Because all three stories manifest in **a single workflow file** (`.github/workflows/deploy-api.yml`), most tasks within US1/US2/US3 touch that same file and are therefore **sequential** within a story (not [P]). They remain logically grouped per story so each can be independently inspected and tested against the acceptance scenarios in spec.md.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Maps the task to US1 / US2 / US3
- File paths are absolute from repository root

## Path Conventions

- Workflow: `.github/workflows/deploy-api.yml` (NEW)
- API source: `src/ai-genius-api/` (existing)
- Infra (read-only, owned by feature 001): `bicep/modules/webapp.bicep`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify prerequisites and confirm the workflow directory exists; no new project scaffolding is required because this feature adds a single YAML file.

- [X] T001 Verify `.github/workflows/` directory exists at the repository root and lists `deploy-infra.yml` (feature 001) — this confirms the location where `deploy-api.yml` will be added. No file changes.
- [X] T002 [P] Verify `src/ai-genius-api/ai-genius-api.csproj` targets `net9.0` (satisfies FR-004 "net8 or later LTS"); no edit required if `<TargetFramework>net9.0</TargetFramework>` is present.
- [X] T003 [P] Confirm the three repository secrets (`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`) and the repository variable (`APP_SERVICE_NAME`) are configured per `specs/002-deploy-api-workflow/quickstart.md` Steps 1–2. If missing, add them via **Settings → Secrets and variables → Actions** (no code change).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the `/health` endpoint that the post-deploy smoke test (US1) and HTTPS verification (US3) depend on. Without this, every workflow run would fail at the health-check step.

**⚠️ CRITICAL**: No user story phase can complete (green) until T004 ships.

- [X] T004 Add `app.MapGet("/health", () => Results.Ok(new { status = "ok" }));` to `src/ai-genius-api/Program.cs` near the existing `app.MapGet` calls. Leave the existing `/api/health` route untouched. The new route MUST return HTTP `200` with body **exactly** `{"status":"ok"}` (FR-010, SC-002). Verify locally with `dotnet build src/ai-genius-api/ai-genius-api.csproj` and a `dotnet run` + `curl http://localhost:<port>/health` smoke test.
- [X] T005 (Prerequisite check — owned by feature 001) Confirm the Bicep-provisioned App Service (`bicep/modules/webapp.bicep`) sets `httpsOnly: true`, runs on a **Linux B1** plan, and uses the `.NET 9` runtime stack (FR-009, US3). If not, raise a follow-up against feature 001; do **not** edit Bicep as part of this feature.

**Checkpoint**: `/health` endpoint exists in source; App Service is HTTPS-only on Linux B1. Ready to author the workflow.

---

## Phase 3: User Story 1 - Automatic deployment on push to `main` (Priority: P1) 🎯 MVP

**Goal**: A push (or merge) to `main` automatically builds the API in `src/ai-genius-api`, packages the publish output as `api.zip`, deploys it to the target App Service via `azure/webapps-deploy@v3` (Zip Deploy), and reports a green check on the commit — all within 10 minutes (SC-006), starting within 1 minute of the push (SC-001).

**Independent Test**: Push a trivial commit to `main`. Observe (a) the `Deploy API to Azure` run starts within 1 minute, (b) it completes with a green check, (c) `curl https://${APP_SERVICE_NAME}.azurewebsites.net/health` returns `{"status":"ok"}` (acceptance scenarios 1–3 in spec.md US1).

### Implementation for User Story 1

> All edits below target the same new file `.github/workflows/deploy-api.yml` and are therefore **sequential** (no [P]). Build the file incrementally so each task is reviewable.

- [X] T006 [US1] Create `.github/workflows/deploy-api.yml` with workflow-level metadata: `name: "Deploy API to Azure"`, `on.push.branches: [main]`, and `on.workflow_dispatch: {}` (FR-001, FR-002, edge case "Manual re-run"). Add `concurrency: { group: deploy-api-${{ github.ref }}, cancel-in-progress: false }` (FR-014).
- [X] T007 [US1] In `.github/workflows/deploy-api.yml`, declare a single job `deploy-api` with `runs-on: ubuntu-latest` and add the `actions/checkout@v4` step (Step 1 of the data-model.md step table).
- [X] T008 [US1] In `.github/workflows/deploy-api.yml`, add the `actions/setup-dotnet@v4` step pinned to `dotnet-version: 9.0.x` (Step 2; satisfies FR-004).
- [X] T009 [US1] In `.github/workflows/deploy-api.yml`, add a `run` step that executes `dotnet publish src/ai-genius-api/ai-genius-api.csproj -c Release -o ./publish` (Step 3; FR-004, FR-005 — non-zero exit short-circuits the job).
- [X] T010 [US1] In `.github/workflows/deploy-api.yml`, add a `run` step that zips the publish output: `cd ./publish && zip -r ../api.zip .` (Step 4; produces `./api.zip` for Zip Deploy per FR-006).
- [X] T011 [US1] In `.github/workflows/deploy-api.yml`, add the `azure/webapps-deploy@v3` step with `app-name: ${{ vars.APP_SERVICE_NAME }}` and `package: ./api.zip` (Step 6; FR-006, FR-013). Place it **after** the Azure login step authored in US2.
- [X] T012 [US1] In `.github/workflows/deploy-api.yml`, ensure every step has a human-readable `name:` and the job/steps emit clear log output (FR-015, SC-005) — e.g., echo the resolved `APP_SERVICE_NAME` (non-sensitive) before deploy.

**Checkpoint**: A push to `main` builds and zip-deploys the API. (Authentication & health-check still pending — handled by US2 & US3.)

---

## Phase 4: User Story 2 - Secure, secret-less authentication to Azure (Priority: P1)

**Goal**: The workflow authenticates to Azure exclusively via OIDC / Workload Identity Federation — no client secret, no publish profile, no `AZURE_CREDENTIALS` JSON — using only the three non-sensitive identifier secrets and the federated identity configured in Entra ID.

**Independent Test**: Inspect `.github/workflows/deploy-api.yml` and confirm (a) the job declares `permissions: { id-token: write, contents: read }`, (b) the Azure login uses `azure/login@v2` with `client-id`/`tenant-id`/`subscription-id` from secrets (no `creds:` field), (c) no forbidden secret name (`AZURE_CREDENTIALS`, `AZURE_CLIENT_SECRET`, `AZUREAPPSERVICE_PUBLISHPROFILE_*`) is referenced. Run the workflow end-to-end and verify the Azure login step succeeds via OIDC token exchange (spec.md US2 acceptance scenarios 1–4).

### Implementation for User Story 2

- [X] T013 [US2] In `.github/workflows/deploy-api.yml`, add the workflow-level (or job-level) `permissions:` block with `id-token: write` and `contents: read` — the minimum required for OIDC (FR-008, contract section "Required Permissions Block"). Without this, `azure/login@v2` fails with "Could not get ID token".
- [X] T014 [US2] In `.github/workflows/deploy-api.yml`, add the `azure/login@v2` step (Step 5) **after** the zip step (T010) and **before** the deploy step (T011), with inputs `client-id: ${{ secrets.AZURE_CLIENT_ID }}`, `tenant-id: ${{ secrets.AZURE_TENANT_ID }}`, `subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}`. Do **not** add a `creds:` input (FR-007).
- [X] T015 [US2] Grep `.github/workflows/deploy-api.yml` to confirm none of the forbidden names appear: `AZURE_CREDENTIALS`, `AZURE_CLIENT_SECRET`, `AZUREAPPSERVICE_PUBLISHPROFILE` (constitution / FR-007 validation rule from data-model.md §4). Treat any hit as a blocker.
- [ ] T016 [US2] (External, optional) If `quickstart.md` step 1 has not been completed, configure the Entra ID Federated Credential with subject `repo:qkfang/ai-genius-s4-ep2-speckit:ref:refs/heads/main` and assign the identity the `Website Contributor` role on the target App Service. No repo file changes; verifies US2 acceptance scenario 3.

**Checkpoint**: Workflow authenticates to Azure via OIDC alone. Combined with US1, a push to `main` now builds, logs in, and deploys — but post-deploy verification (US3) is still missing.

---

## Phase 5: User Story 3 - HTTPS-only API surface (Priority: P1)

**Goal**: After every successful deploy, the workflow proves over HTTPS that the live API serves `/health` returning exactly `{"status":"ok"}`, and the App Service rejects/redirects plain-HTTP requests. A failing health probe MUST fail the run (no silent green — SC-007).

**Independent Test**: After a successful run, `curl --fail https://${APP_SERVICE_NAME}.azurewebsites.net/health` returns `{"status":"ok"}`; `curl http://${APP_SERVICE_NAME}.azurewebsites.net/health` returns `301`/`403`. Inject a temporary regression (e.g., break `/health` in `Program.cs`) and confirm the run goes red on the health-check step, not silently green (spec.md US3 acceptance scenarios 1–3, edge case "Health check fails post-deploy").

### Implementation for User Story 3

- [X] T017 [US3] In `.github/workflows/deploy-api.yml`, add the final step (Step 7) **after** the deploy step (T011): a `run` step that executes `curl --fail -sS "https://${{ vars.APP_SERVICE_NAME }}.azurewebsites.net/health"` and asserts the body equals **exactly** `{"status":"ok"}` (FR-010, SC-002). Use `--fail` so a non-2xx response exits non-zero (red check, FR-012, SC-007).
- [X] T018 [US3] In `.github/workflows/deploy-api.yml`, wrap the `/health` curl in a short retry loop (e.g., up to ~6 attempts × 10s sleep) to absorb the App Service cold-start window after Zip Deploy, while still failing within the 2-minute SC-002 budget. The exit code of the final attempt determines step success.
- [X] T019 [US3] In `.github/workflows/deploy-api.yml`, ensure the `https://` scheme is hard-coded in the probe URL (never `http://`), so the post-deploy check itself only exercises the encrypted surface (US3 acceptance scenario 3).
- [ ] T020 [US3] (Verification, no file change) Manually run `curl -sS -o /dev/null -w "%{http_code}\n" "http://${APP_SERVICE_NAME}.azurewebsites.net/health"` against the live App Service and confirm it returns `301` (redirect) or `403` (SC-004, US3 acceptance scenario 2). If it returns 200 over plain HTTP, raise a follow-up against feature 001's Bicep (`httpsOnly: true` missing).

**Checkpoint**: All three P1 user stories are implemented. The workflow now: triggers on `main` push → builds → authenticates via OIDC → zip-deploys → verifies HTTPS `/health` → green ✅ on success, red ❌ on any failure.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation, and end-to-end quickstart verification.

- [X] T021 [P] Validate `.github/workflows/deploy-api.yml` YAML syntax locally with `actionlint` (or `yq eval . .github/workflows/deploy-api.yml`) — catches indentation and action-input typos before the first push.
- [X] T022 [P] Cross-check `.github/workflows/deploy-api.yml` against `specs/002-deploy-api-workflow/contracts/workflow-interface.md`: triggers (`push: [main]` + `workflow_dispatch`), permissions block, concurrency group, three secrets, one variable, no forbidden secret names, no `jobs.<id>.outputs`.
- [ ] T023 Run the end-to-end quickstart in `specs/002-deploy-api-workflow/quickstart.md` (Steps 1–5) from a clean push to `main`: confirm SC-001 (run starts <1 min), SC-002 (`/health` returns `{"status":"ok"}` within 2 min of green), SC-006 (total <10 min), SC-007 (forced regression goes red).
- [ ] T024 [P] If any deviation from `spec.md` or `contracts/workflow-interface.md` was discovered during T023, update the spec/plan/contract docs (not just the YAML) so the artifacts stay in sync — then re-run `/speckit.analyze` if available.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1. **BLOCKS all user stories** because the workflow's post-deploy probe (US3) will fail without the `/health` route from T004.
- **Phase 3 (US1)**: Depends on Phase 2. Creates the workflow file skeleton + build/deploy steps.
- **Phase 4 (US2)**: Depends on T006 (file must exist) — adds permissions + OIDC login. Must be merged **before** US1's deploy step (T011) can succeed end-to-end, because `webapps-deploy` needs a logged-in Azure session.
- **Phase 5 (US3)**: Depends on T011 (deploy step exists) — the `/health` probe runs after deploy.
- **Phase 6 (Polish)**: Depends on US1 + US2 + US3 all complete.

### User Story Dependencies (workflow-file reality)

Although the three user stories are independently testable **post hoc** (each maps to distinct acceptance scenarios), they all edit `.github/workflows/deploy-api.yml`, so their tasks interleave in step order:

```text
T006 (skeleton)        ← US1
T013 (permissions)     ← US2   (workflow-level block; insert before jobs.deploy-api.steps)
T007 (checkout)        ← US1
T008 (setup-dotnet)    ← US1
T009 (publish)         ← US1
T010 (zip)             ← US1
T014 (azure/login)     ← US2
T011 (webapps-deploy)  ← US1
T017–T019 (curl /health) ← US3
```

For team execution: a single developer writes the file top-to-bottom following the order above. For PR review, the three stories can be reviewed as one combined PR (the file only makes sense as a whole).

### Within Each User Story

- All US1, US2, and US3 implementation tasks edit the **same file** (`.github/workflows/deploy-api.yml`) → **no `[P]` markers** within those phases.
- Setup tasks (T002, T003) and Polish tasks (T021, T022, T024) touch independent files / external systems → marked `[P]`.

### Parallel Opportunities

- T002 and T003 (Setup verification) — independent, run in parallel.
- T021, T022, T024 (Polish) — independent files/checks, run in parallel.
- The three P1 user stories are **logically** parallel-testable (independent acceptance criteria), but their implementation tasks are **physically** sequential on one YAML file.

---

## Parallel Example: Setup Phase

```bash
# Run independent verifications in parallel:
Task: "Verify src/ai-genius-api/ai-genius-api.csproj targets net9.0"  (T002)
Task: "Confirm AZURE_* secrets and APP_SERVICE_NAME variable exist in repo settings"  (T003)
```

---

## Implementation Strategy

### MVP First (all three P1 stories — they ship together)

Unlike a typical product feature where US1 alone is shippable, this CI/CD feature's MVP **is** the combined US1+US2+US3 — a workflow without OIDC (US2) violates security and a workflow without `/health` verification (US3) violates SC-007. Therefore:

1. Complete Phase 1 (Setup) — verify prerequisites.
2. Complete Phase 2 (Foundational) — ship T004 (`/health` route) as its own commit on `main` first; this is a low-risk, additive code change.
3. Complete Phases 3–5 in a **single PR** that adds `.github/workflows/deploy-api.yml`. The PR's own merge to `main` is the first end-to-end execution of the new workflow.
4. **STOP and VALIDATE**: Confirm SC-001 / SC-002 / SC-006 / SC-007 on the merge commit.
5. Complete Phase 6 (Polish).

### Incremental Delivery (alternative)

If a smaller-step rollout is preferred:

1. Setup + Foundational (T001–T005).
2. Add the workflow with **only** US1 + US2 (no health probe yet) — first green run proves build + OIDC + deploy.
3. Add US3 (health probe + retry + HTTPS verification) in a follow-up commit.
4. Polish.

### Single-Developer Strategy

This feature is sized for **one developer** end-to-end (~1–2 hours): the entire workflow file is < 80 lines of YAML. Parallel team strategy is not applicable.

---

## Notes

- All workflow-implementation tasks (T006–T019) edit one file → no `[P]` and order matters.
- The post-deploy `/health` probe (T017) is the workflow's own end-to-end test; no separate test files are introduced (Tests OPTIONAL — not requested).
- Tasks T005, T016, T020 are **external / verification-only** tasks that don't change repository files — they validate Azure / Bicep configuration owned by feature 001 or by the quickstart.
- Commit after each task or at logical phase boundaries.
- Stop at each Checkpoint to verify the corresponding spec.md acceptance scenarios.
- Avoid: introducing `AZURE_CREDENTIALS`, `AZURE_CLIENT_SECRET`, or any `AZUREAPPSERVICE_PUBLISHPROFILE_*` reference (constitution violation, FR-007); using `http://` in the probe URL (US3 violation); setting `cancel-in-progress: true` (FR-014 violation).
