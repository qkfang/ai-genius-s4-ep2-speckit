# Feature Specification: CI/CD Quality Gates and Deployment Approvals

**Feature Branch**: `002-quality-gates-and`  
**Spec Directory**: `specs/002-cicd-quality-gates`  
**Created**: 2026-05-16  
**Status**: Draft  
**Input**: User description: "Add quality gates and deployment approvals to the AI Genius CI/CD pipeline. Update the GitHub Actions workflows to include a CI workflow (.github/workflows/ci.yml) that runs on every pull request to main; it builds the frontend and API, runs tests. Branch protection on main: require PR, require passing CI checks, require code review before merge. GitHub environment protection rules — dev: auto-deploy (no gates); qa: 1 required reviewer; prod: 2 required reviewers + 5-minute wait timer."

## Clarifications

### Session 2026-05-16

- Q: Where are branch protection rules and environment protection rules configured? → A: In GitHub repository Settings (not in workflow YAML files); workflow files do not declare or enforce these rules.
- Q: How do deployment workflows opt a job into a protected environment's approval gate? → A: By adding an `environment:` key to the deployment job (e.g. `environment: production`), which causes GitHub Actions to evaluate the corresponding GitHub Environment's protection rules before running the job's steps.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Catch defects before merge with PR-gated CI (Priority: P1)

As a developer contributing to the AI Genius project, when I open or update a pull request that targets the `main` branch, an automated pipeline must build the frontend and the API, then run their test suites. The pull request cannot be merged into `main` until the CI pipeline reports success and at least one teammate has approved the change.

**Why this priority**: Without this gate, broken code or failing tests can reach `main` and propagate to every downstream environment. This is the foundational quality control that all other deployment safeguards depend on — it is what makes "the code on main is always green" a reliable assumption for promotion to dev/qa/prod.

**Independent Test**: Can be fully validated by (a) opening a pull request that contains a deliberately failing test or build error and confirming the merge button is blocked, (b) opening a pull request with passing tests but no reviewer approval and confirming the merge button is blocked, and (c) opening a passing, reviewed pull request and confirming it can be merged. No deployment infrastructure changes are needed to verify this story.

**Acceptance Scenarios**:

1. **Given** a pull request targeting `main`, **When** the PR is opened or new commits are pushed to it, **Then** a CI run is automatically triggered that builds both the frontend and the API and runs the test suites for each.
2. **Given** a pull request in which CI is still running or has failed, **When** a maintainer attempts to merge it into `main`, **Then** the merge is blocked and the reason (failing or missing required check) is shown.
3. **Given** a pull request with a successful CI run but no approving review, **When** a maintainer attempts to merge it into `main`, **Then** the merge is blocked until the required review approval is recorded.
4. **Given** a pull request with a successful CI run and a recorded approving review, **When** a maintainer merges it, **Then** the merge into `main` succeeds.
5. **Given** any contributor (including repository administrators, unless explicitly exempted), **When** they try to push directly to `main` bypassing a pull request, **Then** the push is rejected.

---

### User Story 2 - Tiered deployment approvals across dev/qa/prod (Priority: P1)

As a release manager, I need each target environment to enforce an appropriate level of human oversight before code is deployed there. Deployments to `dev` should happen automatically so the team gets fast feedback. Deployments to `qa` should require one reviewer to confirm the build is ready for validation. Deployments to `prod` should require two reviewers and a short cool-off period so an accidental approval can still be cancelled before it takes effect.

**Why this priority**: The whole point of having multiple environments is to introduce graduated risk. Without enforced approvals at qa and prod, the pipeline degrades into "auto-deploy everywhere," which is exactly the failure mode this work exists to prevent. The tiered model also documents accountability: every prod release has at least two named approvers attached to it.

**Independent Test**: Can be fully validated by triggering a deployment workflow run for each environment from a known-good build and confirming: dev proceeds without prompts; qa pauses awaiting one approver and proceeds only after approval is granted; prod pauses awaiting two distinct approvers, then enforces a wait period before the deployment job actually runs, with the ability to cancel during the wait.

**Acceptance Scenarios**:

1. **Given** a successful CI build on `main`, **When** a deployment to the `dev` environment is triggered, **Then** the deployment proceeds without any manual approval prompt.
2. **Given** a deployment to the `qa` environment is triggered, **When** the workflow reaches the `qa` job, **Then** the job pauses in a "waiting for approval" state and does not execute the deployment steps until at least one authorized reviewer approves it.
3. **Given** a `qa` deployment awaiting approval, **When** a single authorized reviewer approves it, **Then** the deployment proceeds.
4. **Given** a deployment to the `prod` environment is triggered, **When** the workflow reaches the `prod` job, **Then** the job pauses requiring approval from two distinct authorized reviewers (the user who triggered the deployment cannot be one of the two if self-approval is disallowed).
5. **Given** a `prod` deployment has received both required approvals, **When** approvals are recorded, **Then** the workflow waits for a 5-minute timer before starting deployment steps, and the run can be cancelled by an authorized user during that wait without any production change occurring.
6. **Given** a `prod` deployment that has completed its 5-minute wait without being cancelled, **When** the timer elapses, **Then** the deployment steps execute.
7. **Given** the same release candidate, **When** it is promoted through dev → qa → prod, **Then** the approval requirements apply independently at each environment (qa approval does not satisfy prod).

