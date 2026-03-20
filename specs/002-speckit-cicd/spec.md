---
feature: 002-speckit-cicd
risk: medium
breaking: false
reviewer-team: spec-reviewer
---

# Spec: Spec-Driven CI/CD Controls

## Summary

Add spec-driven CI/CD controls to the AI Genius repository. The pipeline must enforce
that every pull request to `main` is accompanied by a structured spec artifact, exposes
risk and breaking-change metadata from that spec, and gates promotion based on risk level.

---

## Requirements

### R1 — Spec Presence Gate

- Any PR whose branch name starts with `NNN-` (a numeric prefix followed by a hyphen)
  **must** include a file at `specs/NNN-<name>/spec.md`.
- If the spec file is absent, the PR check fails and the merge is blocked.
- Branches that do not follow the `NNN-` naming convention are skipped (the check passes
  automatically).
- The feature ID is the leading digit sequence; e.g. branch `002-speckit-cicd` →
  feature ID `002`.

### R2 — Spec Metadata Extraction

- The pipeline reads the YAML front-matter of `spec.md` to extract:
  - `risk`: one of `low`, `medium`, `high`. Defaults to `medium` if absent.
  - `breaking`: boolean (`true` or `false`). Defaults to `false` if absent.
- Extracted values are surfaced as a job summary table visible in the Actions UI.
- A `breaking: true` value emits a warning annotation on the PR.

### R3 — Spec Summary Artifact

- On every PR, a plain-text file `spec-summary.txt` is generated and uploaded as a
  GitHub Actions artifact (retained 30 days).
- The artifact includes: branch name, PR title, spec title, risk level, breaking-change
  flag, spec file path, generation timestamp, and the full spec content.

### R4 — High-Risk Promotion Gate

- A PR with `risk: high` must **not** merge until the `spec-reviewer` team has approved.
- The CI check exits with a non-zero status when risk is `high`, preventing the
  auto-merge path.
- `risk: low` and `risk: medium` pass the gate automatically.

---

## Out of Scope

- Modifying existing `ci.yml` or `deploy.yml` workflows (beyond path corrections).
- Automatic JIRA/issue linking.
- Multi-environment promotion sequences.

---

## Acceptance Criteria

| ID | Criterion |
|----|-----------|
| AC1 | A PR on branch `002-speckit-cicd` with `specs/002-speckit-cicd/spec.md` passes the spec-presence check. |
| AC2 | A PR on branch `003-no-spec` (no matching spec file) fails the spec-presence check. |
| AC3 | A PR on branch `feature/no-number` skips the spec-presence check and passes. |
| AC4 | The Actions job summary shows a metadata table with risk and breaking-change values. |
| AC5 | A `breaking: true` spec emits a warning annotation in the workflow run. |
| AC6 | A `spec-summary-pr-NNN.zip` artifact is present on every PR run. |
| AC7 | A PR with `risk: high` fails the promotion-gate check. |
| AC8 | A PR with `risk: medium` passes the promotion-gate check. |
