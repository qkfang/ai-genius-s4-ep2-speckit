# Contract: 004-multi-env-ci.yml Workflow

> Interface contract for the multi-environment Bicep CI pipeline.

---

## Trigger Contract

| Attribute | Value |
|-----------|-------|
| Event | `pull_request` |
| Base branch | `main` |
| Head branch | any |
| Manual trigger | not exposed (`workflow_dispatch` not added — PR-only by design) |

---

## Concurrency Contract

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

- One active run per workflow + ref combination.
- New pushes to the PR branch cancel the in-progress run.

---

## Job Interface Contract

Each job follows this consistent interface:

```
Inputs  : AZURE_CREDENTIALS (secret), AZURE_RESOURCE_GROUP (var), APP_NAME (var)
Runtime : ubuntu-latest
Auth    : azure/login@v1 with AZURE_CREDENTIALS
```

| Job | `needs` | `environment` | Azure CLI command |
|-----|---------|--------------|-------------------|
| `validate` | — | `dev` | `az deployment group validate` |
| `plan-dev` | `validate` | `dev` | `az deployment group what-if` |
| `deploy-dev` | `plan-dev` | `dev` | `az deployment group create` |
| `plan-qa` | `deploy-dev` | `qa` | `az deployment group what-if` |
| `deploy-qa` | `plan-qa` | `qa` | `az deployment group create` |
| `plan-prod` | `deploy-qa` | `prod` | `az deployment group what-if` |
| `deploy-prod` | `plan-prod` | `prod` | `az deployment group create` |

---

## Parameter File Contract

Each environment parameter file (`bicep/parameters.<env>.json`) MUST conform
to the ARM deployment parameters schema:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "appName":            { "value": "<string>" },
    "environment":        { "value": "dev | qa | prod" },
    "appServicePlanSku":  { "value": "F1 | B1 | B2 | S1" },
    "staticWebAppSku":    { "value": "Free | Standard" }
  }
}
```

`location` is intentionally omitted — it defaults to `resourceGroup().location`
in `main.bicep`, ensuring the deployment lands in the resource group's region.

---

## GitHub Environment Contract

The workflow declares the following `environment:` keys.  GitHub resolves
protection rules from **Settings → Environments** at runtime.

| Key | Protection | Secrets/vars inherited |
|-----|-----------|----------------------|
| `dev` | none | `AZURE_CREDENTIALS`, `AZURE_RESOURCE_GROUP`, `APP_NAME` |
| `qa` | required reviewers | same + any env-level overrides |
| `prod` | required reviewers | same + any env-level overrides |

---

## Output Contract (from `az deployment group create`)

The ARM deployment outputs from `main.bicep` are printed to the Actions log
but are **not** captured as job outputs.  Downstream jobs do not depend on
them.  If output passing is needed in future, add:

```yaml
- name: Capture outputs
  run: |
    echo "STATIC_URL=$(az deployment group show ... --query properties.outputs.staticWebAppUrl.value -o tsv)" >> $GITHUB_ENV
```
