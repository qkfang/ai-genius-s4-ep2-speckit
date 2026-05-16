---
description: "Task list for feature 002-cicd-quality-gates implementation"
---

# Tasks: CI/CD Quality Gates and Deployment Approvals

> **Implementation status (this PR)**: The committed-artifact tasks have been
> completed — `T001` (workflows dir confirmed), `T002`/`T003` (local frontend +
> API builds verified green), `T004` (`deploy-infra.yml` already declares
> `environment:` on the `infra` job), `T006` (`.github/workflows/ci.yml` created
> per contract), `T026` (`docs/ci-cd-quality-gates.md` added), `T027` (regression
> note added to `AGENTS.md`). All remaining tasks (`T005`, `T007`–`T025`,
> `T028`–`T029`) require **GitHub repository Settings** changes (Branches /
> Environments) or live PR/deployment verification, which cannot be performed
> from a workflow file and must be completed by a repo admin per the
> `specs/002-cicd-quality-gates/contracts/` documents. They are intentionally
> left unchecked here.

**Input**: Design documents from `/specs/002-cicd-quality-gates/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (ci-workflow-interface.md, branch-protection-rule.md, environment-protection-rules.md), quickstart.md

**Tests**: This feature does not introduce application code or new test suites. CI runs the existing test commands (`npm test --if-present`, `dotnet test`) but no new test tasks are generated. End-to-end verification of the gates is captured as explicit verification tasks (per quickstart §5).

**Organization**: Tasks are grouped by user story so each story can be implemented and verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files / different Settings panes, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- All file paths are repository-relative from the repo root

## Path Conventions

This is a **CI/CD pipeline + repository-configuration** feature (plan.md §Project Structure). The only committed artifact is `.github/workflows/ci.yml`. All other deliverables live in **GitHub repository Settings** (Branches and Environments) per spec Clarification Q1; those tasks describe Settings changes rather than file edits.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the directory and scaffolding needed by the single committed artifact.

- [X] T001 Ensure the workflows directory exists at `.github/workflows/` in the repo root (it already exists alongside `deploy-infra.yml`); confirm by listing the directory.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Confirm prerequisites that ALL user stories depend on. These are inspection / verification tasks; they unblock all subsequent story work.

**⚠️ CRITICAL**: User-story work cannot begin until this phase is complete.

- [X] T002 [P] Verify the frontend builds locally so CI parity is established: run `npm ci && npm run build` in `src/ai-genius-web/`; record success/failure in the PR description.
- [X] T003 [P] Verify the API builds locally: run `dotnet build src/ai-genius-api/ai-genius-api.csproj --configuration Release`; record success/failure in the PR description.
- [X] T004 [P] Verify the existing deployment workflow already opts into environment protection: inspect `.github/workflows/deploy-infra.yml` and confirm the `infra` job declares `environment: ${{ github.event.inputs.environment || 'dev' }}` (satisfies FR-019a; no edit required — confirmation only).
- [ ] T005 Confirm admin access to repository Settings → Branches and Settings → Environments for `qkfang/ai-genius-s4-ep2-speckit` (required for all US1/US2/US3 Settings tasks); if access is missing, escalate before continuing.

**Checkpoint**: Foundation verified — user story implementation can now begin.

---

## Phase 3: User Story 1 - Catch defects before merge with PR-gated CI (Priority: P1) 🎯 MVP

**Goal**: Every pull request targeting `main` automatically builds the frontend and API, runs their test suites, and cannot be merged until CI passes **and** at least one approving review is recorded. Direct pushes to `main` are rejected.

**Independent Test** (per spec US1): (a) open a PR with a deliberately failing build/test and confirm the merge button is blocked with reason "Required statuses must pass"; (b) open a PR with passing CI but no review and confirm the merge button is blocked with reason "At least 1 approving review is required"; (c) open a PR with passing CI and one approving review and confirm it can be merged; (d) attempt `git push origin HEAD:main` directly and confirm the push is rejected.

### Implementation: CI workflow file

- [X] T006 [US1] Create `.github/workflows/ci.yml` exactly per `specs/002-cicd-quality-gates/contracts/ci-workflow-interface.md` (Trigger + Job + Steps blocks). Required invariants: workflow `on: pull_request: branches: [main]`; single job whose `name:` is the literal lowercase string `ci` running on `ubuntu-latest` with `timeout-minutes: 15`; steps in the exact order checkout → setup-node@v4 (Node 20, npm cache keyed on `src/ai-genius-web/package-lock.json`) → `npm ci` (working-directory `src/ai-genius-web`) → `npm run build` (FR-003) → `npm test --if-present` (FR-005) → setup-dotnet@v4 (`9.0.x`) → `dotnet build src/ai-genius-api/ai-genius-api.csproj --configuration Release` (FR-004) → `dotnet test ai-genius-s4-ep2-speckit.sln --configuration Release --no-build` (FR-006). No secrets referenced, no third-party Actions (Constitution IV). Satisfies FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008.

### Validation: prove the `ci` check name is published before configuring branch protection

- [ ] T007 [US1] Open a draft pull request from `002-quality-gates-and` to `main` containing the new `ci.yml` so the GitHub Checks API begins reporting a status check named `ci`. Confirm the check appears on the PR's Checks tab and that the run completes (success or failure) within the 15-minute timeout (FR-008, contract invariant C5, observable output in `contracts/ci-workflow-interface.md`). This must precede T008 because branch protection's "Required status checks" list can only bind to a check name GitHub has seen before.

### Configuration: branch protection on `main` (GitHub Settings — no committed YAML)

- [ ] T008 [US1] In **Settings → Branches → Branch protection rules**, create or edit the rule for `main` to match every row in `specs/002-cicd-quality-gates/contracts/branch-protection-rule.md`: branch name pattern `main`; ✅ Require a pull request before merging with **Required approvals = 1** (FR-011); ✅ Dismiss stale pull request approvals when new commits are pushed (Edge Case 2); ✅ Require approval of the most recent reviewable push; ✅ Require status checks to pass before merging with `ci` added to the **Required status checks** list — exact lowercase string match to the job name from T006 (FR-007, FR-010, contract invariant B1); ✅ Do not allow bypassing the above settings (FR-012, B2); ❌ Allow force pushes; ❌ Allow deletions. Satisfies FR-009, FR-010, FR-011, FR-012.

### Verification: US1 acceptance scenarios end-to-end (per quickstart §5.1)

- [ ] T009 [P] [US1] Verify US1 Scenario 2: push a commit to a test branch that deliberately breaks the frontend build (or fails an API test), open a PR to `main`, and confirm the `ci` check turns red and the merge button is disabled with reason "Required statuses must pass before merging — `ci` failing". Revert the breaking commit afterwards.
- [ ] T010 [P] [US1] Verify US1 Scenario 3: open a PR to `main` with passing CI and **no** approving review, and confirm the merge button is disabled with reason "At least 1 approving review is required".
- [ ] T011 [P] [US1] Verify US1 Scenario 4: with the same PR from T010, record an approving review from a second contributor and confirm the merge button becomes enabled and the merge into `main` succeeds (records evidence for SC-001).
- [ ] T012 [P] [US1] Verify US1 Scenario 5 / SC-002: attempt `git push origin HEAD:main` directly from a local clone and confirm the push is rejected with `protected branch hook declined`. Capture the rejection message in the PR description.

**Checkpoint**: At end of Phase 3, MVP is complete — `main` is protected, CI gates every PR, and reviews are required. The feature could ship here if Phase 4 work is deferred.

---

## Phase 4: User Story 2 - Tiered deployment approvals across dev/qa/prod (Priority: P1)

**Goal**: Deployments to `dev` proceed automatically; deployments to `qa` require one approving reviewer; deployments to `prod` require two distinct approving reviewers (no self-approval) followed by a 5-minute wait timer during which an authorized user can cancel.

**Independent Test** (per spec US2): trigger a deployment workflow run for each environment from a known-good build and confirm — `dev` runs without prompts; `qa` pauses for one approver and proceeds only after approval; `prod` pauses for two distinct approvers (self-approval blocked), then enforces a 5-minute wait window that can be cancelled before any deployment step runs.

### Configuration: GitHub Environments (Settings — no committed YAML)

- [ ] T013 [P] [US2] In **Settings → Environments**, create or edit the environment named `dev` per the `dev` table in `specs/002-cicd-quality-gates/contracts/environment-protection-rules.md`: zero required reviewers, zero wait timer, deployment branches policy = `Selected branches: main` (recommended). Satisfies FR-013, contract invariant P2.
- [ ] T014 [P] [US2] In **Settings → Environments**, create or edit the environment named `qa` per the `qa` table in `specs/002-cicd-quality-gates/contracts/environment-protection-rules.md`: **Required reviewers = 1** drawn from a defined user/team reviewer list, wait timer = 0, deployment branches = `Selected branches: main` (recommended), Prevent self-review = recommended ✅. Satisfies FR-014, contract invariant P3.
- [ ] T015 [P] [US2] In **Settings → Environments**, create or edit the environment named `prod` per the `prod` table in `specs/002-cicd-quality-gates/contracts/environment-protection-rules.md`: **Required reviewers = 2** distinct reviewers from a defined user/team reviewer list (FR-015); **Prevent self-review = ✅ enabled** (spec Assumption + research §R7); **Wait timer = 5 minutes** (FR-016); deployment branches = `Selected branches: main`; Administrators can bypass protection rules = ❌ disabled. Satisfies FR-015, FR-016, contract invariant P4.
- [ ] T016 [US2] Populate the reviewer lists for `qa` (T014) and `prod` (T015) with the operational reviewer roster agreed by the team. The `prod` list MUST contain enough reviewers that a single absence does not block releases (Edge Case "Reviewer is unavailable"); ensure no overlap between the user triggering deployments and the prod reviewer list creates a single-point-of-approval situation.

### Verification: US2 acceptance scenarios end-to-end (per quickstart §5.2)

- [ ] T017 [P] [US2] Verify US2 Scenario 1 / FR-013: trigger `.github/workflows/deploy-infra.yml` with `environment: dev` (workflow_dispatch input) and confirm the `infra` job runs immediately without any approval prompt.
- [ ] T018 [P] [US2] Verify US2 Scenarios 2–3 / FR-014: trigger the workflow with `environment: qa`, confirm the job pauses in "Waiting for review", have one listed approver approve, and confirm the job then proceeds (SC-003 evidence).
- [ ] T019 [US2] Verify US2 Scenario 4 / FR-015: trigger the workflow with `environment: prod` and confirm the job pauses awaiting **two distinct** approvers and that the triggering user is rejected from self-approving (records that "Prevent self-review" is honoured).
- [ ] T020 [US2] Verify US2 Scenarios 5–6 / FR-016, FR-019, SC-007: after both `prod` approvals are recorded in T019, confirm the run displays a 5-minute wait state; in one drill, cancel the run during the wait and confirm no deployment step executed (production target unchanged); in a second drill let the timer elapse and confirm deployment steps then run.
- [ ] T021 [P] [US2] Verify US2 Scenario 7 / FR-017: promote the same release candidate through `dev` → `qa` → `prod` and confirm that the `qa` approval did NOT satisfy the `prod` gate (`prod` still required its own 2 approvals + 5-minute wait).
- [ ] T022 [P] [US2] Verify FR-018: re-run a previously successful `prod` deployment and confirm approvals + 5-minute wait timer are requested again (stale approvals are NOT reused).

**Checkpoint**: At end of Phase 4, all P1 stories deliver — both pre-merge quality and post-merge deployment risk are gated.

---

## Phase 5: User Story 3 - Visible, auditable enforcement (Priority: P2)

**Goal**: Every protection rule above is configured in the repository (not just by convention) and is inspectable; approver identities and timestamps are recoverable from workflow run history.

**Independent Test** (per spec US3): inspect Settings → Branches → `main` and Settings → Environments → `dev`/`qa`/`prod` and confirm each row from the contracts matches the spec; open a past `prod` workflow run and confirm approver identities + timestamps are visible.

- [ ] T023 [P] [US3] Audit the `main` branch protection rule in **Settings → Branches** against every row in `specs/002-cicd-quality-gates/contracts/branch-protection-rule.md`. Capture a screenshot or a `gh api repos/qkfang/ai-genius-s4-ep2-speckit/branches/main/protection` payload and attach it to the PR. Confirm contract invariants B1–B5 (especially B1: the required-check list contains the literal string `ci`). Maps to US3 Scenario 1.
- [ ] T024 [P] [US3] Audit each environment (`dev`, `qa`, `prod`) in **Settings → Environments** against `specs/002-cicd-quality-gates/contracts/environment-protection-rules.md`. For `prod`, explicitly confirm required reviewers ≥ 2, wait timer = 5 min, prevent self-review = enabled, admin bypass = disabled. Attach screenshots or `gh api /repos/qkfang/ai-genius-s4-ep2-speckit/environments/{env}` payloads to the PR. Maps to US3 Scenario 2 and contract invariants P1–P4.
- [ ] T025 [P] [US3] Open a previously completed `qa` or `prod` deployment run in the GitHub Actions UI and confirm the **Deployments** tab shows each approver's identity (`reviewer.login`) and the timestamp of their approval, plus the wait-timer start/end and deployment step start (FR-020 / SC-005 evidence). Document the path-to-information ("within 2 minutes") in the PR description.

**Checkpoint**: At end of Phase 5, all functional requirements (FR-001..FR-020 + FR-019a) are verifiably enforced and auditable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, regression guards, and success-criteria sampling. These tasks are not required to ship the feature but make it durable.

- [X] T026 [P] Add a short README pointer at `docs/ci-cd-quality-gates.md` (NEW) summarising: the role of `.github/workflows/ci.yml`, the branch protection contract for `main`, and the three environment contracts. Link to `specs/002-cicd-quality-gates/contracts/` for the authoritative details. Goal: future contributors discover the gates without reading the full spec.
- [X] T027 [P] Add a regression note to `AGENTS.md` (existing) warning that the `ci` job name in `.github/workflows/ci.yml` is a load-bearing string referenced by the `main` branch protection rule (contract invariants C1 + B1 + B5) and must not be renamed without simultaneously updating Settings → Branches.
- [ ] T028 [P] Sample SC-001 / SC-002 / SC-003 / SC-004 after the feature has been live for a representative period (per quickstart §6): pick 10 recent merges to `main` and confirm each has a successful `ci` run + ≥1 approval; confirm the repo audit log shows 0 direct pushes to `main`; sample recent `qa` and `prod` deployments for reviewer counts and (for prod) ≥5 min elapsed between final approval and deployment start. Record findings in a follow-up comment on the PR.
- [ ] T029 Final review pass: re-read `specs/002-cicd-quality-gates/spec.md` §Requirements and confirm every FR-001..FR-020 plus FR-019a is satisfied by one of T006–T025 above; resolve any gap before requesting review.

---

## Dependencies

```text
Phase 1 (Setup: T001)
   │
   ▼
