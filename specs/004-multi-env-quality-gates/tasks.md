---
description: "Task list for 004-multi-env-quality-gates feature"
---

# Tasks: Multi-Environment Bicep Pipeline with Approvals

**Input**: Design documents from `specs/004-multi-env-quality-gates/`
**Feature branch**: `004-multi-env-quality-gates`
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Contract**: [contracts/workflow-contract.md](contracts/workflow-contract.md)

**Note**: The workflow file `.github/workflows/004-multi-env-ci.yml` and all Bicep parameter files already exist. Tasks focus on committing the workflow, wiring GitHub Environments, and configuring branch protection.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup (Verify Existing Artifacts)

**Purpose**: Confirm all pre-existing files are correct before wiring GitHub configuration

- [ ] T001 Review `.github/workflows/004-multi-env-ci.yml` — confirm 7 jobs, correct `needs` chain (`validate → plan-dev → deploy-dev → plan-qa → deploy-qa → plan-prod → deploy-prod`), and correct `environment:` keys (`dev`, `qa`, `prod`)
- [ ] T002 [P] Review `bicep/parameters.dev.json` — confirm `appServicePlanSku: B1`, `staticWebAppSku: Free`, `environment: dev`
- [ ] T003 [P] Review `bicep/parameters.qa.json` — confirm `appServicePlanSku: B1`, `staticWebAppSku: Free`, `environment: qa`
- [ ] T004 [P] Review `bicep/parameters.prod.json` — confirm `appServicePlanSku: B2`, `staticWebAppSku: Standard`, `environment: prod`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Verify GitHub Secrets and Variables exist at repository level before any environment jobs can run

**⚠️ CRITICAL**: No workflow jobs will authenticate to Azure without these in place

- [ ] T005 Verify `AZURE_CREDENTIALS` secret exists in GitHub repo Settings → Secrets and variables → Actions (already used by `001-deploy-infra.yml`)
- [ ] T006 [P] Verify `AZURE_RESOURCE_GROUP` variable exists in GitHub repo Settings → Secrets and variables → Actions → Variables
- [ ] T007 [P] Verify `APP_NAME` variable exists in GitHub repo Settings → Secrets and variables → Actions → Variables

**Checkpoint**: Secrets and variables confirmed — GitHub Environment setup can now begin

---

## Phase 3: User Story 1 — Workflow Committed & Triggering (Priority: P1) 🎯 MVP

**Goal**: The workflow file is tracked in git and triggers correctly on every PR to `main`, executing the full 7-job chain

**Independent Test**: Open any PR targeting `main` → workflow `004 Multi-Env Bicep CI` appears in PR checks → `validate`, `plan-dev`, and `deploy-dev` jobs run automatically (qa/prod gates will pause pending Phase 4 setup)

### Implementation for User Story 1

- [ ] T008 [US1] Commit untracked `.github/workflows/004-multi-env-ci.yml` to the feature branch (`git add .github/workflows/004-multi-env-ci.yml && git commit -m "feat: add 004 multi-env Bicep CI workflow"`)
- [ ] T009 [US1] Push the feature branch and open a draft PR targeting `main` to trigger the workflow for the first time
- [ ] T010 [US1] Confirm the `validate` job (`Bicep Validate`) runs and passes `az deployment group validate` against `bicep/parameters.dev.json`

**Checkpoint**: Workflow is committed, triggers on PR, and validate/plan-dev/deploy-dev complete without error

---

## Phase 4: User Story 2 — GitHub Environment Approval Gates (Priority: P2)

**Goal**: GitHub Environments `dev`, `qa`, and `prod` exist with required-reviewer protection on `qa` and `prod`, so the pipeline pauses for human approval before promoting to each gated environment

**Independent Test**: Re-run (or re-push to) the PR from Phase 3 → `plan-qa` job shows **"Review deployments"** button and pauses → approve → `deploy-qa` runs → `plan-prod` pauses → approve → `deploy-prod` runs

### Implementation for User Story 2

- [ ] T011 [US2] Create `dev` GitHub Environment in **Settings → Environments → New environment** (name: `dev`, no protection rules required)
- [ ] T012 [US2] Create `qa` GitHub Environment in **Settings → Environments → New environment** (name: `qa`)
- [ ] T013 [US2] Add required reviewer protection to `qa`: open `qa` environment → **Environment protection rules** → tick **Required reviewers** → add at least one reviewer → **Save protection rules**
- [ ] T014 [US2] Create `prod` GitHub Environment in **Settings → Environments → New environment** (name: `prod`)
- [ ] T015 [US2] Add required reviewer protection to `prod`: open `prod` environment → **Environment protection rules** → tick **Required reviewers** → add at least one reviewer → **Save protection rules**
- [ ] T016 [US2] (Optional) If using separate Azure resource groups per environment, add environment-level `AZURE_RESOURCE_GROUP` variable override in each of `dev`, `qa`, and `prod` environment settings

