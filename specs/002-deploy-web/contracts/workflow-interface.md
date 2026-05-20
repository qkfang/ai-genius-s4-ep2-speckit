# Contract: Frontend Deployment Workflow

## Workflow File

`.github/workflows/002-deploy-web.yml`

## External Interface

This feature exposes a GitHub Actions workflow interface for repository maintainers and operators.

## Triggers

| Trigger             | Contract                                              |
| ------------------- | ----------------------------------------------------- |
| `push`              | Runs automatically for pushes to `main`               |
| `workflow_dispatch` | Allows manual runs with required `environment` choice |

### `workflow_dispatch.inputs.environment`

| Property      | Value                |
| ------------- | -------------------- |
| `description` | `Target environment` |
| `required`    | `true`               |
| `default`     | `dev`                |
| `type`        | `choice`             |
| `options`     | `dev`, `qa`, `prod`  |

## Concurrency

```yaml
concurrency:
    group: ${{ github.workflow }}-${{ github.ref }}
    cancel-in-progress: true
```

## Required Environment Values

| Name           | Source                               | Required By                          |
| -------------- | ------------------------------------ | ------------------------------------ | --------- | ---------------------------------------------- |
| `ENVIRONMENT`  | `${{ github.event.inputs.environment |                                      | 'dev' }}` | Job environment binding and deployment context |
| `APP_NAME`     | `${{ vars.APP_NAME }}`               | Alignment with infrastructure naming |
| `VITE_API_URL` | `${{ vars.VITE_API_URL }}`           | Vite production build                |

## Required Secrets

| Name                              | Used By                           | Contract                                    |
| --------------------------------- | --------------------------------- | ------------------------------------------- |
| `AZURE_CREDENTIALS`               | `azure/login@v1`                  | Passed as `creds`                           |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | `Azure/static-web-apps-deploy@v1` | Passed as `azure_static_web_apps_api_token` |
| `GITHUB_TOKEN`                    | `Azure/static-web-apps-deploy@v1` | Passed as `repo_token` only                 |

## Job Contract

| Step                  | Contract                                                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Checkout              | Uses `actions/checkout@v4`                                                                                                                              |
| Node setup            | Uses `actions/setup-node@v4` with Node 20 and npm cache for `src/ai-genius-web/package-lock.json`                                                       |
| Install dependencies  | Runs `npm ci` in `src/ai-genius-web`                                                                                                                    |
| Build frontend        | Runs `npm run build` in `src/ai-genius-web` with `VITE_API_URL` available                                                                               |
| Azure login           | Uses `azure/login@v1` with `secrets.AZURE_CREDENTIALS`                                                                                                  |
| Deploy Static Web App | Uses `Azure/static-web-apps-deploy@v1` with `action: upload`, `app_location: src/ai-genius-web/dist`, `output_location: ""`, and `skip_app_build: true` |

## Failure Contract

The workflow must fail if dependency installation, build, Azure authentication, or Static Web Apps deployment fails. A failed run must not report a successful deployment.
