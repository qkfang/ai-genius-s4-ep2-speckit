# Phase 1 Data Model: CI/CD Quality Gates and Deployment Approvals

**Feature**: 002-cicd-quality-gates
**Date**: 2026-05-16

This feature introduces no application data and no persistent storage. The "entities" here are **GitHub platform entities** that the feature configures or consumes. Each is documented with its attributes, where it lives, how it is created/modified, and which functional requirements depend on it.

---

## E1. Pull Request to `main`

A proposed change to the protected default branch.

| Attribute | Source / Owner | Notes |
|---|---|---|
| `base` | GitHub | MUST equal `main` for this feature to apply (FR-002) |
| `head_sha` | GitHub | The commit that CI runs against |
| `mergeable_state` | GitHub | Becomes `blocked` if required checks or required approvals are missing |
| `required_status_checks[]` | Branch protection (Settings) | Must include `ci` (see E3) |
| `required_approving_review_count` | Branch protection (Settings) | `1` per FR-011 |
| `approving_reviews[]` | GitHub Reviews API | Populated by reviewer action |

**Lifecycle**:
`opened` → CI workflow run starts (E2) → reviewer approves → `mergeable_state = clean` → merge button enabled.

**Validation rules from spec**:
- Direct push to `main` MUST be rejected (FR-009).
- Missing required check is treated the same as failing (Edge Case 1; enforced by GitHub by default when "Require status checks to pass" is on).
- Force-push to a PR branch SHOULD invalidate stale approvals if the team enables "Dismiss stale pull request approvals when new commits are pushed" (Edge Case 2; recommended in quickstart).

**FRs depending on this entity**: FR-002, FR-009, FR-010, FR-011, FR-012.

---

## E2. CI Workflow Run

An execution of `.github/workflows/ci.yml` tied to a specific PR `head_sha`.

| Attribute | Value | Notes |
|---|---|---|
| Workflow file | `.github/workflows/ci.yml` | NEW — added by this feature (FR-001) |
| Job name | `ci` | Stable identifier referenced by branch protection (FR-007, see R3) |
| Trigger | `pull_request: branches: [main]` | FR-002 |
| Steps (in order) | `checkout` → `setup-node` → `npm ci` → `npm run build` → `npm test --if-present` → `setup-dotnet` → `dotnet build` → `dotnet test` | FR-003..FR-006 |
| Timeout | `timeout-minutes: 15` | FR-008 (R6) |
| Required secrets | _none_ | CI does not deploy |
| Status check name reported to PR | `ci` | Must match the value configured in branch protection (E4) |

**Validation rules from spec**:
- Any step failure MUST cause the job to fail and the `ci` status check to report failure (FR-005, FR-006).
- The job MUST complete (success or failure) within the timeout rather than hang (FR-008).

**State transitions**:
`queued → in_progress → (success | failure | cancelled | timed_out)`. Only `success` permits merge under FR-010.

**FRs depending on this entity**: FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008.

---

## E3. Deployment Environment (`dev`, `qa`, `prod`)

A named target in **Settings → Environments** with protection rules that a workflow job must satisfy before its steps execute.

### Common attributes

| Attribute | dev | qa | prod | FR |
|---|---|---|---|---|
| Environment name | `dev` | `qa` | `prod` | FR-013, FR-014, FR-015 |
| Required reviewers (count) | 0 | 1 | 2 | FR-013, FR-014, FR-015 |
| Required reviewers (list) | _empty_ | defined team/users | defined team/users | (operational; out of spec scope) |
| Prevent self-review | n/a | optional | **enabled** | spec Assumption + R7 |
| Wait timer (minutes) | 0 | 0 | **5** | FR-016 |
| Deployment branches | (recommended) `main` only | `main` only | `main` only | reinforces FR-009 |

### Validation rules

- Approval at one environment MUST NOT satisfy another's gate — each environment is evaluated independently (FR-017). GitHub enforces this by design: approvals are scoped to `(environment, workflow_run_id)`.
- Re-running a deployment job MUST re-trigger approval and the wait timer (FR-018). GitHub enforces this by design: re-runs are new attempts and reuse no prior approvals.
- A user with `write` access (and not the triggering user, when self-review is disabled) MUST be able to cancel the run during the 5-minute wait window, leaving the deployment target unchanged (FR-019). GitHub enforces this via the "Cancel run" action; cancellation occurs **before** any step in the gated job has run, so production is untouched.

