# CI/CD Quality Gates

This repository protects the `main` branch and tiered deployment environments with a
combination of a CI workflow and GitHub repository **Settings** rules. This page is
the contributor-facing summary; for the authoritative contracts, see
[`specs/002-cicd-quality-gates/contracts/`](../specs/002-cicd-quality-gates/contracts/).

## 1. Pre-merge gate — `.github/workflows/ci.yml`

Triggers on every pull request whose base is `main`. The workflow has a **single job
named `ci`** (load-bearing string — see warning below) which:

1. Checks out the PR head.
2. Sets up Node 20 and runs `npm ci`, `npm run build`, `npm test --if-present` in
   `src/ai-genius-web/`.
3. Sets up .NET 9 and runs `dotnet build` on `src/ai-genius-api/ai-genius-api.csproj`,
   then `dotnet test` on the solution.

The job has `timeout-minutes: 15` so a hung run cannot block merges indefinitely.
No secrets are referenced and only first-party `actions/*` Actions are used
(Constitution IV — Simplicity).

> ⚠️ **Do not rename the `ci` job.** The branch-protection rule on `main` binds to
> the literal lowercase string `ci` as a required status check. Renaming the job
> silently disables the gate. See contract invariants C1 + B1 + B5.

Authoritative contract: [`ci-workflow-interface.md`](../specs/002-cicd-quality-gates/contracts/ci-workflow-interface.md).

## 2. Branch protection on `main` (GitHub Settings → Branches)

Configured **in repository Settings**, not in a committed YAML file (per spec
Clarification Q1). The rule for `main` enforces:

- Require a pull request before merging, with **1 approving review**.
- Dismiss stale approvals on new commits.
- Require status checks to pass — required check: **`ci`** (exact match to the
  job name above).
- No bypasses, no force pushes, no deletions.

Authoritative contract: [`branch-protection-rule.md`](../specs/002-cicd-quality-gates/contracts/branch-protection-rule.md).

## 3. Deployment environments (GitHub Settings → Environments)

`.github/workflows/deploy-infra.yml`'s `infra` job declares
`environment: ${{ github.event.inputs.environment || 'dev' }}`, which lets GitHub
apply per-environment protection rules:

| Environment | Required reviewers | Wait timer | Notes |
|-------------|-------------------:|-----------:|-------|
| `dev`       | 0                  | 0 min      | Auto-deploys. |
| `qa`        | 1                  | 0 min      | One approver from the reviewer list. |
| `prod`      | 2 (distinct)       | 5 min      | Self-review prevented; admin bypass disabled. |

Authoritative contract: [`environment-protection-rules.md`](../specs/002-cicd-quality-gates/contracts/environment-protection-rules.md).

## Where to find more

- Feature spec: [`specs/002-cicd-quality-gates/spec.md`](../specs/002-cicd-quality-gates/spec.md)
- Plan: [`specs/002-cicd-quality-gates/plan.md`](../specs/002-cicd-quality-gates/plan.md)
- Verification walk-through: [`specs/002-cicd-quality-gates/quickstart.md`](../specs/002-cicd-quality-gates/quickstart.md)
