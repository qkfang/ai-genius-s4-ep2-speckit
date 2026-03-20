// ============================================================
// modules/webapp.bicep
//
// Provisions an Azure App Service Plan and Web App to run
// the Node.js application from src/node-app.
// ============================================================

@description('Base name used to derive resource names.')
param appName string

@description('Azure region for the resources.')
param location string

@description('Deployment environment tag.')
@allowed(['development', 'staging', 'production'])
param environment string

@description('App Service Plan SKU.')
@allowed(['F1', 'B1', 'B2', 'S1'])
param appServicePlanSku string = 'B1'

@description('.NET runtime version for the web app.')
param dotnetVersion string = 'DOTNETCORE|10.0'

// ── App Service Plan ─────────────────────────────────────────

resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: '${appName}-plan-${environment}'
  location: location
  tags: {
    app: appName
    component: 'node-app'
    environment: environment
    managedBy: 'bicep'
  }
  sku: {
    name: appServicePlanSku
  }
  kind: 'linux'
  properties: {
    reserved: true // required for Linux plans
  }
}

// ── Web App ───────────────────────────────────────────────────

resource webApp 'Microsoft.Web/sites@2023-01-01' = {
  name: '${appName}-nodeapp-${environment}'
  location: location
  tags: {
    app: appName
    component: 'node-app'
    environment: environment
    managedBy: 'bicep'
  }
  kind: 'app,linux'
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: dotnetVersion
      alwaysOn: appServicePlanSku != 'F1'
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      appSettings: [
        {
          name: 'NODE_ENV'
          value: environment
        }
        {
          name: 'ASPNETCORE_ENVIRONMENT'
          value: environment
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
      ]
    }
  }
}

// ── Outputs ──────────────────────────────────────────────────

@description('Default hostname of the web app.')
output hostname string = webApp.properties.defaultHostName

@description('Resource ID of the web app.')
output resourceId string = webApp.id

@description('Resource ID of the App Service Plan.')
output planResourceId string = appServicePlan.id