Phase 2 (Foundational: T002, T003, T004, T005 — T002/T003/T004 parallel)
   │
   ├──────────────────────────────┐
   ▼                              ▼
Phase 3 — US1                 Phase 4 — US2
T006 → T007 → T008            T013 ∥ T014 ∥ T015 → T016
        │                            │
        ▼                            ▼
   T009 ∥ T010 ∥ T011 ∥ T012     T017 ∥ T018 → T019 → T020 ; T021 ∥ T022
   (US1 verified)                (US2 verified)
   │                              │
   └──────────────┬───────────────┘
                  ▼
            Phase 5 — US3
            T023 ∥ T024 ∥ T025
                  │
                  ▼
            Phase 6 — Polish
            T026 ∥ T027 ∥ T028 → T029
```

**Hard ordering rules**:

- **T006 → T007 → T008**: `ci.yml` must exist and must have executed at least once before GitHub will let you add `ci` to the required-status-checks list in branch protection (the check name has to be known to GitHub first). This is the single most important sequencing rule in the feature.
- **T013, T014, T015 → T016**: environments must exist before their reviewer lists can be populated.
- **T015 → T019 → T020**: the `prod` environment must be fully configured before the two-approver + 5-min-wait drills can be performed.
- **US1 and US2 are mutually independent after Phase 2**: a team with capacity can configure environments (T013–T016) in parallel with the CI workflow tasks (T006–T008). The Phase-3 verification tasks (T009–T012) and Phase-4 verification tasks (T017–T022) are also independent of each other.
- **US3 (T023–T025) depends on US1 and US2 being configured** because it audits their configuration.

## Parallel Execution Examples

**Within Phase 2 (Foundational)** — three local-validation checks run in parallel before any Settings work:

```text
T002 [P]  npm ci && npm run build  in src/ai-genius-web/
T003 [P]  dotnet build src/ai-genius-api/ai-genius-api.csproj -c Release
T004 [P]  inspect .github/workflows/deploy-infra.yml for environment: key
```

**Within Phase 4 (US2 configuration)** — three independent Settings → Environments panes, one per environment:

```text
T013 [P]  configure environment "dev"   (Settings → Environments → dev)
T014 [P]  configure environment "qa"    (Settings → Environments → qa)
T015 [P]  configure environment "prod"  (Settings → Environments → prod)
```

**Within Phase 3 (US1 verification)** — four independent PR-level experiments after T008:

```text
T009 [P]  failing-build PR → expect red ci, merge blocked
T010 [P]  passing PR, no review → expect merge blocked
T011 [P]  passing PR + 1 review → expect merge succeeds
T012 [P]  direct push to main → expect rejection
```

**Within Phase 5 (US3 audit)** — three independent inspections:

```text
T023 [P]  branch protection rule audit (Settings → Branches → main)
T024 [P]  environments audit (Settings → Environments → dev/qa/prod)
T025 [P]  past-run audit (Actions → run → Deployments tab)
```

**Within Phase 6 (Polish)** — independent docs/sampling tasks:

```text
T026 [P]  add docs/ci-cd-quality-gates.md
T027 [P]  add regression note to AGENTS.md
T028 [P]  sample SC-001..SC-004 post-rollout
```

## Implementation Strategy

**MVP scope = User Story 1 only (Phases 1–3, tasks T001–T012)**. Shipping just US1 delivers the foundational quality gate: nothing reaches `main` without a green build and a review. This is the highest-leverage portion of the feature and is independently valuable even if US2/US3 are deferred.

**Incremental delivery**:

1. **MVP** — finish T001–T012; `main` is now protected end-to-end. SC-001 and SC-002 become measurable.
2. **Increment 2 (US2)** — finish T013–T022; deployments now have tiered human oversight. SC-003, SC-004, SC-007 become measurable.
3. **Increment 3 (US3)** — finish T023–T025; the configuration is auditable. SC-005 becomes measurable.
4. **Hardening** — finish T026–T029; the gates are documented, regression-guarded, and sampled against success criteria.

**Why no test-task phase**: this feature introduces no application code (plan.md §Project Structure: "0 new application code changes"). The only committed file is `ci.yml`, which itself runs the existing test commands. Verification of the feature is configuration verification, captured as explicit US1/US2/US3 verification tasks above per spec §Independent Test for each story.

## Task Summary

- **Total tasks**: 29 (T001–T029)
- **By phase**: Setup 1 · Foundational 4 · US1 7 · US2 10 · US3 3 · Polish 4
- **By story**: US1 = 7 tasks (T006–T012); US2 = 10 tasks (T013–T022); US3 = 3 tasks (T023–T025); Setup/Foundational/Polish = 9 tasks
- **Parallel opportunities**: 18 tasks marked [P] across Phases 2, 3, 4, 5, 6
- **Independent test criteria**: US1 verified by T009–T012; US2 verified by T017–T022; US3 verified by T023–T025 — each maps 1:1 to the spec's "Independent Test" section for that story
- **Suggested MVP**: User Story 1 only (T001–T012) — delivers SC-001 and SC-002 in isolation
- **Committed artifacts produced**: exactly one file — `.github/workflows/ci.yml` (T006), plus optional docs in Phase 6 (T026, T027)
- **GitHub Settings artifacts produced**: 1 branch protection rule on `main` (T008) + 3 environments `dev`/`qa`/`prod` (T013–T016)

**Format validation**: All 29 tasks above use the required checklist format `- [ ] TNNN [P?] [Story?] Description with file path or Settings path`. Setup, Foundational, and Polish tasks intentionally omit the `[Story]` label per the format rules; US1/US2/US3 tasks all carry the correct story label.
