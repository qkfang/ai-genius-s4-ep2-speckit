# Research: Frontend Web App Deployment via GitHub Actions

**Feature**: `002-deploy-web` | **Date**: 2026-05-16  
**Phase**: 0 — Unknowns resolved before Phase 1 design

---

## Decision 1: Static Web Apps Deploy Action — skip_app_build pattern

- **Decision**: Use `Azure/static-web-apps-deploy@v1` with `skip_app_build: true` and `app_location: src/ai-genius-web/dist`
- **Rationale**: Building inside the SWA action requires configuring Oryx build system (Node version, framework detection). Since we control the build step explicitly with `actions/setup-node@v4` + `npm run build`, passing a pre-built `dist/` is simpler, faster, and more predictable. `output_location: ""` is set because the app is already built.
- **Alternatives considered**: Let SWA action build the app — rejected because it adds Oryx configuration complexity and obscures the Node version used.

---

## Decision 2: VITE_API_URL injection at build time

- **Decision**: Expose `VITE_API_URL` as a step-level `env:` variable sourced from `vars.VITE_API_URL` (GitHub Environment variable) on the `npm run build` step.
- **Rationale**: Vite replaces `import.meta.env.VITE_*` values at build time using `process.env.*`. Setting `VITE_API_URL` as an environment variable before running `vite build` causes the value to be baked into the static bundle. This is the standard Vite approach and requires no additional configuration.
- **Alternatives considered**: Runtime config file injected after build — rejected because it adds complexity and the URL is environment-specific and stable.

---

## Decision 3: GitHub Environments for per-environment variables

- **Decision**: The workflow job declares `environment: ${{ github.event.inputs.environment || 'dev' }}` so that GitHub loads the correct `vars.VITE_API_URL` for the target environment.
- **Rationale**: GitHub Environments scope variables and secrets to a named deployment context. Declaring `environment:` on the job grants access to that environment's `vars.*` and enables optional protection rules (required reviewers, wait timers) for `qa`/`prod` without workflow changes.
- **Alternatives considered**: Repository-level variables with naming convention (e.g., `VITE_API_URL_DEV`) — rejected because it doesn't scale cleanly and doesn't integrate with GitHub's environment protection rules.

---

## Decision 4: Node.js setup and npm cache

- **Decision**: Use `actions/setup-node@v4` with `node-version: '20'` and `cache: 'npm'` + `cache-dependency-path: src/ai-genius-web/package-lock.json`.
- **Rationale**: `cache: 'npm'` with a scoped `cache-dependency-path` restores the npm cache keyed on `package-lock.json`. For a React + Vite app with ~20 dependencies this typically saves 30–60 seconds per run. `node-version: '20'` satisfies the `engines.node: >=18.0.0` constraint in `package.json`.
- **Alternatives considered**: No caching — rejected because it adds avoidable run time; node-version: '18' — rejected because 20 is the current LTS and aligns with the AGENTS.md standard.

---

## Decision 5: Concurrency strategy

- **Decision**: `group: ${{ github.workflow }}-${{ github.ref }}`, `cancel-in-progress: true`.
- **Rationale**: Scoping by workflow + ref means concurrent pushes to `main` cancel the older run, preventing stale deploys. Different branches (e.g., a `workflow_dispatch` to `prod` while `dev` runs) use separate groups and do not interfere.
- **Alternatives considered**: No concurrency control — rejected because FR-007 and SC-003 explicitly require it.

---

## Decision 6: Azure login action version

- **Decision**: Use `azure/login@v1` with `creds: ${{ secrets.AZURE_CREDENTIALS }}` (service principal JSON).
- **Rationale**: Consistent with `001-deploy-infra.yml` which already uses `azure/login@v1` + `AZURE_CREDENTIALS`. The SWA deploy action internally uses the SWA token (`AZURE_STATIC_WEB_APPS_API_TOKEN`) and does not require Azure CLI auth — but including `azure/login@v1` keeps the pattern consistent and allows future az CLI steps (e.g., slot swaps) without workflow changes.
- **Alternatives considered**: OIDC with `azure/login@v2` — not adopted here to stay consistent with `001-deploy-infra.yml` and because the spec explicitly calls for `azure/login@v1` + `AZURE_CREDENTIALS`.

---

## All NEEDS CLARIFICATION items resolved

| # | Item | Resolution |
|---|------|-----------|
| 1 | How to pass pre-built dist to SWA action | `skip_app_build: true`, `app_location: src/ai-genius-web/dist` |
| 2 | How VITE_API_URL reaches the Vite build | Step-level `env: VITE_API_URL: ${{ vars.VITE_API_URL }}` before `npm run build` |
| 3 | How per-environment vars are scoped | Job-level `environment:` key activates GitHub Environment context |
| 4 | Node.js version and caching strategy | Node 20 LTS; `cache: npm` with scoped `cache-dependency-path` |
| 5 | Concurrency group scope | `${{ github.workflow }}-${{ github.ref }}` with `cancel-in-progress: true` |