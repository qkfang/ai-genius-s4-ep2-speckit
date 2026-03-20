# AI Genius Episode 2 — SpecKit: Practical DevOps Controls

> **Practical SpecKit DevOps: Turn Specs into CI/CD Controls with GitHub Actions**
>
> A hands-on streaming demo showing how a small, structured spec artifact
> can become a first-class input to DevOps automation — so merges and
> releases are gated by clear, reviewable requirements, not tribal knowledge.

---

## 📋 Session Overview

In many teams, CI/CD only validates code.
In this episode you will learn how to make the pipeline **validate intent**.
Using **SpecKit** and **GitHub Actions** you will create a structured spec
artifact for each change, wire the pipeline to enforce its presence, extract
risk and breaking-change metadata, generate a summary artifact, and apply
promotion rules that gate staging and production deployments.

### You Will Learn

- Why specs belong in version control alongside code
- How to enforce spec presence in CI so PRs without a spec are blocked
- How to extract risk level and breaking-change metadata from a spec
- How to generate an auditable summary artifact from a spec
- How to apply promotion rules that gate deployment to each environment

### Technologies Used

| Technology | Role |
|---|---|
| **SpecKit** | Spec parser, validator, extractor, and pipeline generator |
| **GitHub Actions** | CI/CD runner and spec-enforcement host |
| **Node.js 20** | Runtime for the sample app and SpecKit engine |
| **Express.js** | Sample application API |
| **js-yaml** | YAML parsing for specs |
| **Jest** | Testing framework |

---

## 🗂️ Project Structure

```
ai-genius-ep2-speckit/
│
├── specs/
│   ├── app.spec.yaml          # Application lifecycle spec (runtime, stages)
│   └── change.spec.yaml       # 🎯 Per-PR change spec — risk, breaking, promotion rules
│
├── src/
│   ├── app.js                 # Sample Express.js API application
│   └── routes/
│       └── health.js          # Health-check route
│
├── speckit/
│   ├── index.js               # SpecKit CLI entry point
│   └── lib/
│       ├── parser.js          # Reads & parses spec YAML files
│       ├── validator.js       # Validates app spec structure & values
│       ├── spec-extractor.js  # 🧠 Extracts risk/breaking metadata, evaluates gates
│       └── pipeline-generator.js  # Turns app spec into pipeline YAML
│
├── tests/
│   ├── app.test.js            # Express app tests
│   └── speckit.test.js        # SpecKit engine tests (57 tests)
│
└── .github/
    └── workflows/
        ├── ci.yml                    # Standard CI workflow
        ├── spec-enforcer.yml         # 🔒 Enforce spec presence on every PR
        ├── spec-gate.yml             # 🚦 Apply promotion rules from spec
        ├── spec-driven-pipeline.yml  # Agentic spec-driven pipeline
        └── generate-pipeline.yml     # Auto-generates pipeline when spec changes
```

---

## 🚀 Quick Start

```bash
# 1. Clone and install
git clone https://github.com/qkfang/ai-genius-ep2-speckit
cd ai-genius-ep2-speckit
npm install

# 2. Validate the app spec
npm run speckit:validate

# 3. Extract metadata from the change spec
npm run speckit:extract

# 4. Generate a pipeline from the app spec
npm run speckit:generate

# 5. Run the full SpecKit demo
node speckit/index.js run specs/app.spec.yaml

# 6. Start the sample API
npm start
```

---

## 🧠 How SpecKit Controls Work

### The Change Spec (`specs/change.spec.yaml`)

Every pull request includes a `change.spec.yaml` that declares:

```yaml
change:
  title: "Add user-facing health dashboard"
  type: feature          # feature | fix | chore | breaking | release
  risk: low              # low | medium | high
  breaking: false

  components:
    - name: api-gateway
      impact: modified

  promotion:
    require_approvals: 1
    environments:
      - staging
      - production
```

### Enforcement in GitHub Actions

