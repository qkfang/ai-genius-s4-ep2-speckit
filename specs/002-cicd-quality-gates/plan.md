# Implementation Plan: CI/CD Quality Gates and Deployment Approvals

**Branch**: `002-quality-gates-and` | **Date**: 2026-05-16 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-cicd-quality-gates/spec.md`

## Summary

Add a pull-request CI workflow (`.github/workflows/ci.yml`) that builds the React frontend (`src/ai-genius-web/`) and the .NET 9 API (`src/ai-genius-api/`) and runs their test suites on every PR targeting `main`, exposing a stable required status check name. In parallel, configure repository **Settings → Branches** to require a passing CI check + 1 approving review + PR-only merges on `main`, and configure repository **Settings → Environments** for `dev` (no gates), `qa` (1 required reviewer), and `prod` (2 required reviewers + 5-minute wait timer). Existing deployment workflow jobs already declare `environment: <env>`; this feature confirms that contract and documents it. Per the clarified spec, the protection rules are configured via the GitHub Settings UI/API and are not committed as workflow YAML; the only committed artifact is `ci.yml`.

## Technical Context

**Language/Version**: YAML (GitHub Actions workflow syntax); Node.js ≥18 (frontend build); .NET 9 SDK (API build)
**Primary Dependencies**: `actions/checkout@v4`, `actions/setup-node@v4`, `actions/setup-dotnet@v4` — all first-party GitHub Actions (Simplicity principle)
**Storage**: N/A — no persistent state introduced by this feature
**Testing**: `dotnet test` for the API (no-op success if no test project is present today, per spec Assumption); `npm run build` for the frontend (with `npm test --if-present` for the React test suite as it lands). Verification of branch/environment protection is by inspection of repository Settings + a deliberately failing PR.
**Target Platform**: GitHub Actions `ubuntu-latest` runners; GitHub.com hosted repository with Environments + Branch protection features enabled
**Project Type**: CI/CD pipeline + repository configuration (GitHub Actions workflow file + Settings-managed protection rules)
**Performance Goals**: CI workflow (frontend build + API build + tests) completes within 10 minutes wall-clock on `ubuntu-latest` so PR feedback stays inside the team's CI duration budget (SC-006). 5-minute wait timer on `prod` is a fixed policy value (SC-007).
**Constraints**:
- No protection rules may be expressed in committed YAML — they are repository Settings (FR-009..FR-016, clarification 1).
- Deployment jobs opt into protection by declaring `environment: <name>` on the job (FR-019a, clarification 2).
- No new third-party Actions beyond the official `actions/*` namespace (Simplicity).
- No secrets introduced; CI does not deploy and therefore needs no Azure credentials.
- Required status check name must be **stable** across runs so the branch protection rule can reference it by name (FR-007).
**Scale/Scope**: 1 new workflow file (`ci.yml`); 2 build jobs (frontend, api) producing 1 aggregated required check; 3 environments (`dev`, `qa`, `prod`) configured in Settings; 1 branch protection rule on `main`; 0 new application code changes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Security-First** — no secrets committed; HTTPS only | ✅ PASS | CI workflow performs no deployment and requires no secrets. Protection rules raise the bar for what reaches production. |
| **II. Cloud-Native** — Bicep IaC, tagged, idempotent | ✅ PASS (N/A) | No Azure resources introduced by this feature. Existing IaC pipeline is unchanged. |
| **III. CI/CD-Driven** — every merge triggers automation; pipeline gates merges | ✅ PASS | This feature **strengthens** the principle: it makes "all checks must pass" mechanically enforced by branch protection rather than convention. |
| **IV. Simplicity** — standard libs / first-party Actions preferred; single responsibility | ✅ PASS | Only `actions/checkout`, `actions/setup-node`, `actions/setup-dotnet`. No matrices, no third-party reviewers/approval Actions — approvals are handled by built-in GitHub Environments. |
| **V. Tested** — every API route has a test; frontend builds clean; failures block merge | ✅ PASS | CI runs `dotnet test` and `npm run build` (+ `npm test --if-present`); failure of either propagates to the required check and blocks merge into `main` (FR-005, FR-006, FR-010). |
| **Spec-first / branch naming / PR review** (Development Workflow) | ✅ PASS | Spec exists at `specs/002-cicd-quality-gates/spec.md`; branch is `002-quality-gates-and` (numbered + short description); PR review enforcement is literally what FR-011 installs. |

**Gate result**: All principles pass. No violations to justify in Complexity Tracking. Proceed to Phase 0.

**Post-Phase-1 re-check**: After completing Phase 1 design (data-model, contracts, quickstart) no new dependencies, third-party Actions, secrets, or Azure resources were introduced. All gates remain ✅ PASS.

## Project Structure

### Documentation (this feature)

```text
specs/002-cicd-quality-gates/
├── plan.md                       # This file (/speckit.plan output)
├── research.md                   # Phase 0 output
├── data-model.md                 # Phase 1 output
├── quickstart.md                 # Phase 1 output
├── contracts/                    # Phase 1 output
│   ├── ci-workflow-interface.md      # Required-status-check name + triggers + inputs
│   ├── branch-protection-rule.md     # Settings → Branches contract for `main`
│   └── environment-protection-rules.md  # Settings → Environments contract for dev/qa/prod
├── checklists/                   # (pre-existing) clarification + review checklists
└── tasks.md                      # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
.github/
└── workflows/
    ├── ci.yml                    # NEW — PR-gated build + test for frontend and API (FR-001..FR-008)
    └── deploy-infra.yml          # EXISTING — already declares `environment: <env>` on its deploy job (FR-019a)

src/
├── ai-genius-api/                # EXISTING .NET 9 Minimal API (built + tested by ci.yml)
│   └── ai-genius-api.csproj
└── ai-genius-web/                # EXISTING React 18 + Vite frontend (built + tested by ci.yml)
    └── package.json

bicep/                            # Unchanged
```

**Configured in GitHub repository Settings** (NOT committed as YAML — see clarification 1):

```text
Settings → Branches → Branch protection rules → `main`
   ├── Require a pull request before merging          (FR-009)
   ├── Require status checks to pass before merging   (FR-010)
   │     └── Required check: "ci" (job name from .github/workflows/ci.yml)
   ├── Require approvals: 1                           (FR-011)
   └── Do not allow bypassing the above settings      (FR-012, default)

Settings → Environments
   ├── dev   → no required reviewers, no wait timer    (FR-013)
   ├── qa    → required reviewers: 1                   (FR-014)
   └── prod  → required reviewers: 2 (prevent self-review),
               wait timer: 5 minutes                   (FR-015, FR-016)
```

**Structure Decision**: This is a **CI/CD-pipeline + repository-configuration** feature, not an application-code feature, so the project structure templates ("single project", "web app", "mobile + API") do not apply. The only file added under source control is `.github/workflows/ci.yml`. The other deliverables (branch protection rule on `main`; three environment protection rules) live in GitHub repository Settings per the spec's two clarifications and are captured as **contracts** in `contracts/` so they can be verified by inspection (US3 / FR-020).

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified.

No constitution violations. No third-party Actions, no new secrets, no new Azure resources, no parallel matrices — the simplest design that satisfies the spec is used.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| _(none)_ | — | — |
