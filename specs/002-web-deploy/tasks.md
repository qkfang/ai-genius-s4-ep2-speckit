# Tasks: Web Frontend Deployment via GitHub Actions

**Feature**: `002-web-deploy`
**Generated**: 2026-05-20
**Input**: `specs/002-web-deploy/plan.md`, `spec.md`, `data-model.md`, `contracts/workflow-interface.md`, `research.md`, `quickstart.md`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Maps to user story in spec.md — US1, US2
- Exact file paths are included in every task description

---

## Phase 1: Setup

**Purpose**: Confirm the frontend builds locally so the workflow has a known-good baseline.

- [X] T001 Verify `src/ai-genius-web/package.json` contains a `build` script that runs `vite build` and outputs to `src/ai-genius-web/dist`
- [X] T002 Verify `src/ai-genius-web/package-lock.json` exists (required for `actions/setup-node@v4` npm cache key)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Ensure repo-level prerequisites referenced by the workflow exist before authoring it.

**⚠️ CRITICAL**: The workflow will fail immediately if these inputs are missing.

- [X] T003 [P] Confirm repository secrets `AZURE_CREDENTIALS` and `AZURE_STATIC_WEB_APPS_API_TOKEN` are configured in GitHub repo settings (per contracts/workflow-interface.md)
- [X] T004 [P] Confirm GitHub environments `dev`, `qa`, `prod` each define variables `ENVIRONMENT`, `APP_NAME`, `VITE_API_URL` (per contracts/workflow-interface.md)

**Checkpoint**: Secrets and environment variables are in place — the workflow can authenticate and build with the correct API URL.

---

## Phase 3: User Story 1 — Automatic deployment on push to main (Priority: P1) 🎯 MVP

**Goal**: Every push to `main` automatically builds the React + Vite SPA in `src/ai-genius-web` and deploys `dist/` to Azure Static Web Apps, with the deployed URL surfaced in the run summary.

**Independent Test**: Push a commit that modifies a file under `src/ai-genius-web/` to `main`; confirm the workflow completes successfully and the Static Web App URL printed in the run summary serves the updated frontend.

- [X] T005 [US1] Create `.github/workflows/002-deploy-web.yml` with `name: 002 Deploy Web`, `on: push: branches: [main]`, and `concurrency: {group: "${{ github.workflow }}-${{ github.ref }}", cancel-in-progress: true}` (FR-001, FR-002, FR-004)
- [X] T006 [US1] Add `build-and-deploy` job to `.github/workflows/002-deploy-web.yml` — `runs-on: ubuntu-latest`, `environment: ${{ github.event.inputs.environment || 'dev' }}` (FR-005)
- [X] T007 [US1] Add `actions/checkout@v4` step as the first step of `build-and-deploy` in `.github/workflows/002-deploy-web.yml` (FR-006)
- [X] T008 [US1] Add `actions/setup-node@v4` step to `build-and-deploy` in `.github/workflows/002-deploy-web.yml` with `node-version: '20'`, `cache: 'npm'`, `cache-dependency-path: src/ai-genius-web/package-lock.json` (FR-007)
- [X] T009 [US1] Add `npm ci` step to `build-and-deploy` in `.github/workflows/002-deploy-web.yml` with `working-directory: src/ai-genius-web` (FR-008)
- [X] T010 [US1] Add `npm run build` step to `build-and-deploy` in `.github/workflows/002-deploy-web.yml` with `working-directory: src/ai-genius-web` and `env: {VITE_API_URL: ${{ vars.VITE_API_URL }}}` so Vite inlines the API base URL (FR-008, FR-008a, FR-012)
- [X] T011 [US1] Add `azure/login@v1` step to `build-and-deploy` in `.github/workflows/002-deploy-web.yml` with `creds: ${{ secrets.AZURE_CREDENTIALS }}` (FR-009)
- [X] T012 [US1] Add `Azure/static-web-apps-deploy@v1` step (id: `swa`) to `build-and-deploy` in `.github/workflows/002-deploy-web.yml` with `action: upload`, `app_location: src/ai-genius-web/dist`, `output_location: ""`, `skip_app_build: true`, `repo_token: ${{ secrets.GITHUB_TOKEN }}`, `azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}` (FR-010)
- [X] T013 [US1] Add a final step to `build-and-deploy` in `.github/workflows/002-deploy-web.yml` that writes `Deployed ${{ vars.APP_NAME }} to ${{ vars.ENVIRONMENT }} — URL: ${{ steps.swa.outputs.static_web_app_url }}` to `$GITHUB_STEP_SUMMARY` (FR-008b, FR-011)

