# Tasks: Frontend Web App Deployment via GitHub Actions

**Input**: Design documents from `/specs/002-deploy-web/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/workflow-interface.md ✅, quickstart.md ✅

**Organization**: Tasks build a single workflow file `.github/workflows/002-deploy-web.yml` incrementally, grouped by user story so each story's capability can be verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to ([US1], [US2], [US3])
- Exact file paths included in all task descriptions

---

## Phase 1: Setup

**Purpose**: Create the workflow file skeleton with the display name and basic workflow-level YAML structure.

- [X] T001 Create `.github/workflows/002-deploy-web.yml` with `name: 002 Deploy Web to Azure` and a placeholder `on:` and `jobs:` block

**Checkpoint**: File `.github/workflows/002-deploy-web.yml` exists and is valid YAML.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the shared job definition and reusable setup steps that every user story depends on. These must be complete before any user story's specific steps are wired in.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Add `jobs.deploy` with `name: Build and Deploy Frontend`, `runs-on: ubuntu-latest`, and `environment: ${{ github.event.inputs.environment || 'dev' }}` in `.github/workflows/002-deploy-web.yml`
- [X] T003 Add `actions/checkout@v4` step inside `jobs.deploy.steps` in `.github/workflows/002-deploy-web.yml`
- [X] T004 Add `actions/setup-node@v4` step with `node-version: '20'`, `cache: 'npm'`, and `cache-dependency-path: src/ai-genius-web/package-lock.json` in `.github/workflows/002-deploy-web.yml`

**Checkpoint**: Foundation ready — job scaffolding and shared steps are in place. User story steps can now be added.

---

## Phase 3: User Story 1 — Automated Frontend Deployment on Code Push (Priority: P1) 🎯 MVP

**Goal**: Every push to `main` automatically installs dependencies, builds the React + Vite application with the correct `VITE_API_URL`, and deploys the compiled `dist/` to Azure Static Web Apps.

**Independent Test**: Push a commit to `main`. Confirm the workflow run appears in GitHub Actions, completes successfully, and the updated frontend is served at the Azure Static Web Apps URL.

### Implementation for User Story 1

- [X] T005 [US1] Add `on.push.branches: [main]` trigger in `.github/workflows/002-deploy-web.yml`
- [X] T006 [US1] Add `npm ci` step scoped to `src/ai-genius-web` (`working-directory: src/ai-genius-web`) in `.github/workflows/002-deploy-web.yml`
- [X] T007 [US1] Add `npm run build` step with `env: VITE_API_URL: ${{ vars.VITE_API_URL }}` and `working-directory: src/ai-genius-web` in `.github/workflows/002-deploy-web.yml`
- [X] T008 [US1] Add `azure/login@v1` step with `creds: ${{ secrets.AZURE_CREDENTIALS }}` in `.github/workflows/002-deploy-web.yml`
- [X] T009 [US1] Add `Azure/static-web-apps-deploy@v1` step with `action: upload`, `app_location: src/ai-genius-web/dist`, `output_location: ""`, `skip_app_build: true`, `repo_token: ${{ secrets.GITHUB_TOKEN }}`, and `azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}` in `.github/workflows/002-deploy-web.yml`

**Checkpoint**: User Story 1 fully functional — a push to `main` triggers the complete install → build → login → deploy pipeline.

---

## Phase 4: User Story 2 — Manual Frontend Deployment via Workflow Dispatch (Priority: P2)

**Goal**: An operator can trigger the pipeline on demand from the GitHub Actions UI, choosing `dev`, `qa`, or `prod` as the target environment, without pushing a new commit.

**Independent Test**: Click "Run workflow" in GitHub Actions, select an environment, and confirm the workflow runs and deploys to the chosen environment with the correct `VITE_API_URL` baked in.

### Implementation for User Story 2

- [X] T010 [US2] Add `on.workflow_dispatch.inputs.environment` with `description: "Target environment"`, `required: true`, `default: "dev"`, `type: choice`, and `options: [dev, qa, prod]` in `.github/workflows/002-deploy-web.yml`

**Checkpoint**: User Story 2 fully functional — "Run workflow" button in GitHub Actions UI accepts an environment choice and runs the full pipeline with environment-scoped variables.

---

## Phase 5: User Story 3 — Concurrent Run Management (Priority: P3)

**Goal**: When two workflow runs are triggered in rapid succession on the same branch, the earlier in-progress run is cancelled automatically, ensuring only the most recent commit's artifacts are deployed.

**Independent Test**: Push two commits to `main` quickly in succession. Confirm the first workflow run is cancelled and the second completes, with the live site reflecting the most recent commit.

### Implementation for User Story 3

- [X] T011 [US3] Add top-level `concurrency` block with `group: ${{ github.workflow }}-${{ github.ref }}` and `cancel-in-progress: true` in `.github/workflows/002-deploy-web.yml`

**Checkpoint**: User Story 3 fully functional — concurrent runs on the same branch are automatically cancelled in favour of the newer run.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and completeness checks across the whole workflow.

- [X] T012 [P] Verify the complete `.github/workflows/002-deploy-web.yml` YAML is syntactically valid, all steps are in the correct order (checkout → setup-node → npm ci → npm run build → azure/login → swa-deploy), and all secret/variable references match the names in the contracts
- [X] T013 [P] Confirm `on:` block has both `push` (branches: [main]) and `workflow_dispatch` triggers, and that the `environment:` job key resolves to `${{ github.event.inputs.environment || 'dev' }}` covering both trigger paths

**Checkpoint**: Workflow file is complete, validated, and ready for the first real run.

---

## Dependencies

```
T001 → T002 → T003 → T004 → T005 (US1)
                           → T006 (US1) → T007 (US1) → T008 (US1) → T009 (US1)
                           → T010 (US2)  [parallel with US1 steps]
                           → T011 (US3)  [parallel with US1/US2 steps]
T009, T010, T011 → T012, T013
```

**Key parallelism**: Once T004 (foundational setup) is complete, T005–T009 (US1), T010 (US2), and T011 (US3) all target `.github/workflows/002-deploy-web.yml` sections that can be drafted independently and merged.

---

## Parallel Execution Examples

### Per User Story

| Story | Tasks | Can Run in Parallel With |
|-------|-------|--------------------------|
| US1 | T005–T009 | US2 (T010), US3 (T011) |
| US2 | T010 | US1 (T005–T009), US3 (T011) |
| US3 | T011 | US1 (T005–T009), US2 (T010) |
| Polish | T012, T013 | Each other (both read-only) |

---

## Implementation Strategy

**MVP Scope (User Story 1 only)**:
Complete T001–T009. This gives a fully working automated push-to-deploy pipeline for the `dev` environment. Stories 2 and 3 are additive and safe to implement after the MVP is validated.

**Incremental delivery order**:
1. T001–T004 → validate YAML skeleton builds  
2. T005–T009 → push to `main` and confirm live deploy (MVP)  
3. T010 → add `workflow_dispatch` and confirm manual trigger  
4. T011 → add concurrency and confirm cancellation behaviour  
5. T012–T013 → final polish pass

**Total tasks**: 13  
**Tasks per user story**: US1 → 5, US2 → 1, US3 → 1, Foundational → 3, Setup → 1, Polish → 2
