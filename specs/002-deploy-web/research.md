# Research: React Frontend Web Deployment Workflow

## Decision: Reuse the infrastructure workflow trigger, environment, and concurrency pattern

**Rationale**: `.github/workflows/001-deploy-infra.yml` already defines the repository standard: trigger on `push` to `main`, support `workflow_dispatch` with `dev`, `qa`, and `prod`, default push-triggered runs to `dev`, bind the job to the selected GitHub environment, and cancel older in-progress runs using `${{ github.workflow }}-${{ github.ref }}`. Reusing the same shape keeps the demo path predictable and satisfies the specification directly.

**Alternatives considered**: A separate branch/environment matrix was rejected because the spec asks for one selected environment, not parallel multi-environment deployment. A different concurrency key was rejected because it would drift from the infrastructure workflow.

## Decision: Use Node.js 20 with npm lockfile caching

**Rationale**: The frontend package declares Node `>=18.0.0`, and repository guidance standardizes on `actions/setup-node@v4` with Node 20. `src/ai-genius-web/package-lock.json` exists, so `npm ci` and setup-node npm cache are the fastest simple CI path.

**Alternatives considered**: Node 18 would satisfy the package engine but would not follow the repository's current workflow standard. pnpm/yarn were rejected because the project uses npm and has a package lockfile.

## Decision: Build first and deploy only `src/ai-genius-web/dist`

**Rationale**: Vite is configured with `build.outDir = 'dist'`, and the spec requires generated build output only. Running `npm ci` and `npm run build` before deployment ensures dependency or build failures stop the workflow before the deployed site is touched.

**Alternatives considered**: Letting Azure Static Web Apps build the app was rejected because the spec requires the workflow to run `npm ci` and `npm run build`, then deploy `dist/`. Deploying source files was rejected because it violates FR-009 and the measurable outcome that successful deployments use generated output.

## Decision: Use `azure/login@v1` and `Azure/static-web-apps-deploy@v1` with secrets

**Rationale**: The spec explicitly requires Azure authentication through `secrets.AZURE_CREDENTIALS` and deployment through `secrets.AZURE_STATIC_WEB_APPS_API_TOKEN`. Both are official Azure actions already listed in repository guidance. `secrets.GITHUB_TOKEN` is passed only as the Static Web Apps repo token.

**Alternatives considered**: OIDC authentication was not selected because the feature specification requires `AZURE_CREDENTIALS`. Azure CLI deployment was rejected because the spec names the Static Web Apps deploy action.

## Decision: Treat Static Web Apps SKU as an infrastructure readiness check

**Rationale**: The frontend workflow deploys site content; it does not provision or change the Static Web Apps SKU. Existing Bicep parameter files set `dev` to `Free`, `qa` to `Free`, and `prod` to `Standard`, matching the requested `dev` and `prod` policy.

**Alternatives considered**: Adding SKU mutation to the frontend deployment workflow was rejected because it would duplicate infrastructure responsibility and violate the simplicity principle.
