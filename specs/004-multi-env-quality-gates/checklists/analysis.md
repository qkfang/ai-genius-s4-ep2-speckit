# Analysis Checklist: Multi-Environment Bicep Deployment Pipeline

**Purpose**: Requirements quality validation targeting five analysis findings (HIGH×2, MEDIUM×3) surfaced during feature review — artifact naming, constitution conflict, workflow YAML design, user story traceability, and prerequisite gaps.
**Created**: 2025-01-01
**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md) | [tasks.md](../tasks.md) | [contracts/workflow-contract.md](../contracts/workflow-contract.md)
**Audience**: PR reviewer (platform team)
**Depth**: Standard

---

## Artifact Naming Consistency

> Tests whether the workflow filename typo is consistently documented (or consistently wrong) across every spec artifact that references it.

- [x] CHK001 Is the workflow filename in `spec.md` Artifacts table (`004-multile-env-ci.yml`) a typo of the intended `004-multi-env-ci.yml`, and should the spec be the authoritative source correcting it? [Consistency, HIGH, Spec §Artifacts]
- [x] CHK002 Does the workflow filename referenced in `plan.md` Project Structure section match the corrected name `004-multi-env-ci.yml` across all occurrences (Summary, Project Structure, Implementation Tasks Summary, Notes)? [Consistency, HIGH, Plan §Project Structure]
- [x] CHK003 Do tasks T001, T008, and T022 in `tasks.md` each reference the corrected filename `004-multi-env-ci.yml` rather than the misspelled variant? [Consistency, HIGH, Tasks §T001/T008/T022]
- [x] CHK004 Does the workflow naming in all spec artifacts conform to the `###-verb-noun.yml` convention established in `AGENTS.md` — making `004-multi-env-ci.yml` (not `004-multile-env-ci.yml`) the canonical name? [Consistency, HIGH, AGENTS.md §Workflow Files]

---

## Constitution Principle III Conflict

> Tests whether the intentional deviation from "fully automated; no manual steps in the happy path" is acknowledged, justified, and formally documented in spec.md — not just implicitly accepted in plan.md and research.md.

- [x] CHK005 Does `spec.md` explicitly acknowledge that human approval gates for `qa` and `prod` environments constitute a deliberate deviation from Constitution Principle III ("Deployment to Azure is fully automated; no manual steps in the happy path")? [Conflict, HIGH, Spec §Requirements/NF-2]
- [x] CHK006 Does NF-2 in `spec.md` include a justification statement for why human approval gates are the accepted design choice (e.g., production safety trade-off) rather than silently contradicting the constitution? [Clarity, HIGH, Spec §NF-2]
- [x] CHK007 Is the constitution deviation documented at the spec level — not only in `plan.md` Constitution Check or `research.md` Alternatives Considered — so that reviewers reading only `spec.md` see the exception? [Completeness, HIGH, Spec §Requirements]
- [x] CHK008 Does `plan.md` Constitution Check for Principle III accurately reflect the deviation rather than marking it `✅ PASS` without qualification? The current entry states "no manual Azure portal deployments" but omits the human-approval-gate exception. [Accuracy, HIGH, Plan §Constitution Check]

---

## Workflow YAML Parameter Redundancy

> Tests whether the dual parameter-passing pattern (JSON file + inline overrides) is intentionally specified or an unaddressed design ambiguity.

- [x] CHK009 Does `spec.md` or `contracts/workflow-contract.md` specify whether inline parameter overrides (`appName`, `environment`) passed alongside `--parameters bicep/parameters.<env>.json` are intentional or redundant? [Clarity, MEDIUM, Contract §Parameter File Contract]
- [x] CHK010 Does the Parameter File Contract in `workflow-contract.md` document which source takes precedence when both a JSON parameters file and inline `--parameters key=value` flags are supplied to `az deployment group` commands? [Clarity, MEDIUM, Contract §Parameter File Contract]
- [x] CHK011 Are the values for `appName` and `environment` duplicated between the committed JSON parameter files and the inline workflow overrides — and if so, does the spec designate one as the single source of truth? [Consistency, MEDIUM, Spec §F-7, Contract §Parameter File Contract]
- [x] CHK012 Is the rationale for the dual-parameter approach (or a requirement to simplify to JSON-only) documented in any spec artifact to prevent future implementors from accidentally removing one source and silently changing effective parameter values? [Completeness, MEDIUM, Gap]

