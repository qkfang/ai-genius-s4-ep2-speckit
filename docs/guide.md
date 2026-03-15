# AI Genius Episode 2 — SpecKit: Practical DevOps Controls

> **60-Minute Hands-On Session: Practical SpecKit DevOps — Turn Specs into CI/CD Controls**
>
> This guide is written for the presenter. Every step has been tested and timed.
> Follow the steps in order; each section includes the exact prompts, commands,
> and expected output so you can demo confidently and recover quickly if anything
> goes wrong.
>
> **Core message:** In many teams, CI/CD only validates code. In this session we
> make the pipeline validate *intent*. The spec becomes a first-class DevOps
> artifact that gates merges and releases.

---

## ⏱️ Session Timeline

| Section | Topic | Clock Time |
|---------|-------|-----------|
| [Part 1](#part-1--end-state-and-why-it-matters-05-min) | End State and Why It Matters | 0 – 5 min |
| [Part 2](#part-2--the-change-spec-artifact-515-min) | The Change Spec Artifact | 5 – 15 min |
| [Part 3](#part-3--enforce-spec-presence-in-ci-1525-min) | Enforce Spec Presence in CI | 15 – 25 min |
| [Part 4](#part-4--extract-metadata-and-generate-a-summary-2540-min) | Extract Metadata and Generate a Summary | 25 – 40 min |
| [Part 5](#part-5--apply-promotion-rules-4055-min) | Apply Promotion Rules | 40 – 55 min |
| [Part 6](#part-6--live-demo-the-full-loop-5560-min) | Live Demo: The Full Loop | 55 – 60 min |

---

## Prerequisites

Before the session starts, verify:

```bash
node --version   # must be >= 18 (ideally 20)
npm --version
git --version
```

You need:
- The repository cloned locally (or opened in GitHub Codespaces / VS Code Dev Container)
- A GitHub account with the repo forked (for the GitHub Actions live demo in Parts 3–6)

---

## Part 1 — End State and Why It Matters (0–5 min)

### Step 1.1 — Show the end state ⏱️ ~3 minutes

**What to say:**
> "Let me show you where we end up before we explain how we get there. This is the
> repo we're working with — and by the end of this session, every PR into it will be
> gated by a structured spec artifact, not tribal knowledge."

Show the project tree (or walk through it in your editor):

```
ai-genius-ep2-speckit/
├── specs/
│   ├── app.spec.yaml        ← application lifecycle spec (runtime, stages)
│   └── change.spec.yaml     ← 🎯 per-PR change spec: risk, breaking, promotion rules
├── speckit/lib/
│   ├── parser.js
│   ├── validator.js
│   ├── spec-extractor.js    ← extracts metadata and evaluates promotion gates
│   └── pipeline-generator.js
└── .github/workflows/
    ├── spec-enforcer.yml    ← blocks PRs without a spec
    └── spec-gate.yml        ← applies promotion rules before deployment
```

**Key message:**
> "Two spec files, two new workflows, one new library module. That's all it takes to
> make CI/CD validate intent instead of just code."

---

### Step 1.2 — Install and verify ⏱️ ~2 minutes

```bash
git clone https://github.com/qkfang/ai-genius-ep2-speckit
cd ai-genius-ep2-speckit
npm install
npm test
```

**Expected output:**
```
Tests:       57 passed, 57 total
Test Suites: 2 passed, 2 total
Time:        ~0.9s
```

---

## Part 2 — The Change Spec Artifact (5–15 min)

### Step 2.1 — Introduce the concept ⏱️ ~2 minutes

**What to say:**
> "Most CI/CD pipelines validate that the code builds and tests pass. That's necessary
> but not sufficient. We also want to know: what is this change? Is it risky? Does it
> break existing contracts? What environments is it allowed to reach?
>
> We answer those questions with a *change spec* — a small YAML file committed with
> every pull request."

---

### Step 2.2 — Open and read the change spec ⏱️ ~5 minutes

```bash
cat specs/change.spec.yaml
```

Walk through each section:

**1. What is this change?**
```yaml
change:
  title: "Add user-facing health dashboard endpoint"
  type: feature        # feature | fix | chore | breaking | release
  description: >
    Adds a new /api/dashboard route...
```
> "The `title` and `type` give reviewers immediate context. No more reading 20 commit
> messages to understand what a PR does."

**2. Risk assessment:**
```yaml
  risk: low              # low | medium | high
  breaking: false
```
> "The author declares risk level and whether existing contracts are broken. The pipeline
> trusts this but also *enforces consequences* — a `breaking: true` flag blocks production."

**3. Affected components:**
```yaml
  components:
    - name: api-gateway
      impact: modified
    - name: health-service
      impact: new
```
> "Explicitly listing touched components is useful for reviewers and for post-incident
> analysis. Which PRs touched the payment service last week? Now you can query the specs."

**4. Promotion rules:**
```yaml
  promotion:
    require_approvals: 1
    require_passing_tests: true
    environments:
      - staging
      - production
```
> "The change spec declares where it *wants* to go and what gates must pass. The pipeline
> enforces it."

---

### Step 2.3 — Validate the change spec ⏱️ ~1 minute

**What to say:**
> "SpecKit can validate the change spec just like it validates the app spec."

```bash
npm run speckit:extract
```

**Expected output:**
```
📊 SpecKit › Extracting metadata from: .../specs/change.spec.yaml

─── Change Metadata ───────────────────────────────
  Title:    Add user-facing health dashboard endpoint
  Type:     feature
  Risk:     LOW
  Breaking: No
  Rationale: Low-risk change — isolated, additive, and fully tested.

─── Affected Components ───────────────────────────
  • api-gateway (modified)
  • health-service (new)

─── Promotion Rules ───────────────────────────────
  Required approvals:    1
  Passing tests:         true
  Security scan:         false
  Environments:          staging → production
```

---

### Step 2.4 — Intentionally break the spec ⏱️ ~3 minutes (interactive demo)

**What to say:**
> "Let's see what happens when a developer forgets a required field."

Edit `specs/change.spec.yaml` — remove the `risk` line:

```yaml
change:
  title: "Add dashboard"
  type: feature
  # risk: low   ← removed
  breaking: false
```

Then run:
```bash
npm run speckit:extract
```

**Expected output:**
```
❌ Change spec validation failed with 1 error(s):

  • change.risk is required
```

> "Immediate, local feedback — before any CI job runs."

**Restore the spec:**
```bash
git checkout specs/change.spec.yaml
```

---

## Part 3 — Enforce Spec Presence in CI (15–25 min)

### Step 3.1 — Overview of the spec-enforcer workflow ⏱️ ~2 minutes

**What to say:**
> "Validation locally is useful. But we need the *pipeline* to enforce spec presence.
> If a developer opens a PR without a change spec, the build should fail."

Open `.github/workflows/spec-enforcer.yml`.

**Key sections to highlight:**

**The spec presence check:**
```yaml
- name: Check spec file exists
  run: |
    if [ ! -f "${{ env.SPEC_FILE }}" ]; then
      echo "❌ Change spec not found"
      echo "Every PR must include specs/change.spec.yaml"
      exit 1
    fi
```
> "This is the first gate. The job fails immediately if the spec file is missing. No spec,
> no merge."

**Validate, extract, comment:**
```yaml
- name: Validate change spec
  run: |
    node -e "
      const { parseSpec } = require('./speckit/lib/parser');
      const { validateChangeSpec } = require('./speckit/lib/spec-extractor');
      ...
    "

- name: Post PR comment
  uses: actions/github-script@v7
  with:
    script: |
      // Posts the spec summary as a PR comment
```
> "After validating, the workflow generates a spec summary and posts it as a PR comment.
> Reviewers see risk level, breaking flag, and affected components without opening any files."

---

### Step 3.2 — What reviewers see on the PR ⏱️ ~2 minutes

Show (or mock) a GitHub PR comment that the workflow would post:

```markdown
### 📋 SpecKit Change Spec Summary

## Change Details

| Field | Value |
|---|---|
| **Title** | Add user-facing health dashboard endpoint |
| **Type** | `feature` |
| **Risk** | 🟢 LOW |
| **Breaking** | ✅ No |

> Low-risk change — isolated, additive, and fully tested.

## Affected Components

| Component | Impact |
|---|---|
| `api-gateway` | ✏️ modified |
| `health-service` | 🆕 new |

## Promotion Gate Results

| Environment | Status | Notes |
|---|---|---|
| staging    | 🟢 Clear | All gates passed |
| production | 🟢 Clear | All gates passed |
```

> "The reviewer doesn't need to read the spec file — the pipeline extracts and formats
> it for them. Intent is visible at the top of every PR."

---

### Step 3.3 — Walk through the spec-enforcer flow ⏱️ ~4 minutes

**Walk through these jobs in order:**

1. `Check spec file exists` — hard fail if missing
2. `Validate change spec` — schema validation
3. `Extract spec metadata` — outputs `risk_level`, `is_breaking`, `component_count`
4. `Generate summary artifact` — calls `speckit extract --output /tmp/spec-summary.md`
5. `Post PR comment` — uses `actions/github-script@v7` to upsert a comment
6. `Upload spec summary artifact` — persists the summary for 30 days

**Key talking point:**
> "Notice we upload the spec summary as a GitHub Actions artifact. This creates an audit
> trail — you can always look back at what the author declared for any past deployment."

---

### Step 3.4 — Trigger manually ⏱️ ~1 minute

**How to trigger on GitHub:**
1. Go to **Actions** tab
2. Select **"Spec Enforcer — Require Change Spec on PRs"**
3. Click **"Run workflow"**
4. Optionally change the spec file path
5. Click **"Run workflow"**

---

## Part 4 — Extract Metadata and Generate a Summary (25–40 min)

### Step 4.1 — Walk through `spec-extractor.js` ⏱️ ~6 minutes

**What to say:**
> "Let's look at the library module that does all the extraction. This is the brain
> behind both the spec-enforcer and the spec-gate workflows."

Open `speckit/lib/spec-extractor.js`.

**Key functions to highlight:**

**`validateChangeSpec(spec)`** (line ~26):
```javascript
function validateChangeSpec(spec) {
  const errors = [];
  if (!spec.change) { errors.push('...'); return { valid: false, errors }; }
  // validates title, type, risk, breaking, components, promotion
}
```
> "Separate from the app spec validator — change specs have different required fields."

**`extractRisk(spec)`** (line ~95):
```javascript
function extractRisk(spec) {
  const risk = c.risk || 'unknown';
  const breaking = c.breaking === true;
  // Generates a rationale string based on risk + breaking
  return { risk, breaking, type, rationale };
}
```
> "The rationale is what goes into the PR comment. It translates the spec field into
> a human-readable explanation."

**`evaluatePromotionGate(spec, environment)`** (line ~138):
```javascript
function evaluatePromotionGate(spec, environment) {
  if (environment === 'production') {
    if (breaking)   reasons.push('Breaking changes require manual approval...');
    if (risk === 'high') reasons.push('High-risk changes require additional review...');
  }
  return { blocked: reasons.length > 0, reasons };
}
```
> "This is the gate logic. It returns `{ blocked: true, reasons: [...] }`. The workflow
> reads this and decides whether to proceed."

**`generateSummary(spec)`** (line ~165):
> "Generates the full Markdown summary — the same text posted as a PR comment and
> uploaded as an artifact."

---

### Step 4.2 — Run the extract command with gate evaluation ⏱️ ~2 minutes

```bash
# Check the staging gate
node speckit/index.js extract specs/change.spec.yaml --env staging

# Check the production gate
node speckit/index.js extract specs/change.spec.yaml --env production
```

**Expected output (production):**
```
🟢 CLEAR — all promotion gates passed
```

Now temporarily change `risk: high` in `specs/change.spec.yaml`:

```bash
node speckit/index.js extract specs/change.spec.yaml --env production
```

**Expected output:**
```
🔴 BLOCKED — 1 reason(s):
   • High-risk changes require additional review before production deployment
```

Exit code is `2` (non-zero) — GitHub Actions can use this to block the job.

**Restore:**
```bash
git checkout specs/change.spec.yaml
```

---

### Step 4.3 — Generate and inspect the summary artifact ⏱️ ~3 minutes

```bash
node speckit/index.js extract specs/change.spec.yaml --output /tmp/spec-summary.md
cat /tmp/spec-summary.md
```

**Point out:**
- The full Markdown table with all fields
- The Promotion Gate Results section with 🟢/🔴 status for each environment
- The References section linking to closed issues

> "This artifact is what you archive for compliance. It answers: for this release,
> who declared what risk level, which components were affected, and were all gates clear?"

---

### Step 4.4 — Run the full test suite to see extractor coverage ⏱️ ~1 minute

```bash
npm run test:coverage
```

Point out the `speckit/lib/spec-extractor.js` row in the coverage table.

> "We went from 32 to 57 tests. The 25 new tests cover the extractor: schema validation,
> risk extraction, gate evaluation, and summary generation."

---

## Part 5 — Apply Promotion Rules (40–55 min)

### Step 5.1 — Overview of the spec-gate workflow ⏱️ ~3 minutes

**What to say:**
> "The spec-enforcer runs on PRs and posts a comment. The spec-gate workflow runs on
> push and controls deployment. It reads the spec and gates the deploy jobs."

Open `.github/workflows/spec-gate.yml`.

**Key structure:**
```yaml
jobs:
  spec-gate:     # reads spec, evaluates gates, sets outputs
  ci:            # runs lint + test (always)
  deploy-staging:
    needs: [spec-gate, ci]
    if: needs.spec-gate.outputs.staging_blocked != 'true'
  deploy-production:
    needs: [spec-gate, deploy-staging]
    if: needs.spec-gate.outputs.production_blocked != 'true'
```
> "The gate job runs first and sets `staging_blocked` and `production_blocked` outputs.
> Downstream jobs read those outputs via `if:` conditions. If the spec says 'blocked',
> the deploy job is skipped entirely."

---

### Step 5.2 — Walk through the gate job steps ⏱️ ~5 minutes

**The check-exists step:**
```yaml
- name: Check spec file exists
  run: |
    if [ ! -f "${{ env.SPEC_FILE }}" ]; then
      echo "⚠️  No change spec found — using safe defaults"
    fi
```
> "The gate is lenient on push if no spec exists — it uses safe defaults (low risk, not
> breaking). The *enforcer* on the PR is strict. This two-workflow pattern lets you
> adopt controls incrementally."

**The extract step:**
```yaml
- name: Extract spec metadata
  id: extract
  run: |
    node -e "
      const { extractRisk, extractPromotionRules } = require('./speckit/lib/spec-extractor');
      const { risk, breaking, type } = extractRisk(spec);
      console.log('risk_level=' + risk);
      console.log('is_breaking=' + breaking);
      ..." | tee -a "$GITHUB_OUTPUT"
```
> "Job outputs in GitHub Actions are key=value pairs written to `$GITHUB_OUTPUT`.
> Downstream jobs read them with `needs.spec-gate.outputs.risk_level`."

**The gate evaluation step:**
```yaml
- name: Evaluate promotion gates
  id: gate
  run: |
    node -e "
      const staging = evaluatePromotionGate(spec, 'staging');
      const production = evaluatePromotionGate(spec, 'production');
      console.log('staging_blocked=' + staging.blocked);
      console.log('production_blocked=' + production.blocked);
    " | tee -a "$GITHUB_OUTPUT"
```
> "One Node.js call, two outputs. These are the levers that downstream deploy jobs check."

---

### Step 5.3 — Demo: breaking change blocks production ⏱️ ~5 minutes

**What to say:**
> "Let's see the gate in action. I'll change `breaking: true` in the change spec
> and watch the production deploy job get blocked."

Edit `specs/change.spec.yaml`:
```yaml
  breaking: true   # ← was false
```

Check the production gate locally:
```bash
node speckit/index.js extract specs/change.spec.yaml --env production
```

**Expected output:**
```
🔴 BLOCKED — 1 reason(s):
   • Breaking changes require manual approval before production deployment
```

Then commit and push to trigger the workflow on GitHub:
```bash
git add specs/change.spec.yaml
git commit -m "demo: mark change as breaking to show gate"
git push
```

On GitHub:
1. Go to **Actions** tab
2. Watch **"Spec Gate — Apply Promotion Rules"** run
3. Click into the run — you will see:
   - `spec-gate` job: `production_blocked=true`
   - `deploy-staging` job: ✅ runs normally
   - `deploy-production` job: ⏭️ skipped (condition was false)
4. Click the gate summary artifact — the Markdown summary shows `🔴 Blocked` for production

**Key talking point:**
> "The developer declared `breaking: true`. The pipeline enforced the consequence —
> production was skipped. No YAML knowledge required. No manual reviewer needed to
> catch it. The spec did the work."

**Restore:**
```bash
git checkout specs/change.spec.yaml
git push
```

---

### Step 5.4 — Demo: high risk blocks production ⏱️ ~3 minutes

Edit `specs/change.spec.yaml`:
```yaml
  risk: high   # ← was low
  breaking: false
```

```bash
node speckit/index.js extract specs/change.spec.yaml --env production
```

**Expected:**
```
🔴 BLOCKED — 1 reason(s):
   • High-risk changes require additional review before production deployment
```

> "Two independent controls: `breaking` and `risk`. Both can gate production.
> Both are declared by the author. Both are enforced by the pipeline."

**Restore:**
```bash
git checkout specs/change.spec.yaml
```

---

### Step 5.5 — Show the gate summary artifact ⏱️ ~2 minutes

After the workflow runs, go to the GitHub Actions run page:
1. Click into the `spec-gate` job
2. Click **Artifacts** in the top-right
3. Download **spec-gate-summary**
4. Open the Markdown file

Show the Promotion Gate Results table with both environments.

**Key talking point:**
> "Every deployment now has an attached spec summary. Audit trail, risk declaration,
> and gate results — all in one artifact, stored for 30 days."

---

## Part 6 — Live Demo: The Full Loop (55–60 min)

### Step 6.1 — Open a PR without a spec ⏱️ ~2 minutes

**What to say:**
> "Let's prove the enforcer catches missing specs. I'll create a branch, make a small
> code change, open a PR, and intentionally leave out the change spec."

```bash
git checkout -b demo/no-spec
# Make a trivial code change
echo "// demo" >> src/app.js
git add src/app.js
git commit -m "demo: code change without spec"
git push -u origin demo/no-spec
```

Open a PR from `demo/no-spec` → `main` on GitHub.

Watch **"Spec Enforcer"** fail:
```
❌ Change spec not found: specs/change.spec.yaml
   Every pull request must include a change spec...
```

> "The merge is blocked. No spec, no merge. The pipeline validates intent."

**Cleanup:**
```bash
git checkout main
git branch -D demo/no-spec
git push origin --delete demo/no-spec
```

---

### Step 6.2 — Open a PR with a complete spec ⏱️ ~2 minutes

```bash
git checkout -b demo/with-spec
echo "// demo" >> src/app.js
# Change spec is already in place — leave it as-is
git add .
git commit -m "demo: code change with spec"
git push -u origin demo/with-spec
```

Open a PR from `demo/with-spec` → `main`.

Watch **"Spec Enforcer"** pass and post the PR comment with:
- Risk level and breaking status
- Affected components
- Promotion gate results

**Key talking point:**
> "The reviewer immediately sees: low risk, no breaking change, both gates clear.
> They can make an informed decision without reading the code."

**Cleanup:**
```bash
git checkout main
git branch -D demo/with-spec
git push origin --delete demo/with-spec
```

---

### Step 6.3 — Closing message ⏱️ ~1 minute

**What to say:**
> "Let's recap what we built in 60 minutes:
>
> 1. A **change spec** — a small, structured YAML artifact committed with every PR.
> 2. A **spec-enforcer** workflow — blocks PRs without a spec, posts a summary comment.
> 3. A **spec-extractor** module — extracts risk, breaking-change, and promotion rules.
> 4. A **spec-gate** workflow — evaluates promotion gates and blocks deploys when needed.
>
> The pipeline now validates *intent*, not just code. Merges and releases are gated by
> clear, reviewable requirements. Not tribal knowledge."

---

## Quick Reference — All Commands

| Command | What it does | Typical time |
|---------|-------------|-------------|
| `npm install` | Install all dependencies | ~3–15 s |
| `npm test` | Run all 57 Jest tests | ~0.9 s |
| `npm run test:coverage` | Tests + coverage report | ~1 s |
| `npm run lint` | ESLint check | ~0.4 s |
| `npm run speckit:validate` | Validate `specs/app.spec.yaml` | ~0.15 s |
| `npm run speckit:extract` | Extract metadata from `specs/change.spec.yaml` | ~0.1 s |
| `npm run speckit:generate` | Generate pipeline YAML | ~0.16 s |
| `npm run speckit:run` | Full agentic loop: parse → validate → generate | ~0.06 s |
| `npm start` | Start Express.js API on port 3000 | < 1 s |
| `node speckit/index.js extract specs/change.spec.yaml --env production` | Evaluate production gate | ~0.1 s |
| `node speckit/index.js extract specs/change.spec.yaml -o /tmp/summary.md` | Generate summary to file | ~0.1 s |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `npm install` fails | Check `node --version` must be ≥ 18 |
| Tests fail | Run `npm install` first |
| Spec validation fails | Read the error — it names the exact field |
| Port 3000 in use | `PORT=3001 npm start` |
| Gate shows blocked unexpectedly | Run `npm run speckit:extract` locally to see the reason |
| PR comment not posted | Check `GITHUB_TOKEN` permissions (`pull-requests: write`) |

---

## SpecKit CLI Reference

```
Usage: node speckit/index.js <command> <spec-file> [options]

Commands:
  validate <spec>              Validate an app spec file
  generate <spec> [options]    Generate GitHub Actions workflow
    -o, --output <file>          Write to file (default: stdout)
    --dry-run                    Print to stdout without writing
  run <spec>                   Validate + generate + print full summary
  extract <spec> [options]     Extract metadata from a change spec
    -o, --output <file>          Write Markdown summary to file
    --env <environment>          Evaluate promotion gate for environment

Examples:
  node speckit/index.js validate specs/app.spec.yaml
  node speckit/index.js extract specs/change.spec.yaml
  node speckit/index.js extract specs/change.spec.yaml --env production
  node speckit/index.js extract specs/change.spec.yaml -o /tmp/summary.md
  node speckit/index.js generate specs/app.spec.yaml --dry-run
  node speckit/index.js run specs/app.spec.yaml
```

---

## Change Spec Reference

```yaml
# ── Required ──────────────────────────────────────────────────
change:
  title: string                 # Change title
  type: feature|fix|chore|breaking|release
  risk: low|medium|high
  breaking: true|false

# ── Optional ──────────────────────────────────────────────────
  description: string

  components:
    - name: string              # Required per component
      impact: new|modified|removed

  promotion:
    require_approvals: 1
    require_passing_tests: true
    require_security_scan: false
    environments:
      - staging
      - production

  refs:
    - "closes #42"
```

---

## Promotion Gate Rules

| Spec field | Staging | Production |
|---|---|---|
| `risk: low`, `breaking: false` | 🟢 Clear | 🟢 Clear |
| `risk: medium`, `breaking: false` | 🟢 Clear | 🟢 Clear |
| `risk: high`, `breaking: false` | 🟢 Clear | 🔴 Blocked |
| `risk: any`, `breaking: true` | 🟢 Clear | 🔴 Blocked |
| environment not in `promotion.environments` | 🔴 Blocked | 🔴 Blocked |
