# Tasks: Frontend Static Web App CI/CD Deployment

**Input**: Design documents from `/specs/002-frontend-swa-deploy/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/workflow-interface.md ✅, quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (no dependency on concurrent tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are included in all task descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the CI/CD workflow file and directory structure

- [X] T001 Create `.github/workflows/` directory and empty `.github/workflows/deploy-web.yml` file

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Workflow skeleton that all three user stories build upon — trigger, concurrency, permissions, and job definition

**⚠️ CRITICAL**: All user story phases depend on this skeleton being in place first

- [X] T002 Add workflow `name: "Deploy Web to Azure Static Web Apps"`, `on: push: branches: [main]` trigger, and `concurrency: { group: "deploy-web-${{ github.ref }}", cancel-in-progress: true }` block to `.github/workflows/deploy-web.yml`
- [X] T003 Add top-level `permissions: { id-token: write, contents: read }` block and define the `deploy` job with `name: "Build and Deploy"`, `runs-on: ubuntu-latest`, and `timeout-minutes: 10` (SC-001 safety cap) in `.github/workflows/deploy-web.yml`

**Checkpoint**: Workflow skeleton ready — user story steps can now be added

---

## Phase 3: User Story 1 - Automatic Deployment on Code Merge (Priority: P1) 🎯 MVP

**Goal**: Every push to main automatically installs dependencies, builds the React/Vite app, and deploys the `dist/` output to the Azure Static Web App — no manual steps required.

**Independent Test**: Push any change to main and verify: (1) Actions tab shows the workflow triggered and completed with a green check, (2) the live SWA URL reflects the change within 3 minutes.

### Implementation for User Story 1

- [X] T004 [P] [US1] Add `checkout` step using `actions/checkout@v4` as the first step in the `deploy` job in `.github/workflows/deploy-web.yml`
- [X] T005 [P] [US1] Add `setup-node` step using `actions/setup-node@v4` with `node-version: '20'`, `cache: 'npm'`, and `cache-dependency-path: src/ai-genius-web/package-lock.json` in `.github/workflows/deploy-web.yml`
- [X] T006 [US1] Add `install` step running `npm ci` with `working-directory: src/ai-genius-web` after the setup-node step in `.github/workflows/deploy-web.yml`
- [X] T007 [US1] Add `build` step running `npm run build` with `working-directory: src/ai-genius-web` and `env: { VITE_API_URL: "${{ vars.VITE_API_URL }}" }` after the install step in `.github/workflows/deploy-web.yml`
- [X] T008 [US1] Add `azure-login` step using `azure/login@v2` with `client-id: ${{ secrets.AZURE_CLIENT_ID }}`, `tenant-id: ${{ secrets.AZURE_TENANT_ID }}`, and `subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}` after the build step in `.github/workflows/deploy-web.yml`
- [X] T009 [US1] Add `get-token` step using `run: az staticwebapp secrets list --name ${{ vars.SWA_NAME }} --resource-group ${{ vars.AZURE_RG }} --query "properties.apiKey" -o tsv` and write result to `$GITHUB_OUTPUT` as `deployment_token` after the azure-login step in `.github/workflows/deploy-web.yml`
- [X] T010 [US1] Add `deploy` step using `Azure/static-web-apps-deploy@v1` with `azure_static_web_apps_api_token: ${{ steps.get-token.outputs.deployment_token }}`, `app_location: "src/ai-genius-web"`, and `output_location: "dist"` as the final step in `.github/workflows/deploy-web.yml`
- [X] T016 [US1] Add a guard step before the build step in `.github/workflows/deploy-web.yml` that validates `VITE_API_URL` is non-empty: `run: 'if [ -z "$VITE_API_URL" ]; then echo "ERROR: VITE_API_URL is not set" && exit 1; fi'` with `env: { VITE_API_URL: "${{ vars.VITE_API_URL }}" }` — ensures a misconfigured variable causes an explicit build failure per edge case in spec.md and FR-010

**Checkpoint**: User Story 1 fully functional — push to main triggers full install → build → deploy pipeline with green status check

---

## Phase 4: User Story 2 - Build Failure Blocks Deployment (Priority: P2)

**Goal**: Any failure in install, build, or deploy immediately halts the pipeline; no broken artifact ever reaches the live environment; the previously deployed site remains accessible.

**Independent Test**: Introduce a deliberate syntax error in `src/ai-genius-web/src/App.jsx`, push to a branch (or main in a test scenario), observe pipeline fails at the build step, confirm no deployment occurred and the live SWA URL is unchanged.

### Implementation for User Story 2

- [X] T011 [US2] Review `.github/workflows/deploy-web.yml` and confirm: (1) no step has `continue-on-error: true`, (2) no step has `if: always()` that bypasses failure, (3) step ordering is checkout → setup-node → guard → install → build → azure-login → get-token → deploy; add inline YAML comments on the install and build steps documenting the fail-fast guarantee per FR-007
- [X] T015 [US2] Add a YAML comment block above the `deploy` step in `.github/workflows/deploy-web.yml` documenting that Azure SWA uses atomic content swaps — the previously deployed version continues serving until the new deployment is fully propagated, satisfying FR-009 and SC-005; reference the SWA Standard tier atomic deployment guarantee

**Checkpoint**: User Story 2 verified — build failure halts all subsequent steps; live site unaffected by failed pipelines

---

## Phase 5: User Story 3 - Secretless Cloud Authentication (Priority: P3)

**Goal**: No long-lived credentials exist anywhere in the workflow or repository — only OIDC federated identity tokens issued at runtime are used for Azure authentication.

**Independent Test**: Audit the repository: (1) confirm GitHub Secrets contain only `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` (non-secret identity references, no passwords or API keys), (2) confirm workflow sources the deployment token from an `az` CLI call at runtime and never from a stored secret, (3) confirm `azure/login@v2` uses OIDC by checking the `id-token: write` permission is present.

### Implementation for User Story 3

- [X] T012 [US3] Audit `.github/workflows/deploy-web.yml` and confirm: (1) `permissions.id-token: write` is present, (2) `azure/login@v2` does not use a `creds:` or `client-secret:` input, (3) the SWA deployment token is fetched via `az staticwebapp secrets list` at runtime and passed directly to the deploy step output — not stored in any `env:` or `secrets:` block; add a comment block above the `azure-login` step documenting the OIDC-only authentication pattern per FR-005 and SC-003

**Checkpoint**: User Story 3 verified — zero long-lived credentials in repository; OIDC-only authentication confirmed

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, YAML lint, and quickstart walkthrough

- [X] T013 [P] Validate YAML syntax of `.github/workflows/deploy-web.yml` by cross-checking all field names, action versions (`actions/checkout@v4`, `actions/setup-node@v4`, `azure/login@v2`, `Azure/static-web-apps-deploy@v1`), and structure against `specs/002-frontend-swa-deploy/contracts/workflow-interface.md`
- [X] T014 Run through the `specs/002-frontend-swa-deploy/quickstart.md` day-to-day deployment scenario against the completed `.github/workflows/deploy-web.yml` to confirm all referenced secrets, variables, and step names align with the quickstart instructions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (T001) — BLOCKS all user story phases
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion (T002, T003)
- **User Story 2 (Phase 4)**: Depends on Phase 3 completion — reviews and annotates the same workflow file
- **User Story 3 (Phase 5)**: Depends on Phase 3 completion — can run in parallel with Phase 4
- **Polish (Phase 6)**: Depends on all story phases (3–5) being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — no story dependencies
- **User Story 2 (P2)**: Can start after User Story 1 (Phase 3) — reviews step ordering established in US1
- **User Story 3 (P3)**: Can start after User Story 1 (Phase 3) — reviews OIDC setup established in US1; can run **in parallel with US2**

### Within Each User Story

- T004 and T005 marked [P] — can be authored simultaneously (different steps, no inter-dependency)
- T006 depends on T005 (Node.js must be set up before `npm ci`)
- T007 depends on T006 (dependencies must be installed before build)
- T008 depends on T007 (build must succeed before Azure login matters)
- T009 depends on T008 (Azure CLI session required to fetch token)
- T010 depends on T009 (deployment token required as step input)

### Parallel Opportunities

- Phase 4 (US2) and Phase 5 (US3) can be done in parallel after Phase 3 completes
- T004 and T005 within Phase 3 can be authored in parallel
- T013 in Phase 6 can start as soon as T010 is complete (file is structurally complete)

---

## Parallel Example: User Story 1

```bash
# These two can be authored simultaneously (different steps in same file):
# T004 - Add checkout step
# T005 - Add setup-node step

# Then sequentially (order matters for fail-fast guarantee):
# T006 → T007 → T008 → T009 → T010
```

---

## Implementation Strategy

**MVP Scope**: Complete Phase 1 + Phase 2 + Phase 3 (T001–T010) for a fully working pipeline.

**Increment 2**: Phase 4 (T011) — verify and document fail-fast behaviour.

**Increment 3**: Phase 5 (T012) — verify and document OIDC-only authentication.

**Final**: Phase 6 (T013–T014) — polish, lint, and quickstart walkthrough.

> **Note**: Because all three user stories are implemented within a single YAML file, the MVP (Phase 3 complete) inherently satisfies US2 and US3 as well — the fail-fast behaviour comes from GitHub Actions' default step sequencing, and OIDC-only comes from using `azure/login@v2` without a `client-secret`. Phases 4 and 5 exist to make these guarantees explicit and documented.