| Workflow | What it does |
|---|---|
| `spec-enforcer.yml` | Blocks the PR if `change.spec.yaml` is missing or invalid |
| `spec-gate.yml` | Reads the spec, evaluates promotion gates, blocks deploy if needed |

### Promotion Gate Logic

| Condition | Staging | Production |
|---|---|---|
| `risk: low`, `breaking: false` | 🟢 Clear | 🟢 Clear |
| `risk: high` | 🟢 Clear | 🔴 Blocked |
| `breaking: true` | 🟢 Clear | 🔴 Blocked |

---

## 🔄 GitHub Actions Workflows

### 1. `spec-enforcer.yml` — Enforce Spec Presence ⭐

Runs on every PR. It:
1. **Checks** that `specs/change.spec.yaml` exists in the PR branch
2. **Validates** the spec with SpecKit (schema, required fields)
3. **Extracts** risk level, breaking flag, and component count
4. **Posts** a summary comment on the PR so reviewers see intent up front
5. **Uploads** the summary as an artifact for audit trail

### 2. `spec-gate.yml` — Apply Promotion Rules ⭐

Runs on push/PR. It:
1. **Reads** `specs/change.spec.yaml` for risk and promotion rules
2. **Evaluates** promotion gates for staging and production
3. **Blocks** deployment jobs if the gate fails
4. **Uploads** a spec gate summary artifact

### 3. `ci.yml` — Standard CI

Runs lint → build → test with coverage upload.

### 4. `spec-driven-pipeline.yml` — Agentic Spec-Driven Pipeline

Reads `specs/app.spec.yaml` and conditionally runs jobs based on spec contents.

### 5. `generate-pipeline.yml` — Self-Updating Pipeline

When `specs/app.spec.yaml` changes, regenerates the pipeline and opens a PR.

---

## 🎯 Demo Walkthrough (60 min)

See [`docs/guide.md`](docs/guide.md) for the full step-by-step presenter guide.

| Section | Topic | Clock |
|---|---|---|
| Part 1 | End state and why it matters | 0 – 5 min |
| Part 2 | The change spec artifact | 5 – 15 min |
| Part 3 | Enforce spec presence in CI | 15 – 25 min |
| Part 4 | Extract metadata and generate summary | 25 – 40 min |
| Part 5 | Apply promotion rules | 40 – 55 min |
| Part 6 | Live demo: full loop | 55 – 60 min |

---

## 🧪 Running Tests

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run only SpecKit tests
npx jest tests/speckit.test.js
```

All 57 tests should pass:
- **SpecKit Parser** — 6 tests
- **SpecKit Validator** — 9 tests
- **SpecKit Pipeline Generator** — 13 tests
- **SpecKit Spec Extractor** — 25 tests
- **Express App** — 4 tests

---

## ⚙️ SpecKit CLI Reference

```
Usage: speckit [options] [command]

Agentic DevOps: turn specs into CI/CD pipelines

Commands:
  validate <spec>              Validate an app spec file
  generate <spec> [options]    Generate a GitHub Actions workflow from an app spec
  run <spec>                   Validate and generate a pipeline, printing a full summary
  extract <spec> [options]     Extract risk/breaking metadata from a change spec
  help [command]               display help for command
```

### `speckit extract` options

| Option | Description |
|---|---|
| `-o, --output <file>` | Write Markdown summary to this file path |
| `--env <environment>` | Evaluate the promotion gate for the given environment |

---

## 📝 Change Spec Reference

```yaml
# ── Required ──────────────────────────────────────────────────
change:
  title: string               # Change title (required)
  type: feature|fix|chore|breaking|release   # Required
  risk: low|medium|high       # Required
  breaking: true|false        # Required

# ── Optional ──────────────────────────────────────────────────
  description: string

  components:
    - name: string            # Component name (required)
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

## 🤝 Who Should Attend

- DevOps engineers and platform engineers
- Developers working with GitHub-based CI/CD
- Teams looking to gate merges and releases on clear, reviewable specs
- Anyone interested in making CI/CD validate intent, not just code