### State diagram (per workflow run, per environment)

```text
job-reached
   │
   ▼
waiting-for-required-reviewers ──(approved by required count)──▶ waiting-for-wait-timer
                                                                       │
                                                          ┌────────────┴────────────┐
                                                          ▼                         ▼
                                                  (timer elapses)              (cancelled)
                                                          │                         │
                                                          ▼                         ▼
                                                 running-steps                  no-op
                                                          │
                                                          ▼
                                                  succeeded | failed
```

For `dev`, all gates are bypassed and the job goes directly to `running-steps`.

**FRs depending on this entity**: FR-013, FR-014, FR-015, FR-016, FR-017, FR-018, FR-019, FR-020.

---

## E4. Branch Protection Rule on `main`

A single rule in **Settings → Branches → Branch protection rules**.

| Attribute | Value | FR |
|---|---|---|
| Branch name pattern | `main` | — |
| Require a pull request before merging | **enabled** | FR-009 |
| Require approvals | **enabled**, count = `1` | FR-011 |
| Dismiss stale pull request approvals when new commits are pushed | **recommended enabled** | Edge Case 2 |
| Require status checks to pass before merging | **enabled** | FR-010 |
| Required status checks (list) | `ci` (the job name from E2) | FR-007, FR-010 |
| Require branches to be up to date before merging | optional (team choice) | — |
| Do not allow bypassing the above settings | **enabled** | FR-012 (default per spec Assumption) |
| Restrict who can push to matching branches | n/a (no direct pushes allowed at all) | reinforces FR-009 |
| Allow force pushes | **disabled** | preserves audit history |
| Allow deletions | **disabled** | preserves `main` branch |

**Validation rules**:
- The "Required status checks" list MUST contain the literal string `ci` so the rule binds to E2's job name. If E2's job is renamed, this rule MUST be updated in the same change (Edge Case 1 — "missing = failing", so a stale reference would render the gate effectively absent).
- Administrators MUST be subject to the rule (no bypass) unless an explicit, documented exception is recorded (FR-012).

**FRs depending on this entity**: FR-007, FR-009, FR-010, FR-011, FR-012.

---

## E5. Approval

A recorded decision by an authorized reviewer permitting a specific workflow run to proceed past an environment's gate.

| Attribute | Source | Notes |
|---|---|---|
| `reviewer.login` | GitHub | The approving user |
| `state` | GitHub | `approved` or `rejected` |
| `created_at` | GitHub | Timestamp surfaces audit data per FR-020 |
| `environment` | GitHub | One of `dev` (n/a), `qa`, `prod` |
| `workflow_run_id` | GitHub | Approval scoped to this run only (FR-017) |

**Validation rules**:
- Identity and timestamp MUST be visible in the workflow run history view (FR-020, SC-005).
- For `prod`, two distinct `reviewer.login` values are required (FR-015); GitHub enforces uniqueness by reviewer.
- For `prod` with "Prevent self-review" enabled, `reviewer.login` MUST NOT equal the user who triggered the deployment (spec Assumption + R7).

**FRs depending on this entity**: FR-014, FR-015, FR-017, FR-020.

---

## Cross-entity contracts (summary)

| Contract | Producer | Consumer |
|---|---|---|
| Stable job name `ci` | E2 (`ci.yml`) | E4 (branch protection's required-check list) |
| `environment: <name>` job key | Deployment workflow jobs (existing `deploy-infra.yml`; future deploy-api / deploy-web) | E3 (environment protection rules) |
| Reviewer identity + timestamp | E5 | FR-020 audit trail surfaced in the run history UI |

These contracts are captured as concrete, reviewable artifacts in `contracts/`:

- `contracts/ci-workflow-interface.md` (E2 → E4)
- `contracts/branch-protection-rule.md` (E4)
- `contracts/environment-protection-rules.md` (E3 + E5 + the `environment:` job-key contract)
