# Tasks: Backend API Deployment via GitHub Actions

**Feature**: `003-api-deploy`
**Generated**: 2026-05-20
**Input**: `specs/003-api-deploy/plan.md`, `spec.md`, `data-model.md`, `contracts/workflow-interface.md`

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Confirm `src/ai-genius-api/ai-genius-api.csproj` targets `net10.0` and builds locally.
- [X] T002 Confirm `001-deploy-infra.yml` patterns (env/concurrency/secrets) to mirror.

## Phase 2: User Story 1 — Automated API Deployment on Push (P1) 🎯 MVP

- [X] T003 [US1] Create `.github/workflows/003-deploy-api.yml` with `name`, `on.push.branches: [main]`, `on.workflow_dispatch.inputs.environment` (choice dev/qa/prod, default dev), and workflow-level `concurrency` block.
- [X] T004 [US1] Add workflow-level `env` block exposing `ENVIRONMENT` and `APP_SERVICE_NAME` from `vars.APP_SERVICE_NAME`.
- [X] T005 [US1] Add `deploy-api` job: `runs-on: ubuntu-latest`, `environment: ${{ github.event.inputs.environment || 'dev' }}`.
- [X] T006 [US1] Add `actions/checkout@v4` step.
- [X] T007 [US1] Add `actions/setup-dotnet@v4` step pinned to `10.0.x`.
- [X] T008 [US1] Add `dotnet publish` step: `-c Release -r linux-x64 --self-contained true -o ./publish` against `src/ai-genius-api/ai-genius-api.csproj`.
- [X] T009 [US1] Add zip step packaging `./publish` into `./publish.zip`.
- [X] T010 [US1] Add `azure/login@v1` step using `creds: ${{ secrets.AZURE_CREDENTIALS }}`.
- [X] T011 [US1] Add `azure/webapps-deploy@v3` step with `app-name: ${{ env.APP_SERVICE_NAME }}` and `package: ./publish.zip`.

## Phase 3: User Story 2 — Manual Dispatch (P2)

- [X] T012 [US2] Verify `workflow_dispatch` input default and choices match dev/qa/prod (covered in T003).

## Final Phase: Polish

- [X] T013 Validate YAML syntax by inspection; confirm step ids/refs and ensure no stray placeholders.

## Dependencies

```
T001, T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012 → T013
```
