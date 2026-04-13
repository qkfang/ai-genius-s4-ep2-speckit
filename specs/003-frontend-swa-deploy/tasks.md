# Tasks: Frontend React App Deployment via GitHub Actions

**Input**: Design documents from `specs/003-frontend-swa-deploy/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/workflow-interface.md ✅, quickstart.md ✅
**Spec source**: `specs/002-frontend-swa-deploy/spec.md`
**Output file**: `.github/workflows/deploy-web.yml`

## Format: `[ID] [P?] [Story?] Description — file path`

- **[P]**: Can run in parallel (no authoring dependency on in-progress tasks)
- **[US1/US2/US3]**: User story this task satisfies
- Exact file paths are included in every task description

---

## Phase 1: Setup

**Purpose**: Create the workflow directory and scaffold the complete YAML skeleton

- [ ] T001 Create `.github/workflows/deploy-web.yml` with the full workflow skeleton: `name`, `on.push.branches: [main]`, `concurrency` block (`group: deploy-${{ github.ref }}`, `cancel-in-progress: true`), `permissions` block (`id-token: write`, `contents: read`), `env:` block with `SWA_NAME` and `SWA_RESOURCE_GROUP` set to placeholder values (`<your-swa-name>` and `<your-resource-group>`), `jobs.deploy` with `runs-on: ubuntu-latest` and `defaults.run.working-directory: src/ai-genius-web`, and an empty `steps:` list — `.github/workflows/deploy-web.yml`

**Checkpoint**: Skeleton file exists; YAML is syntactically valid; `on`, `concurrency`, `permissions`, `env`, and `jobs.deploy` blocks are present.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No foundational phase needed — all three user stories add steps to the single workflow file created in Phase 1. Phase 1 is the foundational gate.

**⚠️ CRITICAL**: Phase 1 must be complete before any user story step can be appended.

---

## Phase 3: User Story 1 — Automated Deployment on Push to Main (Priority: P1) 🎯 MVP

**Goal**: Every push to `main` automatically installs frontend dependencies, builds the React app, and deploys `dist/` to Azure Static Web Apps — producing a green check on the Actions tab with the site live at the SWA URL.

**Independent Test**: Push any commit to `main`; observe the workflow run on the GitHub Actions tab (all steps green); navigate to the Static Web App URL and confirm it serves the updated React app (SC-001, SC-002, SC-003).

### Implementation for User Story 1

- [ ] T002 [P] [US1] Add `actions/checkout@v4` as step 1 of `jobs.deploy.steps` in `.github/workflows/deploy-web.yml`
- [ ] T003 [P] [US1] Add `actions/setup-node@v4` with `node-version: '20'` as step 2 of `jobs.deploy.steps` in `.github/workflows/deploy-web.yml`
- [ ] T004 [US1] Add `npm ci` run step (step 3, after checkout and setup-node — uses `defaults.run.working-directory: src/ai-genius-web`) in `.github/workflows/deploy-web.yml`
- [ ] T005 [US1] Add `npm run build` run step (step 4, after npm ci — produces `src/ai-genius-web/dist/`) in `.github/workflows/deploy-web.yml`
- [ ] T006 [US1] Add `Azure/static-web-apps-deploy@v1` step (step 7, final step) with `action: upload`, `app_location: src/ai-genius-web`, `output_location: dist`, `skip_app_build: true` — leave `azure_static_web_apps_api_token` as `TBD` placeholder to be wired in US2 — `.github/workflows/deploy-web.yml`

**Checkpoint**: Build pipeline tasks are in place. Push to a test branch and confirm `npm ci` and `npm run build` succeed. Deploy step is present but token not yet wired (completed in US2 phase).

---

## Phase 4: User Story 2 — Keyless Azure Authentication via Workload Identity Federation (Priority: P2)

**Goal**: The workflow authenticates to Azure using a GitHub-issued OIDC token — no long-lived Azure credentials stored as repository secrets. The SWA deployment token is fetched at runtime via Azure CLI and discarded after the run.

**Independent Test**: Open `Settings → Secrets and variables → Actions` in the repository; confirm no Azure key, password, or token is stored there (only `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` which are non-secret configuration IDs). Trigger a deployment and confirm it succeeds, proving authentication works without static credentials (SC-004, FR-005, FR-009).

### Implementation for User Story 2

- [ ] T007 [US2] Insert `azure/login@v2` step (step 5, between build step and fetch-token step) with `client-id: ${{ secrets.AZURE_CLIENT_ID }}`, `tenant-id: ${{ secrets.AZURE_TENANT_ID }}`, `subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}` — no `enable-AzPSSession` needed — `.github/workflows/deploy-web.yml`
- [ ] T008 [US2] Insert `az staticwebapp secrets list` step (step 6, id: `get-token`) using `--name "${{ env.SWA_NAME }}"` and `--resource-group "${{ env.SWA_RESOURCE_GROUP }}"` with `--query "properties.apiKey" -o tsv`; write result to `$GITHUB_OUTPUT` as `token=<value>`; set `working-directory: ${{ github.workspace }}` to override the job default — `.github/workflows/deploy-web.yml`
- [ ] T009 [US2] Update the `Azure/static-web-apps-deploy@v1` step (T006) to set `azure_static_web_apps_api_token: ${{ steps.get-token.outputs.token }}` — replacing the `TBD` placeholder — `.github/workflows/deploy-web.yml`
- [ ] T010 [US2] Replace `SWA_NAME` and `SWA_RESOURCE_GROUP` placeholder values in the `env:` block with the actual Azure Static Web App resource name and resource group for this project — `.github/workflows/deploy-web.yml`

**Checkpoint**: No static credential stored in the repository. `azure/login@v2` authenticates via OIDC. `get-token` step fetches the SWA token at runtime. Deploy step receives `steps.get-token.outputs.token`. Full end-to-end push succeeds (FR-005, FR-009, SC-004).

---

## Phase 5: User Story 3 — Build Failure Visibility (Priority: P3)

**Goal**: A build-breaking push fails the workflow at the build step, prevents deployment, and shows a red ✗ on the Actions tab — the last good version of the site remains live.

**Independent Test**: Introduce an intentional syntax error in `src/ai-genius-web/src/App.jsx`, push to `main`; confirm the Actions tab shows a failed run with the error in the build step logs; confirm Azure login and deploy steps did not execute; confirm the Static Web App continues to serve the previous known-good version (SC-005, FR-007).

### Implementation for User Story 3

- [ ] T011 [US3] Audit `.github/workflows/deploy-web.yml` to confirm: (1) `npm run build` step has no `continue-on-error: true`; (2) the Azure login, get-token, and deploy steps have no `if: always()` override; (3) step ordering places all Azure/deploy steps after the build step — GitHub Actions default fail-fast behaviour is the sole gate for FR-007, no extra conditional logic required — `.github/workflows/deploy-web.yml`

**Checkpoint**: Introduce a deliberate syntax error, push, confirm the workflow fails before any Azure step runs, then revert and confirm the workflow goes green again.

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end validation and any remaining configuration

- [ ] T012 Validate the complete workflow end-to-end per `specs/003-frontend-swa-deploy/quickstart.md`: push to `main`, confirm green check on the Actions tab within 60 seconds (SC-001), confirm deployed site is reachable at the SWA URL within 5 minutes (SC-003), confirm total run duration is under 10 minutes (SC-006) — `.github/workflows/deploy-web.yml`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately.
- **Phase 3 (US1)**: Depends on Phase 1. Must be complete before US2 tasks can wire the token.
- **Phase 4 (US2)**: Depends on Phase 3 (T006 must exist to be updated by T009). US2 steps are inserted between T005 and T006.
- **Phase 5 (US3)**: Depends on Phase 3 and Phase 4 being complete — the audit requires all steps to be present.
- **Polish (Final)**: Depends on all five phases being complete.

### User Story Dependencies

| Story | Depends On | Can Run Independently? |
|-------|-----------|------------------------|
| US1 (P1) | Phase 1 complete | ✅ Yes — after T001 |
| US2 (P2) | T006 (deploy step) must exist | ⚠️ Partial — T007/T008 can start after T005; T009 requires T006 |
| US3 (P3) | T006, T007, T008, T009 complete | ✅ Yes — pure audit; no code changes |

### Within Each User Story

- T002 and T003 are [P] — checkout and setup-node steps are independent YAML stanzas with no authoring dependency between them.
- T004 must follow T003 (npm ci requires Node.js on PATH).
- T005 must follow T004 (build requires installed dependencies).
- T006 must follow T005 (deploy step placement is after build).
- T007 → T008 → T009 are strictly sequential (each references the previous step's output).

---

## Parallel Execution Examples

### Parallel within Phase 3 (US1)
```
# T002 and T003 can be written simultaneously:
Task T002: "Add actions/checkout@v4 step in .github/workflows/deploy-web.yml"
Task T003: "Add actions/setup-node@v4 step in .github/workflows/deploy-web.yml"
```

### Sequential chain for US2 authentication
```
T007 (azure/login) → T008 (fetch token, id: get-token) → T009 (wire token into deploy step)
```

---

## Implementation Strategy

### MVP: User Story 1 Only

1. Complete Phase 1 (T001) — create the skeleton.
2. Complete Phase 3 (T002–T006) — build + deploy pipeline with a placeholder token.
3. Complete Phase 4 (T007–T010) — wire OIDC and token fetch.
4. **STOP and VALIDATE**: Push to `main`; confirm green check and live site.
5. Complete Phase 5 (T011) + Final Polish (T012) once the happy path is verified.

> MVP is US1 + US2 together — US2 is a prerequisite for US1 to produce a working deployment (the deploy step needs a token). US3 validation (T011) can follow once the green path is confirmed.
