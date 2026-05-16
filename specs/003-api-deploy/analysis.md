# Cross-Artifact Analysis: 003-api-deploy

**Feature**: `003-api-deploy`  
**Date**: 2026-05-16  
**Scope**: Non-destructive consistency & quality analysis across `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/workflow-interface.md`, `tasks.md`.

## 1. Requirement → Task Coverage

| Requirement | Covered by Task(s) |
|-------------|--------------------|
| FR-001 (workflow path `.github/workflows/003-deploy-api.yml`) | T003 |
| FR-002 (push trigger on `main`) | T003 |
| FR-003 (`workflow_dispatch` with `environment` choice input, default `dev`) | T003 |
| FR-004 (workflow-level concurrency, `cancel-in-progress: true`) | T004 |
| FR-005 (job-level `environment:` binding) | T005, T012 |
| FR-006 (`actions/checkout@v4`) | T006 |
| FR-007 (`actions/setup-dotnet@v4` with `10.0.x`) | T007 |
| FR-008 (`dotnet publish` `-c Release -r linux-x64 --self-contained true -o ./publish`) | T008 |
| FR-009 (zip publish output into `publish.zip`) | T009 |
| FR-010 (`azure/login@v1` with `AZURE_CREDENTIALS`) | T010 |
| FR-011 (`azure/webapps-deploy@v3` with `APP_SERVICE_NAME`, `publish.zip`) | T011 |
| FR-012 (fail-fast on any failing step) | Implicit GitHub Actions step ordering — verified by T013 |

**Result**: All functional requirements have at least one task. No orphan requirements.

## 2. User Story → Acceptance Scenario Coverage

| Story | Acceptance Scenarios | Tasks |
|-------|---------------------|-------|
| US1 (Push to `main` deploys API) | 1, 2, 3 | T003–T011 |
| US2 (Workflow_dispatch deploys to any env) | 1, 2 | T003 (`workflow_dispatch` trigger), T004 (concurrency cancel), T012 (verification) |

**Result**: Each story’s acceptance scenarios trace to at least one task.

## 3. Consistency Check Across Artifacts

| Item | `spec.md` | `plan.md` | `research.md` | `data-model.md` | `contracts/workflow-interface.md` | `tasks.md` | Consistent? |
|------|-----------|-----------|---------------|-----------------|-----------------------------------|------------|-------------|
| Workflow path `.github/workflows/003-deploy-api.yml` | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| .NET version `10.0.x` | ✅ (clar.) | ✅ | D1 | — | ✅ | T007 | ✅ |
| Publish flags `linux-x64`, `--self-contained true`, `-c Release` | ✅ | ✅ | D2 | — | ✅ | T008 | ✅ |
| Artifact name `publish.zip` | ✅ (impl.) | ✅ (impl.) | D3 | ✅ | ✅ | T009 | ✅ |
| Auth via `azure/login@v1` + `AZURE_CREDENTIALS` | ✅ | ✅ | D4 | ✅ | ✅ | T010 | ✅ |
| Deploy via `azure/webapps-deploy@v3` + `vars.APP_SERVICE_NAME` | ✅ | ✅ | D6, D7 | ✅ | ✅ | T011 | ✅ |
| Concurrency group `${{ github.workflow }}-${{ github.ref }}`, `cancel-in-progress: true` | ✅ | ✅ | D5 | — | ✅ | T004 | ✅ |
| Workflow_dispatch input `environment` (`dev`/`qa`/`prod`, default `dev`) | ✅ | ✅ | D5 | ✅ | ✅ | T003 | ✅ |

**Result**: No contradictions detected between artifacts.

## 4. Constitution Alignment

| Principle | Verdict |
|-----------|---------|
| Security-First | ✅ — only secret reference is `AZURE_CREDENTIALS`; nothing inlined. |
| Cloud-Native | ✅ — relies on Bicep-provisioned App Service; no resource creation in this workflow. |
| CI/CD-Driven | ✅ — automated `push: main` trigger. |
| Spec-Gated | ✅ — `specs/003-api-deploy/spec.md` exists. |
| Simplicity | ✅ — single job, six steps, no third-party actions. |
| Tested | ✅ — `dotnet publish` failure halts the workflow before deploy. |

## 5. Risk / Quality Findings

| # | Severity | Finding | Recommendation |
|---|----------|---------|----------------|
| R1 | Low | The workflow assumes the App Service was created by `001-deploy-infra.yml` for the selected environment. | Document the dependency in `quickstart.md` (already noted in §Prerequisites). |
| R2 | Low | Self-contained publish produces a larger zip than framework-dependent builds, which may slow Zip Deploy on small SKUs. | Acceptable per user requirement; revisit only if SC-001 (10-min budget) is breached in practice. |
| R3 | Low | `vars.APP_SERVICE_NAME` must exist in each GitHub environment used; missing variable produces a runtime error in `azure/webapps-deploy@v3`. | Operator step listed in `quickstart.md` Prerequisites. |
| R4 | Info | `AGENTS.md` / project overview cites `dotnet-version: 10.0.x`; consistent with the spec and plan. | No action. |

**No high or critical issues found.**

## 6. Decision

All artifacts are internally consistent, requirements are fully covered by tasks, the constitution is satisfied, and no high-severity risks remain. **Proceed to checklist (Step 6) and implementation (Step 7).**
