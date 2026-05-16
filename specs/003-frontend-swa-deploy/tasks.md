# Tasks: Frontend Static Web App Deployment

**Input**: Design documents from `/specs/003-frontend-swa-deploy/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/workflow-interface.md ✅, quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify all prerequisites are in place before creating the workflow file.

- [x] T001 Verify prerequisites — confirm `src/ai-genius-web/.env.example` (with `VITE_API_URL=` line), `src/ai-genius-web/package.json` (with `build` script), and `src/ai-genius-web/package-lock.json` all exist in the repository

**Checkpoint**: Prerequisites confirmed — workflow creation can begin

---

## Phase 2: User Story 1 - Automated Frontend Deployment on Code Push (Priority: P1) 🎯 MVP

**Goal**: Every push to `main` automatically builds the React + Vite app and deploys the compiled `dist/` to Azure Static Web Apps.

**Independent Test**: Push a commit to `main`, observe the `002 Deploy Web to Azure` workflow run to completion in GitHub Actions, then verify the updated site is accessible at the Azure Static Web Apps URL.

### Implementation for User Story 1

- [x] T002 [US1] Create `.github/workflows/002-deploy-web.yml` with: `name: 002 Deploy Web to Azure`, `push` trigger on `main`, `concurrency` group (`${{ github.workflow }}-${{ github.ref }}`, `cancel-in-progress: true`), top-level `env.ENVIRONMENT`, and the `deploy` job (`runs-on: ubuntu-latest`, `environment: ${{ github.event.inputs.environment || 'dev' }}`) containing all 7 steps — Checkout (`actions/checkout@v4`), Node.js setup (`actions/setup-node@v4`, node 20, npm cache), `npm ci` (working-directory: `src/ai-genius-web`), Prepare `.env` (`cp .env.example .env` + `sed -i` patch for `VITE_API_URL`), `npm run build`, Azure Login (`azure/login@v1` with `secrets.AZURE_CREDENTIALS`), and SWA deploy (`Azure/static-web-apps-deploy@v1` with `action: upload`, `app_location: src/ai-genius-web/dist`, `output_location: ""`, `skip_app_build: true`, `repo_token: ${{ secrets.GITHUB_TOKEN }}`, `azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}`)

**Checkpoint**: User Story 1 is fully functional — push to `main` triggers automated build and deploy

---

## Phase 3: User Story 2 - Manual Deployment to a Specific Environment (Priority: P2)

**Goal**: A developer can trigger the workflow manually from the GitHub Actions UI and select a target environment (`dev`, `qa`, `prod`).

**Independent Test**: Use the "Run workflow" button in GitHub Actions, select `dev` (or `qa`/`prod`), confirm the workflow runs and the site updates without a code push.

### Implementation for User Story 2

- [x] T003 [US2] Add `workflow_dispatch` trigger block to `.github/workflows/002-deploy-web.yml` under the `on:` key with an `environment` input (`description: "Target environment"`, `required: true`, `default: "dev"`, `type: choice`, `options: [dev, qa, prod]`)

**Checkpoint**: User Stories 1 and 2 both work — automated push deploys and manual environment-targeted deploys are both functional

---

## Phase 4: User Story 3 - Concurrent Run Cancellation (Priority: P3)

**Goal**: When two pushes land on `main` in quick succession, the first in-progress run is cancelled and only the newest run proceeds to deployment.

**Independent Test**: Push two commits to `main` rapidly; observe in the GitHub Actions UI that the first run is cancelled when the second starts.

### Implementation for User Story 3

- [x] T004 [US3] Verify the `concurrency` block in `.github/workflows/002-deploy-web.yml` is correctly placed at the workflow level (not inside a job) with `group: ${{ github.workflow }}-${{ github.ref }}` and `cancel-in-progress: true`, matching the pattern from `.github/workflows/001-deploy-infra.yml` (if it exists)

**Checkpoint**: All three user stories are independently functional

---

## Phase 5: Polish & Validation

**Purpose**: Final review against design contracts and quickstart verification.

- [x] T005 [P] Validate the complete `.github/workflows/002-deploy-web.yml` YAML against the reference workflow in `specs/003-frontend-swa-deploy/quickstart.md` — check all 7 steps, action versions (`actions/checkout@v4`, `actions/setup-node@v4`, `azure/login@v1`, `Azure/static-web-apps-deploy@v1`), secret references, variable references, and the failure contract from `specs/003-frontend-swa-deploy/contracts/workflow-interface.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **US1 (Phase 2)**: Depends on Phase 1 — creates the complete workflow file; **delivers MVP**
- **US2 (Phase 3)**: Depends on Phase 2 — adds `workflow_dispatch` to the existing file
- **US3 (Phase 4)**: Depends on Phase 2 — verifies concurrency block already written in T002
- **Polish (Phase 5)**: Depends on Phases 2–4

### User Story Dependencies

- **US1 (P1)**: Starts after Setup — no dependency on US2 or US3
- **US2 (P2)**: Starts after US1 — adds `workflow_dispatch` to the file created in T002
- **US3 (P3)**: Starts after US1 — verifies the concurrency block already included in T002

### Parallel Opportunities

- T003 (US2) and T004 (US3) can run in parallel after T002 completes — they touch different sections of the same file, so sequence them if a single implementer; parallelise only with separate reviewers

---

## Parallel Example: User Story 2 & 3 (after US1 complete)

```
After T002 completes:
├── T003 [US2] Add workflow_dispatch trigger
└── T004 [US3] Verify concurrency block
         ↓
     T005 [Polish] Validate complete YAML
```

---

## Implementation Strategy

### MVP Scope (recommended first delivery)

Complete **Phase 1 + Phase 2 only** (T001 + T002):

- T001: Verify prerequisites
- T002: Create the full workflow file (includes all 7 steps + push trigger + concurrency + env injection)

This delivers the complete automated deploy pipeline. US2 and US3 are additive improvements.

### Full Delivery

Complete all phases T001–T005 for all three user stories and final validation.

---

## Format Validation

All tasks follow the required checklist format:
- ✅ All tasks start with `- [ ]`
- ✅ All tasks have a Task ID (T001–T005) in execution order
- ✅ `[P]` marker present only on parallelizable tasks (T005)
- ✅ `[US1]`, `[US2]`, `[US3]` labels present on user story phase tasks
- ✅ Setup and Polish phase tasks have no story label
- ✅ All tasks include exact file paths
