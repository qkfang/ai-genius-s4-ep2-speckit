# Research: Multi-Environment Bicep Pipeline

> Phase 0 output for `004-multi-env-quality-gates`.

---

## 1. Bicep "Plan" Equivalent

**Decision**: Use `az deployment group what-if` as the plan stage.

**Rationale**: `what-if` produces a diff of resource changes (add / modify /
delete / no-change) without executing them — exactly the role Terraform `plan`
plays.  It is a first-class Azure CLI command, requires no extra tooling, and
its output is surfaced in the Actions log for reviewer inspection before
`deploy-*` jobs run.

**Alternatives considered**:
- *Terraform*: rejected — project is Bicep-only (Constitution II).
- *Bicep linter only*: rejected — linting does not show what-if resource delta.
- *Skip plan stage*: rejected — reviewers need the diff to approve qa/prod gates.

---

## 2. Approval Gates

**Decision**: Use GitHub **Environment protection rules** (required reviewers)
configured in *Settings → Environments*, not in workflow YAML.

**Rationale**: GitHub natively blocks job execution when the referenced
`environment:` has pending required-reviewer approvals.  Workflow YAML only
declares `environment: qa` / `environment: prod`; the gate logic lives in
GitHub Settings.  This is the canonical, zero-dependency pattern.

**Alternatives considered**:
- *`if: github.ref == 'refs/heads/main'` gate*: rejected — does not pause for
  human review.
- *Third-party approval actions* (e.g., `trstringer/manual-approval`): rejected
  — violates Constitution IV (Simplicity; prefer built-ins).

---

## 3. Concurrency Pattern

**Decision**: Reuse the existing pattern from `001-deploy-infra.yml`:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

**Rationale**: Prevents concurrent runs on the same PR branch from racing each
other.  Cancelling in-progress keeps the queue lean and fast.

---

## 4. Parameter File Strategy

**Decision**: One `parameters.<env>.json` per environment, committed to
`bicep/`.

**Rationale**: All values are non-secret (SKU names, app names, environment
tags).  Committing them alongside the Bicep templates keeps the full
infrastructure definition in source control and auditable.  Secrets
(`AZURE_CREDENTIALS`) stay in GitHub Secrets.

**Alternatives considered**:
- *Single file with environment variable substitution*: rejected — harder to
  audit; increases workflow complexity.
- *GitHub Variables per environment*: rejected — SKU values are infra
  decisions, not deployment-time config; belong in source control.

---

## 5. Branch Protection

**Decision**: Enforce `main` branch protection via GitHub repo
*Settings → Branches*, not in any workflow file.

**Rules to enable**:
- Require pull request reviews before merging (1 approver).
- Require status checks to pass before merging — add the `validate` job as a
  required check.
- Do not allow bypassing the above settings.

**Rationale**: Branch protection is a repository-level setting.  Workflow files
cannot configure it; attempting to do so via the API would require admin
credentials in CI, which violates Constitution I (Security-First).
