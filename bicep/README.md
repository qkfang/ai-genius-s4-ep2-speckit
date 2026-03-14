# Azure Infrastructure — Bicep

This folder contains the Infrastructure-as-Code (IaC) to deploy the AI Genius SpecKit apps to Azure.

## Structure

```
bicep/
├── main.bicep                  # Orchestrates all modules
└── modules/
    ├── staticwebapp.bicep      # Azure Static Web App (React frontend)
    └── webapp.bicep            # Azure App Service + Plan (Node.js app)
```

## Resources deployed

| Resource | Purpose |
|---|---|
| **Azure Static Web App** | Hosts the built React app (`src/frontend`) |
| **Azure App Service Plan** | Compute plan for the Node.js web app |
| **Azure App Service** | Runs the Node.js app (`src/node-app`) |

## Deploy

```bash
# Login
az login

# Create a resource group (one-time)
az group create --name rg-aigenius-dev --location eastus

# Deploy
az deployment group create \
  --resource-group rg-aigenius-dev \
  --template-file bicep/main.bicep \
  --parameters appName=aigenius environment=development
```

## Parameters

| Parameter | Default | Description |
|---|---|---|
| `appName` | `aigenius` | Base name for all resources |
| `location` | resource group location | Azure region |
| `environment` | `development` | `development`, `staging`, or `production` |
| `appServicePlanSku` | `B1` | App Service Plan SKU (`F1`, `B1`, `B2`, `S1`) |
| `staticWebAppSku` | `Free` | Static Web App tier (`Free` or `Standard`) |
