# Contract: Branch Protection Rule on `main`

**Location**: GitHub repository → **Settings → Branches → Branch protection rules → `main`**
**Not** declared in committed YAML (per spec Clarification Q1).
**FRs covered**: FR-007 (consumer), FR-009, FR-010, FR-011, FR-012.

## Required configuration

| Setting | Value | FR |
|---|---|---|
| **Branch name pattern** | `main` | — |
| **Require a pull request before merging** | ✅ enabled | FR-009 |
| &nbsp;&nbsp;&nbsp; Required approvals | `1` | FR-011 |
| &nbsp;&nbsp;&nbsp; Dismiss stale pull request approvals when new commits are pushed | ✅ enabled (recommended) | Edge Case "force-push to a PR branch after approval" |
| &nbsp;&nbsp;&nbsp; Require approval of the most recent reviewable push | ✅ enabled (recommended) | reinforces FR-011 |
| **Require status checks to pass before merging** | ✅ enabled | FR-010 |
| &nbsp;&nbsp;&nbsp; Require branches to be up to date before merging | optional (team choice) | — |
| &nbsp;&nbsp;&nbsp; **Status checks that are required** | `ci` (exact match — see `ci-workflow-interface.md` §C1) | FR-007, FR-010 |
| **Require conversation resolution before merging** | optional (team choice) | — |
| **Require signed commits** | optional | — |
| **Require linear history** | optional | — |
| **Do not allow bypassing the above settings** | ✅ enabled | FR-012 (spec default = no admin bypass) |
| **Restrict who can push to matching branches** | not applicable (the rule above already forbids direct pushes; this is for fine-grained allow-lists) | — |
| **Allow force pushes** | ❌ disabled | preserves audit history; reinforces Edge Case 2 |
| **Allow deletions** | ❌ disabled | protects `main` |

## Invariants

| # | Invariant | Why |
|---|---|---|
| B1 | The "Required status checks" list MUST contain the literal string `ci`. | This is the binding contract with `ci-workflow-interface.md`. A typo or rename here = the gate silently stops applying. |
| B2 | "Do not allow bypassing the above settings" MUST stay enabled unless an explicit, documented exemption exists. | FR-012; spec default. |
| B3 | "Require approvals" count MUST be ≥ 1. | FR-011 (one approving review required to merge). |
| B4 | Direct pushes to `main` MUST be rejected for **all** contributors covered by the rule, including administrators. | FR-009 + FR-012 + SC-002 ("0 direct pushes to `main` succeed"). |
| B5 | If the `ci` job in `.github/workflows/ci.yml` is ever renamed, this rule MUST be updated in the same change. | Edge Case 1: "missing = failing"; a stale required-check name renders the gate effectively absent. |

## Verification (how to test this contract is in place)

| Test | Expected result | Maps to |
|---|---|---|
| Open a PR to `main` with a deliberately failing build. | Merge button disabled; reason "Required statuses must pass before merging — `ci` failing". | US1 Scenario 2; SC-001 |
| Open a PR to `main` with passing CI but **no** review. | Merge button disabled; reason "At least 1 approving review is required". | US1 Scenario 3 |
| Open a PR to `main` with passing CI and 1 approving review. | Merge button enabled; merge succeeds. | US1 Scenario 4 |
| `git push origin HEAD:main` directly. | Push rejected: `protected branch hook declined`. | US1 Scenario 5; SC-002 |
| Inspect the rule UI as an authorized user. | All rows in the table above show the FR-aligned values. | US3 Scenario 1 |

## Optional: machine-readable representation (for IaC, informational only)

If the team chooses to manage Settings via the GitHub REST API or Terraform `github_branch_protection`, the equivalent payload is:

```json
{
  "required_status_checks": {
    "strict": false,
    "contexts": ["ci"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_last_push_approval": true
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
```

This block is illustrative — the **authoritative** configuration is the GitHub Settings UI per spec Clarification Q1.