---

## User Story Traceability

> Tests whether the US1/US2/US3 user story identifiers extensively referenced in tasks.md exist as defined requirements in spec.md, providing end-to-end traceability.

- [x] CHK013 Are User Stories US1 ("Workflow committed and triggering"), US2 ("GitHub Environment approval gates"), and US3 ("Branch protection and end-to-end verification") formally defined in `spec.md` with acceptance criteria? [Completeness, MEDIUM, Gap]
- [x] CHK014 Do tasks T008–T010 (`[US1]`), T011–T016 (`[US2]`), and T017–T021 (`[US3]`) in `tasks.md` each trace to a named user story in `spec.md` — or does the traceability chain break at tasks.md with no upstream definition? [Traceability, MEDIUM, Tasks §Format]
- [x] CHK015 Is there a mapping between User Stories (US1/US2/US3) and the Functional/Non-Functional requirements they satisfy (e.g., US1 → F-1, F-2, F-3; US2 → NF-2; US3 → NF-3)? [Traceability, MEDIUM, Gap]
- [x] CHK016 Are the "Independent Test" descriptions in tasks.md Phases 3–5 equivalent to acceptance criteria for US1–US3, and if so, should they be promoted to `spec.md` as the authoritative acceptance criteria? [Traceability, MEDIUM, Tasks §Phase 3/4/5]

---

## Prerequisite Requirements (NF-5 Gap)

> Tests whether the hard dependency on pre-existing GitHub Secrets and Variables is formally captured as a non-functional requirement in spec.md rather than only as a task checkpoint in tasks.md.

- [x] CHK017 Is there a non-functional requirement (e.g., NF-5) in `spec.md` stating that `AZURE_CREDENTIALS` (secret), `AZURE_RESOURCE_GROUP` (variable), and `APP_NAME` (variable) must exist at repository scope before the workflow can execute? [Completeness, MEDIUM, Gap]
- [x] CHK018 Does `spec.md` specify the required scope (repository-level vs. environment-level) for each GitHub Secret and Variable, and whether environment-level overrides are mandatory or optional? [Clarity, MEDIUM, Spec §Requirements]
- [x] CHK019 Is the prerequisite verification (tasks T005–T007) referenced in `spec.md` as a deployment prerequisite, so that an operator reading only the spec understands the setup dependency before attempting workflow execution? [Completeness, MEDIUM, Gap]

---

## Scenario Coverage

> Tests whether edge cases and exception flows are addressed in requirements given the pipeline's multi-stage, approval-gated nature.

- [ ] CHK020 Are requirements defined for what happens when the workflow is triggered without the required secrets or variables configured (e.g., does the pipeline fail fast at `validate`, or does it fail mid-chain at a deploy job)? [Coverage, Edge Case, Gap]
- [ ] CHK021 Does `spec.md` Out of Scope explicitly confirm that rollback automation is excluded and document any manual rollback procedure reference, rather than leaving recovery behavior undefined? [Coverage, Spec §Out of Scope]
- [ ] CHK022 Is the behaviour specified when a required reviewer rejects (not just approves) a qa or prod environment gate — does the pipeline fail, require re-run, or expire? [Coverage, Exception Flow, Gap]

---

## Notes

- Check items off as completed: `[x]`
- **HIGH** items (CHK001–CHK008) should be resolved before merge; **MEDIUM** items (CHK009–CHK022) are improvements that strengthen spec quality but do not block the happy path.
- For CHK005–CHK008 (Constitution conflict): the recommended resolution is a one-sentence exception note on NF-2 and a corrected `plan.md` Constitution Check entry — not a redesign of the approval gate mechanism.
- For CHK013–CHK016 (User stories): the minimum resolution is adding a `## User Stories` section to `spec.md` with a one-line definition and acceptance criteria for each of US1, US2, US3.
- For CHK017–CHK019 (NF-5): the minimum resolution is a new row in the spec.md Non-Functional table: `NF-5 | GitHub Secrets (AZURE_CREDENTIALS) and Variables (AZURE_RESOURCE_GROUP, APP_NAME) must exist at repository scope prior to workflow execution.`
