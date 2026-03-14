// ============================================================
// modules/staticwebapp.bicep
//
// Provisions an Azure Static Web App to host the React
// frontend built from src/frontend.
// ============================================================

@description('Base name used to derive resource names.')
param appName string

@description('Azure region for the resource.')
param location string

@description('Deployment environment tag.')
@allowed(['development', 'staging', 'production'])
param environment string

@description('Static Web App pricing tier.')
@allowed(['Free', 'Standard'])
param sku string = 'Free'

// ── Resource ─────────────────────────────────────────────────

resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: '${appName}-frontend-${environment}'
  location: location
  tags: {
    app: appName
    component: 'frontend'
    environment: environment
    managedBy: 'bicep'
  }
  sku: {
    name: sku
    tier: sku
  }
  properties: {
    // Branch and repository are configured via CI/CD deployment token;
    // leave blank here so the resource can be deployed independently.
    repositoryUrl: ''
    branch: ''
    buildProperties: {
      appLocation: 'src/frontend'
      outputLocation: 'dist'
      apiLocation: ''
    }
  }
}

// ── Outputs ──────────────────────────────────────────────────

@description('Default hostname of the static web app (HTTPS).')
output url string = 'https://${staticWebApp.properties.defaultHostname}'

@description('Resource ID of the static web app.')
output resourceId string = staticWebApp.id

@description('Deployment token used by CI/CD to publish the site.')
output deploymentToken string = listSecrets(staticWebApp.id, staticWebApp.apiVersion).properties.apiKey
