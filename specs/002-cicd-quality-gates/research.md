# Phase 0 Research: CI/CD Quality Gates and Deployment Approvals

**Feature**: 002-cicd-quality-gates
**Date**: 2026-05-16
**Status**: All spec clarifications already resolved (see spec.md → Clarifications). This document records the remaining technical decisions for the implementation plan.

---

## R1. Where to express branch protection and environment protection rules

**Decision**: Configure both branch protection (on `main`) and environment protection (on `dev`/`qa`/`prod`) via **GitHub repository Settings UI** (or equivalently the GitHub REST API / Terraform GitHub provider). Do **not** declare any of these rules in committed workflow YAML.

**Rationale**:
- Spec Clarification 2026-05-16 (Q1) explicitly fixes this answer: "In GitHub repository Settings (not in workflow YAML files); workflow files do not declare or enforce these rules."
- GitHub Actions workflow YAML has **no syntax** to express "branch protection requires this check" or "this environment requires 2 reviewers" — those properties exist only on the GitHub Settings side.
- Keeps the workflow file focused on a single responsibility: "how to build and test", per the Simplicity principle.

**Alternatives considered**:
- _Terraform GitHub provider_ — viable for replicating rules across many repos, but adds a third-party dependency (Terraform + provider) for a one-repo, one-time configuration. Rejected per Simplicity. Documented as a future option if the org standardises on IaC for GitHub Settings.
- _Embedding rules in workflow YAML_ — impossible (no schema exists) and rejected by Q1.

---

## R2. How a deployment job opts into an environment's protection rules

**Decision**: Each job that deploys to `dev`/`qa`/`prod` declares the matching environment via the `environment:` key on the job (e.g. `environment: dev`, `environment: qa`, `environment: prod`). GitHub Actions then evaluates the environment's reviewers + wait-timer settings before running the job's steps.

**Rationale**:
- Spec Clarification 2026-05-16 (Q2) fixes this answer.
- This is the single, documented mechanism by which GitHub Actions ties a workflow job to environment protection rules.
- The existing `.github/workflows/deploy-infra.yml` already does this: `environment: ${{ github.event.inputs.environment || 'dev' }}` on its `infra` job. **No change is required** to that file for FR-019a; the plan only **confirms and documents** the contract.

**Alternatives considered**:
- _Custom action that calls the GitHub API to verify approvals_ — duplicates a built-in platform feature, introduces secrets handling. Rejected per Simplicity (Constitution IV).
- _Manual `workflow_dispatch` confirmation prompts_ — not enforceable, no audit trail, doesn't satisfy FR-014 / FR-015 / FR-020. Rejected.

---

## R3. Naming the required status check (FR-007 stability)

**Decision**: Use a single GitHub Actions job named `ci` inside `.github/workflows/ci.yml`. The status check that branch protection references will therefore be exactly `ci`. Frontend and API are run as **sequential steps within the same `ci` job** so there is one stable check name to wire into branch protection.

**Rationale**:
- Branch protection rules reference status checks **by name**. If the name changes, the rule silently stops being enforced — a known footgun.
- A single job with steps `build-web → build-api → test-api` gives one obvious check (`ci`) and one obvious failure surface for reviewers.
- Splitting into two jobs (`ci-web`, `ci-api`) would require listing **both** in branch protection and would let merges through if one job's name changed. Rejected per "stable, named status check (or set of checks)" in FR-007 — single name is the simplest stable contract.
- Frontend build (`npm run build`) and API build/test (`dotnet build` / `dotnet test`) are fast enough on `ubuntu-latest` (each well under 5 min on a clean Node/.NET image) that sequencing them in one job stays comfortably inside the 10-minute SC-006 budget.

**Alternatives considered**:
- _Matrix strategy over `[web, api]`_ — generates dynamic check names like `ci (web)` and `ci (api)`; both must be added to branch protection independently, and matrix changes can rename the checks. Rejected per FR-007 stability.
- _Parallel jobs with a `ci-success` aggregator job_ — adds a third job whose only purpose is to wait on the other two. Over-engineering for two short builds; rejected per Simplicity.

---

## R4. Handling the "test command may not exist yet" gap

