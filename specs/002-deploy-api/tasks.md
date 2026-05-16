# Tasks: Deploy AI Genius Backend API via GitHub Actions

**Input**: Design documents from `/specs/002-deploy-api/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/workflow.md, quickstart.md

**Tests**: Not requested in spec. No test tasks generated (workflow validated via real `main` run).

**Format**: `- [X] [TaskID] [P?] [Story?] Description with file path`

---

## Phase 1: Setup

- [X] T001 Verify `.github/workflows/` directory exists at repo root and confirm sibling workflow `.github/workflows/001-deploy-infra.yml` is present as the convention reference
- [X] T002 [P] Confirm `src/ai-genius-api/ai-genius-api.csproj` targets `net10.0` and builds cleanly with `dotnet publish -c Release -r linux-x64 --self-contained true`
- [X] T003 [P] Confirm GitHub Environments `dev`, `qa`, `prod` each define variable `APP_SERVICE_NAME` and secret `AZURE_CREDENTIALS` (per assumptions in spec.md)

## Phase 2: Foundational

- [X] T004 Create the workflow file `.github/workflows/003-deploy-api.yml` with `name: "003 Deploy API to Azure App Service"` and a single job `build_and_deploy_api` on `ubuntu-latest`
- [X] T005 Add concurrency block to `.github/workflows/003-deploy-api.yml` keyed on `${{ github.workflow }}-${{ github.ref }}` with `cancel-in-progress: true` (mirrors `001-deploy-infra.yml`) — satisfies FR-005

## Phase 3: User Story 1 — Automatic API deployment on merge to main (P1) 🎯 MVP

**Goal**: Every push to `main` automatically builds and deploys the API to the `dev` App Service.

**Independent Test**: Push a trivial commit to `main`; workflow "003 Deploy API to Azure App Service" runs to success and the dev App Service serves the new build.

- [X] T006 [US1] Add `on.push.branches: [main]` trigger to `.github/workflows/003-deploy-api.yml` — satisfies FR-002
- [X] T007 [US1] Add step `actions/checkout@v4` as the first job step in `.github/workflows/003-deploy-api.yml` — satisfies FR-014 step 1
- [X] T008 [US1] Add step `actions/setup-dotnet@v4` with `dotnet-version: 10.0.x` in `.github/workflows/003-deploy-api.yml` — satisfies FR-006, FR-014 step 2
- [X] T009 [US1] Add step running `dotnet publish src/ai-genius-api/ai-genius-api.csproj -c Release -r linux-x64 --self-contained true -o ./publish` in `.github/workflows/003-deploy-api.yml` — satisfies FR-006, FR-014 step 3
- [X] T010 [US1] Add step that zips `./publish` to `./publish.zip` (e.g., `cd publish && zip -r ../publish.zip .`) in `.github/workflows/003-deploy-api.yml` — satisfies FR-007, FR-014 step 4
- [X] T011 [US1] Add step `azure/login@v1` consuming `${{ secrets.AZURE_CREDENTIALS }}` in `.github/workflows/003-deploy-api.yml` — satisfies FR-008
- [X] T012 [US1] Add step `azure/webapps-deploy@v3` with `app-name: ${{ vars.APP_SERVICE_NAME }}` and `package: ./publish.zip` in `.github/workflows/003-deploy-api.yml` — satisfies FR-009, FR-010, FR-014 step 5, FR-015

**Checkpoint**: Merging to `main` produces a successful end-to-end deploy to the dev App Service.

## Phase 4: User Story 2 — On-demand deployment to selected environment (P2)

**Goal**: Manual `workflow_dispatch` lets a user pick `dev`/`qa`/`prod` and deploys there.

**Independent Test**: Run workflow manually with `environment=qa`; job runs under GitHub Environment `qa` and deploys to qa's App Service.

- [X] T013 [US2] Add `on.workflow_dispatch.inputs.environment` (type `choice`, options `dev`/`qa`/`prod`, default `dev`) to `.github/workflows/003-deploy-api.yml` — satisfies FR-003
- [X] T014 [US2] Set `jobs.build_and_deploy_api.environment: ${{ github.event.inputs.environment || 'dev' }}` in `.github/workflows/003-deploy-api.yml` so env-scoped vars/secrets and protections apply — satisfies FR-004

**Checkpoint**: Manual dispatch deploys to the chosen environment; push-to-main defaults to `dev`.

## Phase 5: User Story 3 — Safe handling of overlapping runs (P3)

**Goal**: Superseded in-progress runs on the same ref are cancelled.

**Independent Test**: Push two commits to `main` within seconds; the first run is cancelled and only the latest commit is deployed.

- [X] T015 [US3] Verify the concurrency block added in T005 cancels in-progress runs on the same ref (no code change if T005 is correct) in `.github/workflows/003-deploy-api.yml` — satisfies FR-005, SC-004

## Phase 6: Polish & Cross-Cutting

- [X] T016 [P] Validate `.github/workflows/003-deploy-api.yml` YAML syntax (e.g., `actionlint` or GitHub's UI) and confirm fail-fast behavior (no `continue-on-error`) — satisfies FR-011
- [X] T017 [P] Run the quickstart scenario in `specs/002-deploy-api/quickstart.md` end-to-end against `dev` and capture the run URL plus a smoke check of the App Service public URL — satisfies SC-001, SC-002, SC-003
- [X] T018 [P] Cross-check `.github/workflows/003-deploy-api.yml` against the contract in `specs/002-deploy-api/contracts/workflow.md` (triggers, inputs, env, concurrency, steps, runner)

---

## Dependencies

- Setup (T001–T003) → Foundational (T004–T005) → User stories
- US1 (T006–T012) is the MVP and depends only on Foundational
- US2 (T013–T014) depends on Foundational; independent of US1 implementation but typically layered on top
- US3 (T015) depends on T005
- Polish (T016–T018) runs after US1 minimum; ideally after all stories

## Parallel Opportunities

- T002 and T003 in Setup (independent checks)
- Within US1, steps must be authored in order inside one file, so [P] is not marked
- T016, T017, T018 in Polish (independent verification activities)

## Implementation Strategy

- **MVP**: Complete Phases 1–3 to deliver auto-deploy on push to `main` (US1).
- **Increment 1**: Add Phase 4 (US2) for manual env selection.
- **Increment 2**: Confirm Phase 5 (US3) concurrency behavior.
- **Hardening**: Phase 6 polish & validation.

## Summary

- Total tasks: 18
- US1: 7 tasks (T006–T012) — MVP
- US2: 2 tasks (T013–T014)
- US3: 1 task (T015)
- Setup/Foundational/Polish: 8 tasks
- Independent test criteria captured per story above