**Checkpoint**: All three GitHub Environments exist; `qa` and `prod` have required-reviewer gates; re-running the PR workflow should now pause at `plan-qa`

---

## Phase 5: User Story 3 — Branch Protection & End-to-End Verification (Priority: P3)

**Goal**: The `main` branch requires a PR and the `Bicep Validate` status check to pass before merging, and the full 7-job pipeline completes successfully end-to-end with approvals

**Independent Test**: Attempt to merge a PR without the `Bicep Validate` check passing → merge is blocked. With checks passing and approvals granted → full pipeline succeeds and merge is allowed

### Implementation for User Story 3

- [ ] T017 [US3] Configure branch protection on `main` in **Settings → Branches → Add rule**: branch pattern `main`, enable **Require a pull request before merging** (1 required approval), enable **Require status checks to pass → add `Bicep Validate`**, enable **Do not allow bypassing the above settings** → **Save changes**
- [ ] T018 [US3] Verify end-to-end on the open PR: confirm `validate → plan-dev → deploy-dev` complete automatically, `plan-qa` pauses for approval
- [ ] T019 [US3] Approve the `qa` environment gate via **Review deployments** → confirm `plan-qa → deploy-qa` complete, `plan-prod` pauses for approval
- [ ] T020 [US3] Approve the `prod` environment gate via **Review deployments** → confirm `plan-prod → deploy-prod` complete successfully
- [ ] T021 [US3] Confirm the `Bicep Validate` status check appears in the PR and is required before merge per branch protection rule

**Checkpoint**: Full pipeline verified end-to-end — validate → dev → qa (gated) → prod (gated) — all jobs green

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and cleanup

- [ ] T022 [P] Update `AGENTS.md` workflow table to include `004-multi-env-ci.yml` — trigger: `pull_request` to `main`; purpose: Multi-environment Bicep deployment with approval gates
- [ ] T023 Verify `quickstart.md` steps remain accurate against the actual GitHub Settings UI (environment names, protection rule labels)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — review all files in parallel
- **Foundational (Phase 2)**: Depends on Phase 1 review passing — BLOCKS workflow execution
- **US1 (Phase 3)**: Depends on Foundational — commit workflow and open PR
- **US2 (Phase 4)**: Depends on US1 — GitHub Environments must exist for the workflow's `environment:` keys to resolve
- **US3 (Phase 5)**: Depends on US2 — branch protection references the `Bicep Validate` check name, which only appears after the workflow runs
- **Polish (Phase 6)**: Depends on US3 completion

### User Story Dependencies

- **US1 (P1)**: Unblock immediately after Foundational — commit and trigger
- **US2 (P2)**: After US1 PR is open (so you can see the jobs needing environments)
- **US3 (P3)**: After US2 environments have required-reviewer gates in place

### Parallel Opportunities

- T002, T003, T004 (parameter file reviews) run in parallel
- T006, T007 (variable checks) run in parallel
- T011–T015 (environment creation) are independent of each other and can be done in any order
- T022 (AGENTS.md update) can run in parallel with any verification task

---

## Parallel Example: User Story 2 (GitHub Environments)

```text
# All three environments can be created in any order:
Task T011: Create 'dev' environment (no gate)
Task T012: Create 'qa' environment
Task T014: Create 'prod' environment

# Then add protection rules:
Task T013: Add required reviewers to 'qa'
Task T015: Add required reviewers to 'prod'
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Review existing artifacts
2. Complete Phase 2: Confirm secrets/variables exist
3. Complete Phase 3: Commit workflow file, open PR, verify validate job passes
4. **STOP and VALIDATE**: Confirm `004 Multi-Env Bicep CI` appears in PR checks and `Bicep Validate` passes

### Incremental Delivery

1. Setup + Foundational → artifacts verified, secrets confirmed
2. US1 → workflow committed, PR opens, dev jobs run automatically (**MVP!**)
3. US2 → qa and prod approval gates active, pipeline pauses correctly
4. US3 → branch protection enforced, full end-to-end verified and mergeable
5. Polish → documentation updated

---

## Notes

- The workflow file `004-multi-env-ci.yml` already exists and is correct — **do not rewrite it**, only commit it
- All Bicep parameter files exist and are correct — **no changes needed**
- GitHub Environment and branch protection setup is manual (Settings UI) — cannot be done from workflow YAML per NF-2 and NF-3
- The `environment:` keys in the workflow YAML (`dev`, `qa`, `prod`) must exactly match the names created in GitHub Settings
- Approval gates block at `plan-qa` and `plan-prod` (the first job per environment with required reviewers)
- `AZURE_CREDENTIALS` must be a service principal JSON with Contributor rights on the target resource group(s)
