# Contract: CI Workflow Interface

**File**: `.github/workflows/ci.yml` (NEW)
**Job name (stable contract)**: `ci`
**Producer of**: the required status check named `ci` that branch protection consumes (`contracts/branch-protection-rule.md`).
**FRs covered**: FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008.

## Trigger contract

The workflow MUST fire on every pull request whose **base** is `main`, including when new commits are pushed to an existing PR.

```yaml
on:
  pull_request:
    branches: [main]
```

GitHub's default `pull_request` activity types (`opened`, `synchronize`, `reopened`) cover all cases in FR-002. **Do not** narrow `types:` here — doing so would silently exclude commits pushed to an open PR.

## Job contract

```yaml
jobs:
  ci:
    name: ci                        # MUST remain "ci" — branch protection binds by this exact name
    runs-on: ubuntu-latest
    timeout-minutes: 15             # FR-008 — bounded completion
    steps:
      - uses: actions/checkout@v4

      # ---- Frontend (src/ai-genius-web/) ----
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: src/ai-genius-web/package-lock.json

      - name: Install web deps
        working-directory: src/ai-genius-web
        run: npm ci

      - name: Build web                       # FR-003
        working-directory: src/ai-genius-web
        run: npm run build

      - name: Test web                        # FR-005 — no-op-success if no `test` script yet
        working-directory: src/ai-genius-web
        run: npm test --if-present

      # ---- API (src/ai-genius-api/) ----
      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '9.0.x'

      - name: Build API                       # FR-004
        run: dotnet build src/ai-genius-api/ai-genius-api.csproj --configuration Release

      - name: Test API                        # FR-006 — no-op-success if no test project yet
        run: dotnet test ai-genius-s4-ep2-speckit.sln --configuration Release --no-build
```

## Invariants

| # | Invariant | Why |
|---|---|---|
| C1 | The job name is exactly `ci` (lowercase). | Branch protection references it by string match (`contracts/branch-protection-rule.md`); renaming silently breaks the gate. |
| C2 | The workflow is triggered ONLY by `pull_request` to `main`. | FR-002 + Simplicity. `push` to `main` is unnecessary (the merge already happened). |
| C3 | The job MUST NOT request any secrets. | CI does not deploy. Removes credential leakage surface. |
| C4 | Step ordering: web build → web test → api build → api test. | A failure in any earlier step short-circuits the run and surfaces the first failure clearly. |
| C5 | `timeout-minutes` MUST be set on the job. | FR-008; prevents hung runs from blocking merges indefinitely. |
| C6 | Only `actions/checkout`, `actions/setup-node`, `actions/setup-dotnet` may be used. | Constitution IV (Simplicity): first-party Actions only. |

## Observable outputs (for testing this contract)

| Output | How to observe |
|---|---|
| A `ci` status check appears on every PR to `main`. | PR "Checks" tab. |
| The check transitions `pending → success` for a passing PR, `pending → failure` for a failing one. | GitHub UI; mirrored to the merge box. |
| The check is reported within the 10-minute target (SC-006). | Workflow run "Total duration" field. |
| The check is reported within the 15-minute hard limit even on flake/hang (FR-008). | `timeout-minutes` enforces this. |

## Non-goals (explicitly NOT in this contract)

- Deployment. `ci.yml` MUST NOT deploy to Azure or any environment.
- Coverage gates, linting gates, or security-scan gates. Out of scope for this spec.
- Parallel/matrix splitting. Rejected in `research.md` §R3 for required-check stability.
