# Contract: Environment Protection Rules (`dev`, `qa`, `prod`)

**Location**: GitHub repository → **Settings → Environments → [environment name]**
**Not** declared in committed YAML (per spec Clarification Q1).
**Opt-in mechanism**: each deployment workflow job declares the matching environment via `environment: <name>` on the job (per spec Clarification Q2; FR-019a).
**FRs covered**: FR-013, FR-014, FR-015, FR-016, FR-017, FR-018, FR-019, FR-019a, FR-020.

## Per-environment configuration

### `dev`

| Setting | Value | FR |
|---|---|---|
| Environment name | `dev` | FR-013 |
| Required reviewers | ❌ none | FR-013 |
| Wait timer | `0` minutes | FR-013 |
| Deployment branches | `Selected branches: main` (recommended) | reinforces FR-009 |
| Environment secrets | (operational; out of scope) | — |

### `qa`

| Setting | Value | FR |
|---|---|---|
| Environment name | `qa` | FR-014 |
| Required reviewers | ✅ enabled, **1** reviewer required, from a defined user/team list | FR-014 |
| Prevent self-review | optional (team choice; recommended ✅) | spec Edge Case "approver is also the PR author" |
| Wait timer | `0` minutes | — |
| Deployment branches | `Selected branches: main` (recommended) | reinforces FR-009 |

### `prod`

| Setting | Value | FR |
|---|---|---|
| Environment name | `prod` | FR-015 |
| Required reviewers | ✅ enabled, **2** reviewers required, from a defined user/team list | FR-015 |
| **Prevent self-review** | ✅ enabled | spec Assumption + research.md §R7 |
| **Wait timer** | **5** minutes | FR-016 |
| Deployment branches | `Selected branches: main` (recommended) | reinforces FR-009 |
| Administrators can bypass protection rules | ❌ disabled | spec Assumption (no admin bypass) |

## Invariants (apply to all environments)

| # | Invariant | Why / FR |
|---|---|---|
| P1 | Environments named exactly `dev`, `qa`, `prod` MUST exist. | FR-013, FR-014, FR-015. Workflow jobs match by exact string. |
| P2 | `dev` MUST have zero required reviewers and zero wait timer. | FR-013; the whole point is fast feedback. |
| P3 | `qa` MUST require exactly 1 reviewer. | FR-014 |
| P4 | `prod` MUST require exactly 2 distinct reviewers AND a 5-minute wait timer. | FR-015, FR-016 |
| P5 | Approvals at one environment MUST NOT satisfy another. | FR-017 (enforced by GitHub: approvals are scoped to `(environment, run)`). |
| P6 | Re-running a deployment job MUST re-trigger approvals + timer. | FR-018 (enforced by GitHub: re-runs are new attempts). |
| P7 | Authorized users MUST be able to cancel a `prod` run during the 5-min wait window without any deployment occurring. | FR-019 (enforced by GitHub: cancellation precedes any step execution in the gated job). |
| P8 | Reviewer identity + approval timestamp MUST be visible in the run history. | FR-020, SC-005 (surfaced in the "Deployments" tab of the run). |

## Workflow-side contract (FR-019a)

Every deployment job that targets a protected environment MUST declare it on the job:

```yaml
jobs:
  deploy-to-prod:
    runs-on: ubuntu-latest
    environment: prod            # ← REQUIRED. Without this key, the gate is bypassed.
    steps:
      - uses: actions/checkout@v4
      # …deployment steps…
```

**Status of this contract in the current repository**: `.github/workflows/deploy-infra.yml` already declares
`environment: ${{ github.event.inputs.environment || 'dev' }}` on its `infra` job, which resolves to one of `dev`/`qa`/`prod`. **No code change is required by this feature** — the contract is satisfied today; it is documented here so it cannot regress unobserved. Future deployment workflows (e.g. a forthcoming `deploy-api.yml` or `deploy-web.yml`) MUST follow the same pattern.

### Invariants on the workflow side

| # | Invariant | Why / FR |
|---|---|---|
| W1 | Every job that deploys to dev/qa/prod MUST set `environment:` to the matching name. | FR-019a — without it, protection rules are silently skipped. |
| W2 | The value of `environment:` MUST resolve to one of `dev`, `qa`, `prod` exactly (case-sensitive). | P1 invariant; case mismatch creates a new, unprotected environment. |
| W3 | A workflow MUST NOT attempt to bypass approvals by, e.g., calling the GitHub API to self-approve a run. | Constitution I (Security-First); FR-014/FR-015 intent. |

## Verification (how to test the combined contract)

| Test | Expected result | Maps to |
|---|---|---|
| Trigger a deployment to `dev`. | Job runs immediately, no approval prompt. | US2 Scenario 1; FR-013 |
| Trigger a deployment to `qa`. | Job pauses "Waiting for review"; one approver from the list approves; job proceeds. | US2 Scenarios 2–3; FR-014 |
| Trigger a deployment to `prod`. | Job pauses awaiting **two distinct** approvers from the list; triggering user cannot self-approve. | US2 Scenario 4; FR-015 |
| After 2 prod approvals, observe the wait state. | Workflow waits 5 minutes; can be cancelled during the wait; cancellation leaves target unchanged. | US2 Scenarios 5–6; FR-016, FR-019, SC-007 |
| Promote the same release candidate dev → qa → prod. | Each environment evaluates its own rules; qa approval does not satisfy prod. | US2 Scenario 7; FR-017 |
| Re-run a previously successful `prod` deployment. | Approvals + wait timer requested again. | FR-018 |
| Audit a past `prod` deployment in the run UI. | Both approvers, the wait-timer start/end, and the deploy step start are visible with timestamps. | FR-020, SC-005 |
| Inspect Settings → Environments → `prod`. | Configuration matches the `prod` table above. | US3 Scenario 2 |

## Optional: machine-readable representation (for IaC, informational only)

If the team chooses to manage Environments via the REST API (`PUT /repos/{owner}/{repo}/environments/{env}`) or Terraform `github_repository_environment`, the equivalent shapes are:

```json
// prod
{
  "wait_timer": 5,
  "prevent_self_review": true,
  "reviewers": [
    { "type": "User", "id": "<reviewer-id-1>" },
    { "type": "User", "id": "<reviewer-id-2>" }
  ],
  "deployment_branch_policy": { "protected_branches": false, "custom_branch_policies": true }
}
```

```json
// qa
{
  "wait_timer": 0,
  "reviewers": [ { "type": "Team", "id": "<qa-reviewers-team-id>" } ],
  "deployment_branch_policy": { "protected_branches": false, "custom_branch_policies": true }
}
```

```json
// dev
{
  "wait_timer": 0,
  "reviewers": [],
  "deployment_branch_policy": null
}
```

Authoritative configuration remains the Settings UI (Clarification Q1); these snippets exist only to make the contract precise.
