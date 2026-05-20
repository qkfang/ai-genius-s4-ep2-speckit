# Data Model: React Frontend Web Deployment Workflow

## Entity: Frontend Deployment Workflow

**Purpose**: GitHub Actions workflow that builds `src/ai-genius-web` and publishes the generated `dist/` directory to Azure Static Web Apps.

**Fields**:

| Field                    | Type       | Validation                                          |
| ------------------------ | ---------- | --------------------------------------------------- |
| `fileName`               | string     | Must be `.github/workflows/002-deploy-web.yml`      |
| `triggerPushBranches`    | list       | Must include `main`                                 |
| `manualEnvironmentInput` | enum       | Must allow `dev`, `qa`, `prod`; default `dev`       |
| `concurrencyGroup`       | expression | Must use `${{ github.workflow }}-${{ github.ref }}` |
| `cancelInProgress`       | boolean    | Must be `true`                                      |
| `jobEnvironment`         | expression | Must resolve to selected input or `dev`             |
| `appDirectory`           | path       | Must be `src/ai-genius-web`                         |
| `buildOutput`            | path       | Must be `src/ai-genius-web/dist`                    |

**Relationships**: Uses Target Environment, Frontend API URL Variable, Application Name Variable, Azure Credentials Secret, and Static Web Apps Deployment Token.

## Entity: Target Environment

**Purpose**: Deployment target selected by manual dispatch or defaulted for push runs.

**Fields**:

| Field               | Type   | Validation                                |
| ------------------- | ------ | ----------------------------------------- |
| `name`              | enum   | One of `dev`, `qa`, `prod`                |
| `source`            | enum   | `workflow_dispatch` input or push default |
| `githubEnvironment` | string | Must match the resolved environment name  |

**State transitions**: `requested` -> `building` -> `deploying` -> `deployed` or `failed`.

## Entity: Frontend Build Output

**Purpose**: Static assets produced by the Vite production build.

**Fields**:

| Field             | Type   | Validation                                  |
| ----------------- | ------ | ------------------------------------------- |
| `sourceDirectory` | path   | Must be `src/ai-genius-web`                 |
| `outputDirectory` | path   | Must be `dist` relative to source directory |
| `buildCommand`    | string | Must be `npm run build`                     |
| `installCommand`  | string | Must be `npm ci`                            |

**Relationships**: Produced by the Frontend Deployment Workflow and consumed by the Static Web Apps deployment step.

## Entity: Frontend API URL Variable

**Purpose**: Build-time API endpoint consumed by the Vite frontend.

**Fields**:

| Field    | Type   | Validation                                         |
| -------- | ------ | -------------------------------------------------- |
| `name`   | string | Must be `VITE_API_URL`                             |
| `source` | string | Must be GitHub Actions `vars.VITE_API_URL`         |
| `scope`  | string | Repository or selected GitHub environment variable |

## Entity: Application Name Variable

**Purpose**: Shared application naming value aligned with the infrastructure workflow.

**Fields**:

| Field    | Type   | Validation                             |
| -------- | ------ | -------------------------------------- |
| `name`   | string | Must be `APP_NAME`                     |
| `source` | string | Must be GitHub Actions `vars.APP_NAME` |

## Entity: Static Web Apps SKU Policy

**Purpose**: Environment readiness rule for the Azure Static Web Apps resource.

**Fields**:

| Field     | Type | Validation                           |
| --------- | ---- | ------------------------------------ |
| `devSku`  | enum | Must be `Free`                       |
| `prodSku` | enum | Must be `Standard`                   |
| `qaSku`   | enum | Follows existing provisioning policy |

**Relationships**: Enforced by Bicep parameter files and reviewed before environment readiness is considered complete.

## Entity: Azure Credentials Secret

**Purpose**: Service principal JSON used by `azure/login@v1`.

**Fields**:

| Field    | Type   | Validation                                    |
| -------- | ------ | --------------------------------------------- |
| `name`   | string | Must be `AZURE_CREDENTIALS`                   |
| `source` | string | Must be GitHub Secrets                        |
| `usage`  | string | Must be passed to `azure/login@v1` as `creds` |

## Entity: Static Web Apps Deployment Token

**Purpose**: Deployment token used by `Azure/static-web-apps-deploy@v1` to publish static assets.

**Fields**:

| Field    | Type   | Validation                                          |
| -------- | ------ | --------------------------------------------------- |
| `name`   | string | Must be `AZURE_STATIC_WEB_APPS_API_TOKEN`           |
| `source` | string | Must be GitHub Secrets                              |
| `usage`  | string | Must be passed as `azure_static_web_apps_api_token` |
