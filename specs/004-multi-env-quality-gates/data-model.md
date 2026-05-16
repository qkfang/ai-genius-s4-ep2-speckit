# Data Model: Multi-Environment Bicep Pipeline

> Phase 1 output for `004-multi-env-quality-gates`.

---

## Pipeline Stage Graph

```
pull_request → main
        │
        ▼
   ┌─────────┐
   │validate │  az deployment group validate (dev params)
   └────┬────┘
        │
        ▼
   ┌──────────┐
   │ plan-dev │  az deployment group what-if  (dev params)
   └────┬─────┘
        │
        ▼
   ┌────────────┐
   │ deploy-dev │  az deployment group create  (dev params)
   └─────┬──────┘
         │
         ▼
   ┌─────────┐   ← GitHub Environment "qa" (required reviewers)
   │ plan-qa │  az deployment group what-if  (qa params)
   └────┬────┘
        │
        ▼
   ┌───────────┐   ← GitHub Environment "qa"
   │ deploy-qa │  az deployment group create  (qa params)
   └─────┬─────┘
         │
         ▼
   ┌──────────┐   ← GitHub Environment "prod" (required reviewers)
   │ plan-prod│  az deployment group what-if  (prod params)
   └────┬─────┘
        │
        ▼
   ┌────────────┐   ← GitHub Environment "prod"
   │deploy-prod │  az deployment group create  (prod params)
   └────────────┘
```

---

## Environment Parameter Matrix

| Parameter | dev | qa | prod |
|-----------|-----|----|------|
| `appName` | `aigenius4` | `aigenius4` | `aigenius4` |
| `environment` | `dev` | `qa` | `prod` |
| `appServicePlanSku` | `B1` | `B1` | `B2` |
| `staticWebAppSku` | `Free` | `Free` | `Standard` |
| `location` | *(resource group location)* | *(resource group location)* | *(resource group location)* |

---

## GitHub Secrets & Variables

| Name | Type | Scope | Used by |
|------|------|-------|---------|
| `AZURE_CREDENTIALS` | Secret | Repository | All jobs (Azure login) |
| `AZURE_RESOURCE_GROUP` | Variable | Repository / per-env | All jobs |
| `APP_NAME` | Variable | Repository | All jobs |

> **Note**: If resource groups differ per environment, override
> `AZURE_RESOURCE_GROUP` at the GitHub Environment level rather than at
> repository level.

---

## GitHub Environments

| Environment | Approval required | Deployment branch filter |
|-------------|-------------------|--------------------------|
| `dev` | No | Any (PR branch) |
| `qa` | Yes — 1 required reviewer | Any (PR branch) |
| `prod` | Yes — 1 required reviewer | Any (PR branch) |

---

## Bicep Resource Tags (per Constitution II)

All resources provisioned by `main.bicep` are tagged via module parameters:

| Tag | Value |
|-----|-------|
| `app` | `$appName` |
| `component` | module-specific (`api` / `web`) |
| `environment` | `dev` / `qa` / `prod` |
| `managedBy` | `bicep` |