**Checkpoint**: US1 complete — pushing to `main` builds the SPA and deploys it to the `dev` Static Web App; the deployed URL appears in the run summary.

---

## Phase 4: User Story 2 — Manual deployment to a chosen environment (Priority: P2)

**Goal**: Maintainers can trigger `002-deploy-web.yml` from the Actions UI and pick `dev`, `qa`, or `prod` to deploy to that environment's Static Web App.

**Independent Test**: From the Actions tab, run `002 Deploy Web` via `workflow_dispatch`, select `qa`, and confirm the workflow deploys against the `qa` environment's variables and reports the correct URL in the run summary.

- [X] T014 [US2] Add `workflow_dispatch` trigger to `.github/workflows/002-deploy-web.yml` with an `environment` choice input (`dev` \| `qa` \| `prod`, default `dev`) (FR-003)
- [X] T015 [US2] Confirm the `environment:` value on the `build-and-deploy` job resolves correctly for both `push` events (defaulting to `dev`) and `workflow_dispatch` events (using the selected input) in `.github/workflows/002-deploy-web.yml` (FR-005)

**Checkpoint**: US2 complete — the workflow can be dispatched manually against any of the three GitHub environments, and the run picks up that environment's `VITE_API_URL`, `APP_NAME`, and `ENVIRONMENT` variables.

---

## Phase 5: Polish & Validation

**Purpose**: Smoke-test the deployed pipeline end-to-end against the documented success criteria.

- [X] T016 Trigger the workflow on `main` and verify end-to-end runtime is under 5 minutes (SC-002)
- [X] T017 Manually dispatch the workflow against `dev`, `qa`, and `prod` and confirm each deploys to the correct Static Web App and that the printed URL serves the latest build (SC-001, SC-003)
- [X] T018 Push two commits to `main` in quick succession and verify the older run is cancelled by concurrency (SC-004)
- [X] T019 Temporarily break `src/ai-genius-web/src/App.jsx` (syntax error), push, and confirm the workflow fails at the build step and skips deploy; then revert (SC-005, FR-012) — verified via run 26142151191 (failed at Build step, deploy skipped)

---

## Dependencies

- Phase 1 (T001–T002) → Phase 2 (T003–T004) → Phase 3 (US1: T005–T013) → Phase 4 (US2: T014–T015) → Phase 5 (T016–T019)
- Within Phase 3, T005 must come first (creates the file); T006 depends on T005; T007–T012 are sequential steps appended into the same `build-and-deploy` job; T013 depends on T012 (uses `steps.swa.outputs.static_web_app_url`)
- Phase 4 edits the same workflow file as Phase 3 — T014 and T015 are sequential

## Parallel Execution Opportunities

- T003 and T004 are independent verifications and can run in parallel
- All other tasks edit the single workflow file `.github/workflows/002-deploy-web.yml` and must be sequential

## Implementation Strategy

1. **MVP first**: Complete Phases 1–3 to get push-to-`main` → `dev` deployment working end-to-end (User Story 1).
2. **Incremental**: Add Phase 4 to unlock manual dispatch across `qa`/`prod` (User Story 2).
3. **Validate**: Phase 5 confirms all success criteria (SC-001 through SC-005) against the live workflow.