---

### User Story 3 - Visible, auditable enforcement (Priority: P2)

As a maintainer or auditor, I need the enforcement of the rules above to be visible and inspectable: branch protection settings on `main`, required status check names, environment reviewer lists, and the wait timer must all be configured in the repository so that the rules apply uniformly to every contributor and every run — not just by convention.

**Why this priority**: The controls only have value if they are actually enforced by the platform, not just documented. This story ensures the configuration is present and discoverable, but it is P2 because it is a property of the same configuration that delivers User Stories 1 and 2 — once those are in place correctly, this is largely verification.

**Independent Test**: Can be validated by inspecting the repository's branch protection rules for `main` and the environment configurations for `dev`, `qa`, and `prod`, and confirming each rule from the Functional Requirements is present with the specified values.

**Acceptance Scenarios**:

1. **Given** the repository configuration, **When** an authorized user views the protection rule for `main`, **Then** "require pull request before merging", "require status checks to pass" (with the CI check listed as required), and "require approvals" are all enabled.
2. **Given** the repository configuration, **When** an authorized user views the `prod` environment, **Then** "required reviewers" lists at least two reviewers/teams and the wait timer is set to 5 minutes.

---

### Edge Cases

- **CI workflow itself fails to start** (e.g., misconfigured workflow file): the PR must remain unmergeable because the required check has not reported success — "missing" is treated the same as "failing", not as "pass".
- **Force-push to a PR branch after approval**: the approval state must be re-evaluated according to repository policy so a reviewed commit cannot be silently swapped for an unreviewed one before merge.
- **Approver is also the PR author or the deployment trigger**: self-approval rules must be defined so authors cannot single-handedly satisfy the review/approval requirement for prod.
- **Reviewer is unavailable**: prod's two-reviewer requirement must be satisfiable by a sufficiently large reviewer pool (team membership) so a single absence does not block all releases indefinitely.
- **Cancellation during the prod 5-minute wait**: an authorized user must be able to cancel the workflow run during the wait, and doing so must leave production unchanged.
- **Re-running a failed deployment**: re-running a previously approved prod deployment must re-trigger approvals and the wait timer rather than reusing prior approvals, so stale approvals cannot ship new content.
- **Repository administrators**: it must be decided and configured whether admins can bypass branch protection; the default for this feature is that admins are also subject to the protections (no bypass) to keep the audit trail consistent.
- **Long-running tests or flaky tests**: the CI workflow needs a reasonable timeout and clear failure reporting so a hung job does not block all merges indefinitely.

## Requirements *(mandatory)*

### Functional Requirements

#### Continuous Integration workflow

- **FR-001**: The repository MUST contain a CI workflow definition at `.github/workflows/ci.yml`.
- **FR-002**: The CI workflow MUST be triggered automatically on every pull request whose base branch is `main`, including when new commits are pushed to an existing PR.
- **FR-003**: The CI workflow MUST build the frontend component of the AI Genius application.
- **FR-004**: The CI workflow MUST build the API component of the AI Genius application.
- **FR-005**: The CI workflow MUST execute the automated test suite for the frontend and report a non-success status if any test fails.
- **FR-006**: The CI workflow MUST execute the automated test suite for the API and report a non-success status if any test fails.
- **FR-007**: The CI workflow MUST expose a stable, named status check (or set of checks) that branch protection can reference as required.
- **FR-008**: The CI workflow MUST complete (success or failure) within a bounded time and report failure rather than hanging indefinitely.

#### Branch protection on `main`

> Configuration location: All rules in this subsection are configured in **GitHub repository Settings → Branches → Branch protection rules** for `main`. They are NOT declared in workflow YAML files.

- **FR-009**: The `main` branch MUST be configured (via GitHub repository Settings) to require changes to arrive via a pull request — direct pushes MUST be rejected.
- **FR-010**: The `main` branch MUST be configured (via GitHub repository Settings) to require the CI status check from FR-007 to pass before a PR can be merged.
- **FR-011**: The `main` branch MUST be configured (via GitHub repository Settings) to require at least one approving code review before a PR can be merged.
- **FR-012**: The branch protection configuration MUST apply to all contributors by default; any exemption for administrators MUST be an explicit, documented choice (default for this feature: no bypass).

#### Environment protection rules

> Configuration location: All rules in this subsection are configured in **GitHub repository Settings → Environments** for each named environment. They are NOT declared in workflow YAML files. Deployment workflow jobs opt into these gates by adding an `environment:` key (e.g. `environment: production`) to the job; GitHub Actions then evaluates the matching environment's protection rules before running the job's steps.

