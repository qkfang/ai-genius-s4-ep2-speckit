# Tasks: React Frontend Web Deployment Workflow

**Input**: Design documents from `specs/002-deploy-web/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/workflow-interface.md`, `quickstart.md`

**Tests**: The feature specification includes mandatory independent testing scenarios. Validation tasks below focus on workflow contract review, local build checks, and GitHub Actions manual/main-run verification.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files or only performs independent validation
- **[Story]**: User story label for story-specific work
- Every task includes an exact repository path

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the existing repo conventions and frontend build inputs before creating the deployment workflow.

- [ ] T001 Review the existing GitHub Actions environment and concurrency pattern in `.github/workflows/001-deploy-infra.yml`
- [ ] T002 [P] Verify frontend build scripts and npm lockfile inputs in `src/ai-genius-web/package.json` and `src/ai-genius-web/package-lock.json`
- [ ] T003 [P] Verify Vite build output remains `dist` in `src/ai-genius-web/vite.config.js`
- [ ] T004 [P] Verify Static Web Apps SKU readiness values in `bicep/parameters.dev.json` and `bicep/parameters.prod.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the shared workflow structure required by every user story.

**Critical**: No user story work can be completed until this workflow foundation exists.

- [ ] T005 Create `.github/workflows/002-deploy-web.yml` with workflow name, `ubuntu-latest` job, and `actions/checkout@v4` checkout step
- [ ] T006 Add shared workflow environment variables `ENVIRONMENT`, `APP_NAME`, and `VITE_API_URL` in `.github/workflows/002-deploy-web.yml`
- [ ] T007 Add `actions/setup-node@v4` with Node.js 20 and npm cache path `src/ai-genius-web/package-lock.json` in `.github/workflows/002-deploy-web.yml`

**Checkpoint**: Workflow foundation is ready for user story implementation.

---

## Phase 3: User Story 1 - Automatic Frontend Deployment on Main Push (Priority: P1) MVP

**Goal**: Pushes to `main` automatically build `src/ai-genius-web` and deploy the generated `dist` output to Azure Static Web Apps.

**Independent Test**: Push a harmless frontend change to `main`, confirm the workflow starts automatically, cancels older same-ref runs, completes successfully, and the Static Web Apps site serves the latest frontend build.

### Implementation for User Story 1

- [ ] T008 [US1] Add `push` trigger for branch `main` in `.github/workflows/002-deploy-web.yml`
- [ ] T009 [US1] Add concurrency group `${{ github.workflow }}-${{ github.ref }}` with `cancel-in-progress: true` in `.github/workflows/002-deploy-web.yml`
- [ ] T010 [US1] Add dependency installation step running `npm ci` with working directory `src/ai-genius-web` in `.github/workflows/002-deploy-web.yml`
- [ ] T011 [US1] Add production build step running `npm run build` with `VITE_API_URL` available from `vars.VITE_API_URL` in `.github/workflows/002-deploy-web.yml`
- [ ] T012 [US1] Add Azure Static Web Apps upload step for `src/ai-genius-web/dist` with `skip_app_build: true` in `.github/workflows/002-deploy-web.yml`
- [ ] T013 [US1] Run the local frontend build check from `src/ai-genius-web/package.json` and verify generated output under `src/ai-genius-web/dist`
- [ ] T014 [US1] Verify the main-push workflow contract in `.github/workflows/002-deploy-web.yml` against `specs/002-deploy-web/contracts/workflow-interface.md`

**Checkpoint**: User Story 1 is complete when main branch pushes can build and deploy the frontend automatically.

---

## Phase 4: User Story 2 - Manual Frontend Deployment by Environment (Priority: P2)

**Goal**: Operators can manually run the same frontend deployment workflow for `dev`, `qa`, or `prod` using the selected GitHub environment.

**Independent Test**: Start the workflow manually from GitHub Actions, select `dev`, `qa`, or `prod`, and confirm the selected environment is used for environment binding and deployment configuration.

### Implementation for User Story 2

- [ ] T015 [US2] Add `workflow_dispatch` input `environment` with choices `dev`, `qa`, and `prod` in `.github/workflows/002-deploy-web.yml`
- [ ] T016 [US2] Bind the deployment job environment to `${{ github.event.inputs.environment || 'dev' }}` in `.github/workflows/002-deploy-web.yml`
- [ ] T017 [US2] Ensure push-triggered and manual runs both default `ENVIRONMENT` to `dev` when no input is provided in `.github/workflows/002-deploy-web.yml`
- [ ] T018 [US2] Verify `dev` and `prod` Static Web Apps SKU policy in `bicep/parameters.dev.json` and `bicep/parameters.prod.json`
- [ ] T019 [US2] Validate the manual deployment checklist in `specs/002-deploy-web/quickstart.md` against `.github/workflows/002-deploy-web.yml`

**Checkpoint**: User Story 2 is complete when manual runs expose the environment choice and honor the selected target environment.

---

## Phase 5: User Story 3 - Secure Deployment Credentials (Priority: P3)

**Goal**: The workflow uses GitHub secrets for Azure login and Static Web Apps deployment without hard-coded credential values.

**Independent Test**: Review the workflow file and run it with configured repository secrets, confirming Azure authentication uses `AZURE_CREDENTIALS`, Static Web Apps deployment uses `AZURE_STATIC_WEB_APPS_API_TOKEN`, and no secret values are stored in source control.

### Implementation for User Story 3

- [ ] T020 [US3] Add `azure/login@v1` authentication using `secrets.AZURE_CREDENTIALS` in `.github/workflows/002-deploy-web.yml`
- [ ] T021 [US3] Pass `secrets.AZURE_STATIC_WEB_APPS_API_TOKEN` and `secrets.GITHUB_TOKEN` to the Static Web Apps deploy step in `.github/workflows/002-deploy-web.yml`
- [ ] T022 [US3] Confirm `.github/workflows/002-deploy-web.yml` contains no hard-coded Azure credentials, deployment tokens, or environment-specific secret values
- [ ] T023 [US3] Verify failure ordering keeps install, build, Azure login, and Static Web Apps deploy as separate failing steps in `.github/workflows/002-deploy-web.yml`

**Checkpoint**: User Story 3 is complete when credential usage is secret-backed and deployment failures are reported by the responsible workflow step.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final consistency checks and handoff validation across all stories.

- [ ] T024 [P] Review action versions and YAML indentation in `.github/workflows/002-deploy-web.yml` against repository standards in `AGENTS.md`
- [ ] T025 [P] Verify required GitHub secrets and variables for this workflow are documented in `AGENTS.md`
- [ ] T026 Run the full sprint done validation from `specs/002-deploy-web/quickstart.md` for `.github/workflows/002-deploy-web.yml`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies, can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 and blocks all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2 and provides the MVP deployment path
- **User Story 2 (Phase 4)**: Depends on Phase 2 and can be worked after or alongside User Story 1 once the workflow file exists
- **User Story 3 (Phase 5)**: Depends on Phase 2 and can be worked after or alongside User Story 1 once deployment steps are present
- **Polish (Phase 6)**: Depends on selected user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Start after Phase 2; no dependency on User Story 2 or User Story 3
- **User Story 2 (P2)**: Start after Phase 2; independent from User Story 1 except for sharing `.github/workflows/002-deploy-web.yml`
- **User Story 3 (P3)**: Start after Phase 2; independent from User Story 2 but should be reviewed with the deploy step from User Story 1

### Within Each User Story

- Add workflow structure before validation
- Keep install, build, login, and deploy as separate steps
- Validate the story independently before moving to the next priority when following MVP delivery

---

## Parallel Opportunities

- T002, T003, and T004 can run in parallel during setup
- After T005 creates the workflow file, T006 and T007 are sequential because they edit the same file
- T018 can run in parallel with T015 through T017 because it validates Bicep parameter files
- T022 can run in parallel with T023 after T020 and T021 are complete because both are read-only workflow checks
- T024 and T025 can run in parallel during polish because one reviews workflow formatting and the other reviews documentation

---

## Parallel Example: User Story 1

```text
Task: "Add push trigger for branch main in .github/workflows/002-deploy-web.yml"
Task: "Run the local frontend build check from src/ai-genius-web/package.json"
```

Note: Both tasks can be assigned together only after Phase 2 is complete because one edits the workflow and one validates the frontend project independently.

## Parallel Example: User Story 2

```text
Task: "Add workflow_dispatch input environment with choices dev, qa, and prod in .github/workflows/002-deploy-web.yml"
Task: "Verify dev and prod Static Web Apps SKU policy in bicep/parameters.dev.json and bicep/parameters.prod.json"
```

## Parallel Example: User Story 3

```text
Task: "Confirm .github/workflows/002-deploy-web.yml contains no hard-coded Azure credentials"
Task: "Verify failure ordering keeps install, build, Azure login, and Static Web Apps deploy as separate failing steps"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup checks.
2. Complete Phase 2 workflow foundation.
3. Complete Phase 3 for automatic `main` push deployment.
4. Stop and validate User Story 1 independently with the quickstart main-push check.
5. Demo or deploy once the workflow run succeeds.

### Incremental Delivery

1. Deliver User Story 1 so frontend changes deploy automatically from `main`.
2. Add User Story 2 so operators can choose `dev`, `qa`, or `prod` manually.
3. Add User Story 3 credential review and failure-path validation.
4. Finish with polish checks for standards, documentation, and quickstart validation.

### Team Strategy

1. One person completes Phase 1 and Phase 2.
2. A workflow-focused person completes User Story 1 trigger/build/deploy tasks.
3. An operations-focused person completes User Story 2 manual environment tasks.
4. A reviewer completes User Story 3 credential and failure-order checks.

---

## Notes

- `[P]` tasks are safe to run in parallel because they touch different files or are read-only checks.
- Story labels map directly to the user stories in `specs/002-deploy-web/spec.md`.
- Keep `.github/workflows/002-deploy-web.yml` aligned with `.github/workflows/001-deploy-infra.yml` for environment and concurrency behavior.
- Do not hard-code Azure credentials, Static Web Apps deployment tokens, API URLs, or environment-specific secret values.
