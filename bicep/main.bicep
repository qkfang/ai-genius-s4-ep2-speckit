targetScope = 'resourceGroup'

// ── Parameters ───────────────────────────────────────────────

@description('Base name used to derive all resource names.')
@minLength(3)
@maxLength(20)
param appName string = 'aigenius'

@description('Azure region for all resources.')
param location string = resourceGroup().location

@description('Deployment environment tag (development | staging | production).')
@allowed(['development', 'staging', 'production'])
param environment string = 'development'

@description('SKU for the App Service Plan.')
@allowed(['F1', 'B1', 'B2', 'S1'])
param appServicePlanSku string = 'B1'

@description('SKU for the Static Web App.')
@allowed(['Free', 'Standard'])
param staticWebAppSku string = 'Free'

// ── Modules ──────────────────────────────────────────────────

module staticWebApp 'modules/staticwebapp.bicep' = {
  name: 'staticWebAppDeploy'
  params: {
    appName: appName
    location: location
    environment: environment
    sku: staticWebAppSku
  }
}

module webApp 'modules/webapp.bicep' = {
  name: 'webAppDeploy'
  params: {
    appName: appName
    location: location
    environment: environment
    appServicePlanSku: appServicePlanSku
  }
}

// ── Outputs ──────────────────────────────────────────────────

@description('URL of the deployed React static web app.')
output staticWebAppUrl string = staticWebApp.outputs.url

@description('Default hostname of the Node.js web app.')
output nodeAppHostname string = webApp.outputs.hostname

@description('Resource ID of the App Service.')
output nodeAppResourceId string = webApp.outputs.resourceId

@description('Deployment token for the Azure Static Web App CI/CD.')
output staticWebAppToken string = staticWebApp.outputs.deploymentToken
