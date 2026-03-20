# Practical SpecKit DevOps: Turn Specs into CI/CD Controls with GitHub Actions

> **60-minute hands-on session (code first)**
>
> In many teams, CI/CD only validates code. In this session we make the pipeline validate
> **intent**. Using SpecKit, we create a small, structured spec artifact for each change,
> then wire GitHub Actions to enforce spec presence, extract risk and breaking-change
> metadata, generate a spec summary artifact, and apply promotion rules. You will see how
> "the spec" becomes a first-class input to DevOps automation so merges and releases are
> gated by clear, reviewable requirements — not tribal knowledge.

---

## Session Agenda

| Time | Segment |
|------|---------|
| 0 – 5 min | [The end state and why it matters](#0--5-min-the-end-state-and-why-it-matters) |
| 5 – 15 min | [SpecKit setup for this repo](#5--15-min-speckit-setup-for-this-repo) |
| 15 – 25 min | [Write a spec for the CI/CD feature](#15--25-min-write-a-spec-for-the-cicd-feature) |
| 25 – 35 min | [Gate 1 — enforce spec presence on every PR](#25--35-min-gate-1--enforce-spec-presence-on-every-pr) |
| 35 – 45 min | [Gate 2 — extract risk and breaking-change metadata](#35--45-min-gate-2--extract-risk-and-breaking-change-metadata) |
| 45 – 55 min | [Gate 3 — generate spec summary artifact and apply promotion rules](#45--55-min-gate-3--generate-spec-summary-artifact-and-apply-promotion-rules) |
| 55 – 60 min | [Recap and next steps](#55--60-min-recap-and-next-steps) |

---

## 0 – 5 min: The end state and why it matters

**Show:** a quick repo tree of what we will build by the end of this session.

```
specs/
├── constitution.md                 # Project-wide governing principles
└── 002-speckit-cicd/
    ├── spec.md                     # What the CI/CD feature must do
    ├── plan.md                     # How we will build it
    ├── tasks.md                    # Actionable task list
    └── contracts/
        └── spec-metadata.schema.json  # Shape of the metadata the pipeline reads

.github/
└── workflows/
    ├── ci.yml                      # Existing: build & test
    ├── deploy.yml                  # Existing: provision + deploy to Azure
    ├── spec-check.yml              # NEW Gate 1: spec presence enforced on every PR
    ├── spec-metadata.yml           # NEW Gate 2: risk + breaking-change extraction
    └── spec-promote.yml            # NEW Gate 3: summary artifact + promotion rules
```

**Why this matters:**

- PRs without a spec are blocked automatically — no spec, no merge.
- Risk level and breaking-change flag are read from the spec, not inferred from code diff.
- The spec summary is a downloadable artifact — reviewers and auditors can read it without
  cloning the repo.
- Promotion to production is gated by the spec metadata, not by who remembered to add a label.

---

## 5 – 15 min: SpecKit setup for this repo

> Covered in full detail in [`docs/guide.md`](guide.md). Steps 1 and 2 are essential before
> any spec-driven CI/CD can work.

### Install the `specify` CLI

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git

# Windows (PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git
```

### Initialise SpecKit in this repository

```bash
# From the repo root
specify init . --ai copilot

# Verify — should list all /speckit.* commands
specify check
```

This writes the slash-command prompt files into `.github/` so GitHub Copilot Chat gains
the `/speckit.*` commands.

### Define the constitution (if not yet present)

If `specs/constitution.md` does not exist, create it now in **GitHub Copilot Chat**:

```
/speckit.constitution This project is the AI Genius demo application.
It consists of a Node.js Express API backend and a React frontend.
Core principles:
- Security-first: all inputs validated, HTTPS only, no secrets in code.
- Cloud-native: infrastructure is defined as code using Azure Bicep.
- CI/CD-driven: every merge to main triggers automated build and deployment.
- Spec-gated: no feature merges without a corresponding spec artifact.
- Simplicity: prefer standard libraries, avoid over-engineering.
- Tested: API routes must have unit tests; frontend must build clean.
```

Commit `specs/constitution.md` before continuing.

---

## 15 – 25 min: Write a spec for the CI/CD feature

We treat the CI/CD controls themselves as a feature — so we spec them first.

### Create a feature branch

```bash
git checkout -b 002-speckit-cicd
```

### Run `/speckit.specify` in GitHub Copilot Chat

```
/speckit.specify Add spec-driven CI/CD controls to the AI Genius repository.
The pipeline must:
1. Block any pull request that does not include a spec file under specs/<feature-id>/.
2. Parse the spec file to extract: risk level (low / medium / high) and whether the
   change is breaking (true / false).
3. Upload a human-readable spec summary as a GitHub Actions artifact on every PR.
4. Prevent merge to main when risk is "high" unless a designated reviewer has approved.
All controls are implemented as GitHub Actions workflows triggered on pull_request events.
```

SpecKit creates `specs/002-speckit-cicd/spec.md`. Inspect it:

```bash
cat specs/002-speckit-cicd/spec.md
```

### Clarify the spec

```
/speckit.clarify Resolve all [NEEDS CLARIFICATION] markers.
- Spec presence check: look for any file matching specs/<feature-id>/spec.md
  where <feature-id> is derived from the PR branch name (first path segment after /).
- Risk level: read the "Risk" field from the YAML front-matter of spec.md.
  Valid values: low, medium, high. Default to "medium" if the field is missing.
- Breaking change: read the "Breaking" field (true/false) from the same front-matter.
- High-risk gate: require the "spec-reviewer" GitHub team approval before merge.
- Spec summary artifact: a plain-text file named spec-summary.txt, retained 30 days.
```

### Validate the spec

```
/speckit.checklist
```

All checklist items should pass before moving on. Address any failures.

### Plan and generate tasks

```
/speckit.plan
Three GitHub Actions workflows using ubuntu-latest runners:
- spec-check.yml: uses bash + git to detect spec presence.
- spec-metadata.yml: uses a small Node.js script or bash+grep to parse YAML front-matter.
- spec-promote.yml: uses actions/upload-artifact and a conditional job to enforce approval.
No external action dependencies beyond the standard GitHub-provided actions.

/speckit.tasks
```

Review `specs/002-speckit-cicd/tasks.md` — tasks should be ordered and dependency-linked.

---

## 25 – 35 min: Gate 1 — enforce spec presence on every PR

**Goal:** a PR whose branch name starts with `NNN-` must include `specs/NNN-*/spec.md`
or the check fails and the merge is blocked.

### The workflow

Create `.github/workflows/spec-check.yml`:

```yaml
name: Spec Check — Presence

on:
  pull_request:
    branches: [main]

permissions:
  contents: read
  pull-requests: write   # to post a comment explaining the failure

jobs:
  spec-presence:
    name: Verify spec artifact exists
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Derive feature ID from branch name
        id: branch
        run: |
          BRANCH="${{ github.head_ref }}"
          # Extract leading NNN- segment, e.g. "002-speckit-cicd" → "002"
          FEATURE_ID=$(echo "$BRANCH" | grep -oP '^\d+' || true)
          echo "feature_id=${FEATURE_ID}" >> "$GITHUB_OUTPUT"
          echo "branch=${BRANCH}" >> "$GITHUB_OUTPUT"

      - name: Check for spec file
        id: spec
        run: |
          FEATURE_ID="${{ steps.branch.outputs.feature_id }}"
          if [ -z "$FEATURE_ID" ]; then
            echo "Branch does not follow NNN-<name> convention — skipping spec check."
            echo "required=false" >> "$GITHUB_OUTPUT"
            exit 0
          fi
          SPEC_FILE=$(find specs -name "spec.md" -path "specs/${FEATURE_ID}-*" | head -1)
          if [ -z "$SPEC_FILE" ]; then
            echo "::error::No spec file found for feature ${FEATURE_ID}. Expected: specs/${FEATURE_ID}-<name>/spec.md"
            echo "found=false" >> "$GITHUB_OUTPUT"
            exit 1
          fi
          echo "found=true" >> "$GITHUB_OUTPUT"
          echo "spec_file=${SPEC_FILE}" >> "$GITHUB_OUTPUT"
          echo "Spec found: ${SPEC_FILE}"
```

### Try it locally

```bash
# Simulate what the workflow checks
BRANCH="002-speckit-cicd"
FEATURE_ID=$(echo "$BRANCH" | grep -oP '^\d+')
find specs -name "spec.md" -path "specs/${FEATURE_ID}-*"
# Should print: specs/002-speckit-cicd/spec.md
```

### What a failing PR looks like

When a branch named `003-no-spec` has no `specs/003-*/spec.md`:

```
✗ Verify spec artifact exists
  Error: No spec file found for feature 003.
         Expected: specs/003-<name>/spec.md
```

The check is marked **required** in the branch protection rules, so the PR cannot be merged.

---

## 35 – 45 min: Gate 2 — extract risk and breaking-change metadata

**Goal:** read structured metadata from the spec's YAML front-matter and expose it as
step outputs, job outputs, and a job summary table that reviewers see immediately.

### YAML front-matter convention

Every `spec.md` begins with a fenced front-matter block:

```markdown
---
feature: 002-speckit-cicd
risk: medium
breaking: false
reviewer-team: spec-reviewer
---

# Spec: Spec-Driven CI/CD Controls
...
```

SpecKit's `/speckit.specify` template generates this front-matter automatically.

### The workflow

Create `.github/workflows/spec-metadata.yml`:

```yaml
name: Spec Metadata — Risk & Breaking Change

on:
  pull_request:
    branches: [main]

permissions:
  contents: read
  pull-requests: write

jobs:
  extract-metadata:
    name: Extract spec metadata
    runs-on: ubuntu-latest
    outputs:
      risk: ${{ steps.meta.outputs.risk }}
      breaking: ${{ steps.meta.outputs.breaking }}
      spec_file: ${{ steps.meta.outputs.spec_file }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Locate spec file
        id: locate
        run: |
          BRANCH="${{ github.head_ref }}"
          FEATURE_ID=$(echo "$BRANCH" | grep -oP '^\d+' || true)
          if [ -z "$FEATURE_ID" ]; then
            echo "spec_file=" >> "$GITHUB_OUTPUT"
            exit 0
          fi
          SPEC_FILE=$(find specs -name "spec.md" -path "specs/${FEATURE_ID}-*" | head -1)
          echo "spec_file=${SPEC_FILE}" >> "$GITHUB_OUTPUT"

      - name: Parse front-matter
        id: meta
        run: |
          SPEC_FILE="${{ steps.locate.outputs.spec_file }}"
          if [ -z "$SPEC_FILE" ]; then
            echo "risk=medium"    >> "$GITHUB_OUTPUT"
            echo "breaking=false" >> "$GITHUB_OUTPUT"
            echo "spec_file="     >> "$GITHUB_OUTPUT"
            exit 0
          fi

          # Extract YAML front-matter between the first pair of --- delimiters
          FRONTMATTER=$(awk '/^---/{found++; if(found==2) exit} found==1 && !/^---/' "$SPEC_FILE")

          RISK=$(echo "$FRONTMATTER"    | grep -oP '(?<=risk:\s)\S+' | tr '[:upper:]' '[:lower:]' || echo "medium")
          BREAKING=$(echo "$FRONTMATTER" | grep -oP '(?<=breaking:\s)\S+' | tr '[:upper:]' '[:lower:]' || echo "false")

          echo "risk=${RISK}"         >> "$GITHUB_OUTPUT"
          echo "breaking=${BREAKING}" >> "$GITHUB_OUTPUT"
          echo "spec_file=${SPEC_FILE}" >> "$GITHUB_OUTPUT"

          # Post a summary table to the Actions job summary
          echo "### Spec Metadata" >> "$GITHUB_STEP_SUMMARY"
          echo "| Field | Value |"  >> "$GITHUB_STEP_SUMMARY"
          echo "|-------|-------|"  >> "$GITHUB_STEP_SUMMARY"
          echo "| Spec file | \`${SPEC_FILE}\` |" >> "$GITHUB_STEP_SUMMARY"
          echo "| Risk level | **${RISK}** |"     >> "$GITHUB_STEP_SUMMARY"
          echo "| Breaking change | ${BREAKING} |" >> "$GITHUB_STEP_SUMMARY"

  flag-breaking:
    name: Flag breaking changes
    runs-on: ubuntu-latest
    needs: extract-metadata
    if: needs.extract-metadata.outputs.breaking == 'true'
    steps:
      - name: Annotate PR as breaking change
        run: |
          echo "::warning::This PR is marked as a BREAKING CHANGE in the spec."
          echo "::warning::Ensure downstream consumers are notified before merging."
```

### What reviewers see

In the **Actions** tab for the PR, the job summary shows:

| Field | Value |
|-------|-------|
| Spec file | `specs/002-speckit-cicd/spec.md` |
| Risk level | **medium** |
| Breaking change | false |

No grep, no diff-reading — the spec is the record of intent.

---

## 45 – 55 min: Gate 3 — generate spec summary artifact and apply promotion rules

**Goal:** produce a downloadable spec summary that auditors can grab without opening the
repo, and block merges to `main` when `risk: high` unless a designated team has approved.

### The workflow

Create `.github/workflows/spec-promote.yml`:

```yaml
name: Spec Promote — Summary & Promotion Gate

on:
  pull_request:
    branches: [main]

permissions:
  contents: read
  pull-requests: read

jobs:
  generate-summary:
    name: Generate spec summary artifact
    runs-on: ubuntu-latest
    outputs:
      risk: ${{ steps.meta.outputs.risk }}
      breaking: ${{ steps.meta.outputs.breaking }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Locate and parse spec
        id: meta
        run: |
          BRANCH="${{ github.head_ref }}"
          FEATURE_ID=$(echo "$BRANCH" | grep -oP '^\d+' || true)
          SPEC_FILE=""
          RISK="medium"
          BREAKING="false"
          TITLE="(no spec)"

          if [ -n "$FEATURE_ID" ]; then
            SPEC_FILE=$(find specs -name "spec.md" -path "specs/${FEATURE_ID}-*" | head -1)
          fi

          if [ -n "$SPEC_FILE" ]; then
            FRONTMATTER=$(awk '/^---/{found++; if(found==2) exit} found==1 && !/^---/' "$SPEC_FILE")
            RISK=$(echo "$FRONTMATTER"     | grep -oP '(?<=risk:\s)\S+'     | tr '[:upper:]' '[:lower:]' || echo "medium")
            BREAKING=$(echo "$FRONTMATTER" | grep -oP '(?<=breaking:\s)\S+' | tr '[:upper:]' '[:lower:]' || echo "false")
            TITLE=$(grep -m1 '^# ' "$SPEC_FILE" | sed 's/^# //')
          fi

          echo "risk=${RISK}"         >> "$GITHUB_OUTPUT"
          echo "breaking=${BREAKING}" >> "$GITHUB_OUTPUT"
          echo "spec_file=${SPEC_FILE}" >> "$GITHUB_OUTPUT"
          echo "title=${TITLE}"       >> "$GITHUB_OUTPUT"

      - name: Write spec-summary.txt
        run: |
          SPEC_FILE="${{ steps.meta.outputs.spec_file }}"
          {
            echo "======================================"
            echo " Spec Summary — PR #${{ github.event.pull_request.number }}"
            echo "======================================"
            echo "Branch:         ${{ github.head_ref }}"
            echo "PR title:       ${{ github.event.pull_request.title }}"
            echo "Spec title:     ${{ steps.meta.outputs.title }}"
            echo "Risk level:     ${{ steps.meta.outputs.risk }}"
            echo "Breaking change: ${{ steps.meta.outputs.breaking }}"
            echo "Spec file:      ${SPEC_FILE:-none}"
            echo "Generated at:   $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
            echo "======================================"
            if [ -n "$SPEC_FILE" ]; then
              echo ""
              echo "--- Full spec contents ---"
              cat "$SPEC_FILE"
            fi
          } > spec-summary.txt

      - name: Upload spec summary artifact
        uses: actions/upload-artifact@v4
        with:
          name: spec-summary-pr-${{ github.event.pull_request.number }}
          path: spec-summary.txt
          retention-days: 30

  promotion-gate:
    name: Promotion gate (high-risk block)
    runs-on: ubuntu-latest
    needs: generate-summary
    steps:
      - name: Enforce high-risk approval requirement
        run: |
          RISK="${{ needs.generate-summary.outputs.risk }}"
          BREAKING="${{ needs.generate-summary.outputs.breaking }}"

          echo "Risk level:      ${RISK}"
          echo "Breaking change: ${BREAKING}"

          if [ "$RISK" = "high" ]; then
            echo "::error::Risk level is HIGH. This PR requires approval from the spec-reviewer team before it can be merged."
            echo "::error::Add the 'spec-reviewer' team as a required reviewer or use a CODEOWNERS rule on specs/."
            exit 1
          fi

          if [ "$BREAKING" = "true" ]; then
            echo "::warning::Breaking change detected. Confirm downstream consumers are aware."
          fi

          echo "Promotion gate passed."
```

### Enforce the gate via branch protection

In **Settings → Branches → Branch protection rules** for `main`:

- ✅ Require status checks to pass before merging
  - `Spec Check — Presence / Verify spec artifact exists`
  - `Spec Metadata — Risk & Breaking Change / Extract spec metadata`
  - `Spec Promote — Summary & Promotion Gate / Promotion gate (high-risk block)`
- ✅ Require approvals: `1` (from the `spec-reviewer` team for high-risk)
- ✅ Do not allow bypassing the above settings

### CODEOWNERS for high-risk auto-assignment

Add `.github/CODEOWNERS`:

```
# Spec files always require a spec-reviewer team member to approve
specs/  @YOUR_ORG/spec-reviewer
```

This ensures that whenever a `specs/` file is changed, a `spec-reviewer` team member is
automatically added as a required reviewer — enforcing the high-risk promotion gate at
the GitHub level, not just in the workflow.

---

## Gradual Implementation Checklist

Use this order to build confidence before making checks required:

- [ ] **Phase 1 — observe:** add `spec-check.yml` in non-blocking mode (no `exit 1`).
      Watch which PRs would have failed.
- [ ] **Phase 2 — warn:** add `spec-metadata.yml` with summary-only output (no failure).
      Train the team to read spec metadata in the Actions summary.
- [ ] **Phase 3 — enforce presence:** make `spec-check.yml` required in branch protection.
      All feature branches must now include `specs/<id>/spec.md`.
- [ ] **Phase 4 — enforce promotion:** make `spec-promote.yml` required.
      High-risk specs now block merge until `spec-reviewer` approves.
- [ ] **Phase 5 — audit trail:** retain `spec-summary.txt` artifacts on every PR.
      Download them during incidents or release reviews.

---

## 55 – 60 min: Recap and next steps

### What we built in 60 minutes

| Artifact | Purpose |
|----------|---------|
| `specs/002-speckit-cicd/spec.md` | Requirements for the CI/CD controls, spec-first |
| `.github/workflows/spec-check.yml` | Gate 1 — blocks PRs without a spec |
| `.github/workflows/spec-metadata.yml` | Gate 2 — surfaces risk and breaking-change |
| `.github/workflows/spec-promote.yml` | Gate 3 — artifact + high-risk merge block |
| `.github/CODEOWNERS` | Auto-assigns reviewers to any spec change |

### Key principles reinforced

- **The spec is the source of truth.** Code and CI/CD are its expressions.
- **Gradual enforcement.** Observe → warn → enforce. Never flip everything at once.
- **Structured metadata over convention.** YAML front-matter is machine-readable;
  PR titles and commit messages are not.
- **Specs as auditable artifacts.** `spec-summary.txt` gives reviewers and auditors
  a point-in-time record without needing repo access.

### Next steps

1. **Add `/speckit.analyze`** after tasks are generated to catch spec-vs-task mismatches
   before the pipeline runs. (See [`docs/guide.md — Step 8`](guide.md#step-8--analyze-and-validate))
2. **Connect spec risk to deployment environments.** Use `risk: high` to automatically
   target a staging environment before production in `deploy.yml`.
3. **Extend the spec schema.** Add `rollback-plan`, `feature-flag`, and `owner` fields
   to the front-matter and parse them in the metadata workflow.
4. **Spec-driven release notes.** Aggregate `spec-summary.txt` artifacts from all PRs
   in a release to auto-generate a changelog.

---

## Reference: SpecKit Commands Used in This Session

| Command | Used in | Purpose |
|---------|---------|---------|
| `specify init . --ai copilot` | Setup | Installs `/speckit.*` commands into Copilot |
| `specify check` | Setup | Verifies installation |
| `/speckit.constitution` | Setup | Establishes project principles |
| `/speckit.specify` | Spec writing | Defines what the CI/CD feature must do |
| `/speckit.clarify` | Spec writing | Resolves ambiguities in the spec |
| `/speckit.checklist` | Spec validation | Quality-gates the spec before planning |
| `/speckit.plan` | Planning | Translates requirements into a technical plan |
| `/speckit.tasks` | Planning | Generates an ordered, dependency-linked task list |

> Full SpecKit documentation: [`docs/guide.md`](guide.md)
> Spec-driven development methodology: [github.com/github/spec-kit/blob/main/spec-driven.md](https://github.com/github/spec-kit/blob/main/spec-driven.md)