**Decision**:
- For the API, invoke `dotnet test src/ai-genius-api/` at the solution root (or on the existing `ai-genius-s4-ep2-speckit.sln`). `dotnet test` exits 0 when no test project is discovered, so this satisfies FR-006 today and automatically picks up test projects when they are added.
- For the frontend, invoke `npm run build --prefix src/ai-genius-web` (FR-003, satisfies Constitution V "frontend MUST build cleanly") and add `npm test --if-present --prefix src/ai-genius-web` (FR-005); `--if-present` causes the command to succeed silently if no `test` script is defined yet.

**Rationale**:
- Spec Assumption: "The AI Genius repository already has buildable frontend and API components with executable test commands; this feature wires them into CI but does not introduce missing tests." The decision honours that assumption: we wire the commands; we do not author tests.
- `--if-present` and `dotnet test`'s no-op-on-empty behaviour are documented, stable, first-party features — no third-party tooling needed (Simplicity).
- Constitution V is satisfied today by `npm run build` failing on any frontend error; FR-005 / FR-006 are satisfied today by the presence and wiring of test commands; both ratchet up the moment real tests are committed.

**Alternatives considered**:
- _Block this feature until tests exist_ — contradicts the spec's explicit Assumption and prevents the much higher-value branch/environment protection from shipping. Rejected.
- _Mark FR-005 / FR-006 as NEEDS CLARIFICATION_ — no clarification is needed; the spec already addresses the gap in Assumptions. Rejected.

---

## R5. Required CI triggers (FR-002)

**Decision**: Trigger `ci.yml` on:

```yaml
on:
  pull_request:
    branches: [main]
```

This fires for `opened`, `synchronize` (new commits pushed to PR), and `reopened` by default — covering "every pull request whose base branch is `main`, including when new commits are pushed to an existing PR" (FR-002).

**Rationale**: GitHub's default `pull_request` activity types are exactly the set required by FR-002. Listing them explicitly would add no protection and would risk drift if the spec's wording changes.

**Alternatives considered**:
- Adding `push: branches: [main]` — duplicates work (post-merge CI provides no merge-blocking value because the merge already happened). Rejected per Simplicity.
- Adding `workflow_dispatch` — not required by spec; rejected per Simplicity. Can be added later without breaking the required-check contract.

---

## R6. CI workflow timeout (FR-008)

**Decision**: Set `timeout-minutes: 15` on the `ci` job. Branch protection treats a cancelled/timed-out check as "not passing", so a hung run cannot block merges silently — it surfaces as a failure.

**Rationale**: 15 min is comfortably above the 10-min SC-006 target and below any reasonable definition of "hung", consistent with the Edge Case "Long-running tests or flaky tests" in the spec.

**Alternatives considered**: GitHub's default 360-minute job timeout — far too long; a flaky run could block PRs for hours. Rejected.

---

## R7. Self-approval policy for `prod`

**Decision**: In the `prod` GitHub Environment, **disable** "Allow administrators to bypass configured protection rules" and **enable** "Prevent self-review" (i.e. the user who triggered the deployment cannot count toward the 2 required approvers).

**Rationale**: Spec Assumption explicitly defaults to "self-approval for environment deployments is disallowed by default at `prod`". This is a single checkbox in the environment settings — no workflow change needed.

**Alternatives considered**: Allow self-review (faster releases when only one human is available) — rejected because it defeats the purpose of FR-015's two-distinct-reviewers requirement and weakens SC-004.

---

## Summary: No remaining NEEDS CLARIFICATION

| Area | Status |
|---|---|
| Where rules live (Settings vs YAML) | ✅ Resolved by spec clarification Q1 |
| How jobs opt into environment gates | ✅ Resolved by spec clarification Q2 |
| Required check name strategy | ✅ Resolved here (R3): single job named `ci` |
| Test command gap | ✅ Resolved here (R4): use `--if-present` / `dotnet test` no-op |
| Triggers | ✅ Resolved here (R5): `pull_request` to `main` |
| Timeout | ✅ Resolved here (R6): 15 min |
| Self-approval at `prod` | ✅ Resolved here (R7): disabled per Assumption |

Phase 0 complete — proceed to Phase 1 design artifacts.