- **FR-013**: A GitHub environment named `dev` MUST exist (configured via repository Settings → Environments) and MUST NOT impose any required reviewers or wait timer — deployments to `dev` proceed automatically.
- **FR-014**: A GitHub environment named `qa` MUST exist (configured via repository Settings → Environments) and MUST require exactly one approving reviewer from a defined reviewer list before a deployment job targeting it can run.
- **FR-015**: A GitHub environment named `prod` MUST exist (configured via repository Settings → Environments) and MUST require two distinct approving reviewers from a defined reviewer list before a deployment job targeting it can run.
- **FR-016**: The `prod` environment MUST enforce a wait timer of 5 minutes (configured via repository Settings → Environments) between the completion of required approvals and the start of deployment steps.
- **FR-017**: Approvals at one environment MUST NOT satisfy the approval requirement at another environment — each environment evaluates its rules independently per workflow run.
- **FR-018**: Re-running a deployment job for `qa` or `prod` MUST re-trigger the corresponding approval and wait-timer requirements rather than reusing prior approvals.
- **FR-019**: Authorized users MUST be able to cancel a `prod` deployment during its wait-timer window, and cancellation MUST leave the production deployment target unchanged.
- **FR-019a**: Each deployment workflow job that targets `dev`, `qa`, or `prod` MUST declare the corresponding GitHub Environment via an `environment:` key on the job (e.g. `environment: dev`, `environment: qa`, `environment: production`). This declaration is the mechanism by which the protection rules from FR-013–FR-016 are applied to that job; without it, the job will bypass the configured gates.

#### Auditability

- **FR-020**: The identity of each approver and the timestamps of approvals, wait-timer completion, and deployment start MUST be recorded in the workflow run history for `qa` and `prod` deployments.

### Key Entities

- **Pull Request to `main`**: A proposed change to the protected default branch. Carries attributes: source branch, head commit, CI check status, list of approving reviews, mergeable state.
- **CI Workflow Run**: An execution of `.github/workflows/ci.yml` tied to a specific PR head commit. Produces a pass/fail status that branch protection consumes.
- **Deployment Environment** (`dev`, `qa`, `prod`): A named target with protection rules — required reviewers (count + reviewer list) and a wait timer (duration in minutes) — that a workflow job must satisfy before its steps execute.
- **Approval**: A recorded decision by an authorized reviewer permitting a specific workflow run to proceed past an environment's gate; attributes include reviewer identity, timestamp, and the workflow run it applies to.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of pull requests merged into `main` after this feature ships have an associated CI run that completed successfully and at least one recorded approving review.
- **SC-002**: 0 direct pushes to `main` succeed after this feature ships (excluding any explicitly documented admin-bypass exemption, which defaults to none).
- **SC-003**: 100% of deployments to `qa` after this feature ships have at least one recorded approver in the workflow run history.
- **SC-004**: 100% of deployments to `prod` after this feature ships have at least two distinct recorded approvers and show an elapsed wait of at least 5 minutes between final approval and the start of deployment steps.
- **SC-005**: A reviewer can audit any production deployment from the past 90 days and identify, within 2 minutes, who approved it and when.
- **SC-006**: A new contributor opening their first PR receives automated CI feedback (pass or fail) within the team's existing CI duration budget, without any manual triggering step.
- **SC-007**: An accidentally approved prod deployment can be cancelled before it takes effect at least 95% of the time, because the 5-minute wait window provides a real opportunity to intervene.

## Assumptions

- The AI Genius repository already has buildable frontend and API components with executable test commands; this feature wires them into CI but does not introduce missing tests.
- The default branch is `main` (consistent with the repository today).
- GitHub Actions and GitHub Environments are the deployment platform; "environment protection rules" refers specifically to the GitHub Environments feature.
- Reviewer lists (who can approve qa and prod) are defined by the team via GitHub users or teams; the specific roster is an operational concern outside the scope of this spec.
- Repository administrators are subject to branch protection by default (no admin bypass) unless the team explicitly chooses otherwise during implementation.
- Self-approval for environment deployments is disallowed by default at `prod` (the user who triggered the deployment cannot count toward the two required approvers).
- The 5-minute wait timer on `prod` is the maximum value GitHub Environments allows to configure via the documented "wait timer" setting at the time of writing; if platform constraints change, the value remains 5 minutes per this spec.
- The existing deployment workflows already separate dev/qa/prod into distinct jobs (or can be straightforwardly refactored to do so) so that GitHub environment protections apply per environment.
- Branch protection rules for `main` and environment protection rules for `dev`/`qa`/`prod` are managed via the **GitHub repository Settings UI (or equivalent API/Terraform/IaC against the Settings API)**, not via committed workflow YAML. Workflow files only reference an environment by name via the `environment:` job key; they do not declare reviewers, wait timers, or branch protection requirements.
