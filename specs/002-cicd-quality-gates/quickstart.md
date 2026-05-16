# Quickstart: CI/CD Quality Gates and Deployment Approvals

**Feature**: 002-cicd-quality-gates
**Audience**: Engineer implementing this feature, or maintainer verifying it after rollout.

This quickstart walks you end-to-end from "nothing in place" to "all FRs verified". It assumes you have:

- Admin (or equivalent) access to the `qkfang/ai-genius-s4-ep2-speckit` repository's Settings.
- Local clone of the repo on the `002-quality-gates-and` branch.
- `git`, Node.js ≥18, .NET 9 SDK, and `gh` CLI installed locally for the optional verification steps.

---

## Step 1 — Add the CI workflow file (committed)

Create `.github/workflows/ci.yml` with the contents specified in [`contracts/ci-workflow-interface.md`](contracts/ci-workflow-interface.md). Key points:

- The single job MUST be named `ci`.
- Triggered only on `pull_request` to `main`.
- Build + test the frontend (`src/ai-genius-web`) and the API (`src/ai-genius-api`).
- `timeout-minutes: 15`.

Commit, push, and open a PR against `main` to verify the workflow runs and reports a `ci` status check on the PR.

✅ **Satisfies**: FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008.

---

## Step 2 — Configure branch protection on `main` (Settings)

In the GitHub UI: **Settings → Branches → Add branch protection rule** (or edit the existing rule for `main`).

Match every row in [`contracts/branch-protection-rule.md`](contracts/branch-protection-rule.md). The critical inputs are:

- Branch name pattern: `main`
- ✅ Require a pull request before merging → Required approvals = **1**
- ✅ Dismiss stale pull request approvals when new commits are pushed (recommended)
- ✅ Require status checks to pass before merging → add **`ci`** to the required-checks list (the name must match Step 1 exactly)
- ✅ Do not allow bypassing the above settings

Save.

✅ **Satisfies**: FR-009, FR-010, FR-011, FR-012.

---

## Step 3 — Configure the three environments (Settings)

In the GitHub UI: **Settings → Environments**. For each environment, create it if missing and configure exactly as specified in [`contracts/environment-protection-rules.md`](contracts/environment-protection-rules.md):

| Environment | Required reviewers | Wait timer | Notes |
|---|---|---|---|
| `dev` | 0 | 0 min | Restrict deployments to `main` (recommended) |
| `qa` | 1 (from reviewer list) | 0 min | Restrict deployments to `main` (recommended) |
| `prod` | 2 (from reviewer list) | **5 min** | ✅ Prevent self-review; admins NOT allowed to bypass |

Add the appropriate users/teams to the reviewer lists for `qa` and `prod`. (The specific roster is operational; the spec only requires that a non-empty list exists.)

✅ **Satisfies**: FR-013, FR-014, FR-015, FR-016, FR-017, FR-018, FR-019.

---

## Step 4 — Verify the deployment workflow opts in correctly

Open `.github/workflows/deploy-infra.yml` and confirm the deployment job declares `environment:`:

```yaml
jobs:
  infra:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment || 'dev' }}   # ← this line is the contract
```

This is **already present** as of the start of this feature — no change is required. The role of this step is to verify the existing contract has not regressed and to document it so future deployment workflows (`deploy-api`, `deploy-web`, etc.) follow the same pattern.

For any new deployment job added later, set `environment:` to `dev`, `qa`, or `prod` exactly (case-sensitive).

✅ **Satisfies**: FR-019a (and is the on-ramp for FR-013/014/015/016 to take effect at runtime).

---

## Step 5 — Verify the full feature end-to-end

Run each of these checks. They map 1:1 to the spec's acceptance scenarios.

### 5.1 PR-gated CI (User Story 1)

| What to do | Expected outcome | Spec reference |
|---|---|---|
| Open a PR to `main` that contains a deliberately failing test or build error. | The PR's `ci` check goes red; merge button is disabled with reason "Required statuses must pass". | US1 #2 |
| Open a PR to `main` with passing CI but no review. | Merge button disabled with reason "At least 1 approving review is required". | US1 #3 |
| Open a PR with passing CI and one approving review. | Merge button enabled; merge succeeds. | US1 #4 |
| `git push origin HEAD:main` directly. | Push rejected by the protected-branch hook. | US1 #5, SC-002 |

### 5.2 Tiered deployment approvals (User Story 2)

| What to do | Expected outcome | Spec reference |
|---|---|---|
| Trigger `deploy-infra.yml` with `environment: dev`. | Deploys immediately with no prompt. | US2 #1, FR-013 |
| Trigger with `environment: qa`. | Job pauses "Waiting for review"; one listed approver approves; job proceeds. | US2 #2–3, FR-014 |
| Trigger with `environment: prod`. | Job pauses; two distinct listed approvers must approve (triggering user cannot self-approve). | US2 #4, FR-015 |
| After 2 prod approvals are recorded. | Run shows a 5-minute wait; can be cancelled during the wait without any prod change. | US2 #5, FR-016, FR-019, SC-007 |
| Wait 5 minutes without cancelling. | Deployment steps run. | US2 #6 |
| Promote same release through dev → qa → prod. | Each environment evaluates rules independently; qa approval does not satisfy prod. | US2 #7, FR-017 |
| Re-run a previously successful prod deployment. | Approvals + 5-min timer requested again. | FR-018 |

### 5.3 Visible, auditable enforcement (User Story 3)

| What to do | Expected outcome | Spec reference |
|---|---|---|
| Inspect Settings → Branches → `main`. | All rows in `contracts/branch-protection-rule.md` match. | US3 #1 |
| Inspect Settings → Environments → `prod`. | Required reviewers ≥ 2, wait timer = 5 min, self-review prevented. | US3 #2 |
| Open the workflow run history for a past `prod` deployment. | Approver identities and approval timestamps are visible. | FR-020, SC-005 |

---

## Step 6 — Success-criteria sanity check (post-rollout)

After this feature has been live for a representative period, confirm the measurable outcomes:

- **SC-001**: Sample 10 recent merges to `main`; 100% have a successful `ci` run and ≥1 approving review attached.
- **SC-002**: Repo audit log shows 0 direct pushes to `main`.
- **SC-003 / SC-004**: Sample recent `qa` and `prod` deploy runs; reviewer counts and wait-time-elapsed match spec.
- **SC-005**: Pick any prod deployment from the past 90 days; can you find approver + timestamp within 2 minutes? Yes via the run's "Deployments" tab.
- **SC-006**: Median PR CI duration ≤ team's existing CI budget; check the workflow run "Total duration" field.
- **SC-007**: At least one drill (e.g. trigger a prod deploy, then cancel during the 5-min wait) confirms cancellation works as designed.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| PR merge button is enabled despite a failing build. | The `ci` status check name in the branch protection rule does not match the job name in `ci.yml`. | Re-check both; they must match exactly (lowercase `ci`). |
| Deploy to `qa` or `prod` proceeds without prompting for approval. | The job is missing the `environment:` key, or the value doesn't match an existing environment name. | Add `environment: qa` / `environment: prod` exactly. |
| A reviewer approval at `qa` seemed to satisfy `prod`. | Misreading the UI — each environment is independent (FR-017). Confirm by inspecting the run's Deployments tab; `prod` will still show "Waiting for review". | No fix needed; behaviour is correct. |
| Admins can still push to `main`. | "Do not allow bypassing the above settings" is off. | Enable it (FR-012). |
| A prod re-run skipped approvals. | Should not happen — GitHub treats re-runs as new attempts. Verify by inspecting "Deployments" for the re-run. | File a platform issue if reproduced. |
