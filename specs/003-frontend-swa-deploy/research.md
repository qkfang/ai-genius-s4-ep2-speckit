# Research: Frontend Static Web App Deployment

**Phase**: 0 — Outline & Research  
**Feature**: `003-frontend-swa-deploy`

---

## 1. VITE_API_URL Injection at CI Runtime

**Decision**: Copy `.env.example` to `.env` and patch the `VITE_API_URL` line with `sed` before `npm run build`.

**Rationale**: Vite automatically loads `.env` at build time via its built-in env handling (`import.meta.env.VITE_*`). Using `sed -i` on a generated file is idiomatic CI practice that:
- Keeps the template (`.env.example`) in source control as documentation
- Never commits the actual `.env` with real values
- Requires no extra Node packages or custom scripts
- Produces a deterministic, single-value override

**Alternatives considered**:
- Passing `--mode` with a committed `.env.production` file — rejected because it would commit environment-specific URLs to the repo
- Using GitHub Actions `env:` to set `VITE_API_URL` as a process env — rejected because Vite only reads `.env` files by default; process env is not picked up unless explicitly configured
- Using `echo "VITE_API_URL=$URL" >> .env` — acceptable but `.env.example` copy pattern is cleaner and self-documenting

---

## 2. Node.js Version Selection

**Decision**: Node.js 20 (`node-version: '20'`).

**Rationale**: Matches the standard defined in `AGENTS.md`. Node 20 is LTS, supported by `@vitejs/plugin-react` 4.x and React 18. Using `actions/setup-node@v4` with `cache: 'npm'` and `cache-dependency-path` pointing to `src/ai-genius-web/package-lock.json` speeds up installs via GitHub Actions caching.

**Alternatives considered**:
- Node 18 (previous LTS) — still supported but Node 20 is the project standard
- Node 22 — not yet LTS at time of writing; unnecessary upgrade risk

---

## 3. `Azure/static-web-apps-deploy@v1` Configuration

**Decision**: Set `skip_app_build: true`, `app_location: src/ai-genius-web/dist`, `output_location: ""`.

**Rationale**: The action supports two modes — let it build the app, or deploy a pre-built artifact. Since we build with `npm run build` in a prior step, using `skip_app_build: true` ensures:
- The build step is the single gate for build failures (consistent with FR-009)
- No double-build (faster, no second `npm install` inside the action container)
- `output_location: ""` is correct when `app_location` already points to the compiled output folder

**Alternatives considered**:
- Letting SWA action do the build (omit `skip_app_build`) — rejected because it cannot inject `VITE_API_URL` from the patched `.env`, and mixing two build phases is confusing

---

## 4. `azure/login@v1` Requirement

**Decision**: Include `azure/login@v1` with `creds: ${{ secrets.AZURE_CREDENTIALS }}` (FR-006).

**Rationale**: Required by the spec. For `Azure/static-web-apps-deploy@v1`, the deployment token alone (`AZURE_STATIC_WEB_APPS_API_TOKEN`) is typically sufficient — but the spec explicitly mandates the Azure login step for consistency with other workflows (`001-deploy-infra.yml`, `003-deploy-api.yml`).

**Alternatives considered**:
- Omitting `azure/login@v1` — rejected; spec FR-006 is explicit

---

## 5. Concurrency & Environment Pattern

**Decision**: Mirror `001-deploy-infra.yml` exactly:
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  ENVIRONMENT: ${{ github.event.inputs.environment || 'dev' }}
```
Job-level `environment: ${{ github.event.inputs.environment || 'dev' }}` activates GitHub environment protection rules.

**Rationale**: FR-003 and FR-010 mandate this pattern. Matching the infra workflow means operators need no new knowledge to manage the frontend workflow.

**Alternatives considered**: None — the pattern is mandated by the spec.

---

## 6. Spec Front-Matter Gap

**Finding**: `specs/003-frontend-swa-deploy/spec.md` does not have the required YAML front-matter block (`risk`, `breaking`, `reviewer-team`) defined in the constitution.

**Decision**: This must be added to `spec.md` as part of the implementation task before the PR merges to `main`. It is a pre-merge requirement, not a blocker for planning.

---

## All Clarifications Resolved

All technical unknowns identified during constitution check are now resolved. Phase 1 design can proceed.
