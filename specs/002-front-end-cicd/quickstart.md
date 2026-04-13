# Quickstart: Frontend CI/CD Deployment

**Feature**: 002-front-end-cicd  
**Last Updated**: 2026-04-13

## Overview

Automated deployment pipeline that builds and deploys the React frontend (`src/ai-genius-web`) to Azure Static Web Apps on every push to `main`. Uses OIDC for secure authentication without storing credentials.

---

## Prerequisites

Before the workflow can run successfully, ensure:

### 1. Azure Resources Exist

- [ ] **Azure Static Web Apps resource** provisioned
- [ ] **Resource name noted** (e.g., `ai-genius-frontend-prod`)

### 2. Azure AD Federated Credential Configured

- [ ] **App Registration** created in Azure AD
- [ ] **Federated credential** added targeting GitHub repository:
  - Entity type: `Environment`, `Branch`, or `Tag`
  - GitHub repository: `<owner>/<repo>`
  - Entity: `main` (for branch-based)
- [ ] **App Registration assigned** `Contributor` role on Static Web Apps resource

### 3. GitHub Secrets Configured

Navigate to repository **Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret Name | Value (from Azure) | How to Find |
|------------|-------------------|-------------|
| `AZURE_CLIENT_ID` | App Registration Application (client) ID | Azure Portal → Azure AD → App Registrations → [Your App] → Overview |
| `AZURE_TENANT_ID` | Azure AD Directory (tenant) ID | Azure Portal → Azure AD → Overview |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID | Azure Portal → Subscriptions → [Your Subscription] → Overview |

### 4. Repository Structure Valid

- [ ] `src/ai-genius-web/package.json` exists
- [ ] `src/ai-genius-web/package-lock.json` committed (run `npm install` if missing)
- [ ] `npm run build` succeeds locally

---

## First-Time Setup

### Step 1: Verify Local Build

```bash
# Navigate to frontend directory
cd src/ai-genius-web

# Install dependencies
npm install

# Run build (should complete with exit code 0)
npm run build

# Verify dist/ directory created
ls dist/
```

**Expected Output**: `dist/index.html`, `dist/assets/`, and other build artifacts.

---

### Step 2: Configure GitHub Secrets

**Option A: Via GitHub Web UI**

1. Go to `https://github.com/<owner>/<repo>/settings/secrets/actions`
2. Click **New repository secret**
3. Add each secret (name = exact key from table above, value = GUID from Azure)
4. Click **Add secret**

**Option B: Via GitHub CLI** (if installed)

```bash
gh secret set AZURE_CLIENT_ID --body "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
gh secret set AZURE_TENANT_ID --body "b2c3d4e5-f6g7-8901-bcde-fg2345678901"
gh secret set AZURE_SUBSCRIPTION_ID --body "c3d4e5f6-g7h8-9012-cdef-gh3456789012"
```

---

### Step 3: Create Workflow File

Create `.github/workflows/deploy-web.yml`:

```yaml
name: Deploy Frontend to Azure Static Web Apps

on:
  push:
    branches:
      - main

permissions:
  id-token: write
  contents: read

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: src/ai-genius-web/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: src/ai-genius-web

      - name: Build application
        run: npm run build
        working-directory: src/ai-genius-web

      - name: Azure Login (OIDC)
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Deploy to Azure Static Web Apps
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: 'upload'
          app_location: 'src/ai-genius-web/dist'
          skip_app_build: true
```

**Note**: If using OIDC authentication exclusively, the `Azure/static-web-apps-deploy` step may need to be replaced with Azure CLI commands (`az staticwebapp`) after the Azure Login step. The example above shows the API token method; adjust based on final implementation.

---

### Step 4: Test Deployment

**Trigger Workflow**:

```bash
# Make a trivial change to test deployment
cd src/ai-genius-web/src
echo "// Test deployment $(date)" >> App.jsx

# Commit and push to main
git add .
git commit -m "Test: Trigger frontend deployment workflow"
git push origin main
```

**Monitor Workflow**:

1. Open `https://github.com/<owner>/<repo>/actions`
2. Click on latest workflow run: **Deploy Frontend to Azure Static Web Apps**
3. Watch each step complete (green checks)

**Expected Duration**: 3-5 minutes

**Verify Deployment**:

Visit your Azure Static Web Apps URL (e.g., `https://my-app.azurestaticapps.net`) and confirm the updated site is live.

---

## Daily Usage

Once set up, the workflow runs automatically:

### Automatic Deployment

1. **Developer pushes to `main`** (or merges PR):
   ```bash
   git checkout main
   git pull
   # Make changes to src/ai-genius-web/src/*
   git add .
   git commit -m "feat: Add new component"
   git push origin main
   ```

2. **Workflow triggers automatically** within 30 seconds

3. **Deployment completes** within 5 minutes

4. **Site updates** are live at Static Web Apps URL

**No manual intervention required.**

---

### Viewing Workflow Status

**GitHub Actions Tab**:
- ✅ Green check = Deployment succeeded
- ❌ Red X = Deployment failed
- 🟡 Yellow dot = Workflow running

**Click on workflow run** to see:
- Step-by-step logs
- Error messages (if failed)
- Deployment duration

---

## Troubleshooting

### Workflow Doesn't Trigger

**Symptoms**: No workflow run appears in Actions tab after push.

**Diagnostic**:
1. Verify push was to `main` branch: `git branch --show-current`
2. Check workflow file exists: `ls .github/workflows/deploy-web.yml`
3. Verify workflow file syntax: Use [GitHub Actions validator](https://rhysd.github.io/actionlint/)

---

### Build Fails: "SyntaxError: Unexpected token"

**Symptoms**: Workflow fails at "Build application" step.

**Diagnostic**:
1. Run `npm run build` locally in `src/ai-genius-web`
2. Fix syntax errors reported by Vite
3. Commit fix and push

**Example**:
```bash
cd src/ai-genius-web
npm run build
# Fix errors shown in output
git add .
git commit -m "fix: Resolve build syntax errors"
git push origin main
```

---

### Build Fails: "npm error code ENOENT"

**Symptoms**: Workflow fails at "Install dependencies" step with `package-lock.json not found`.

**Fix**:
```bash
cd src/ai-genius-web
npm install  # Regenerates package-lock.json
git add package-lock.json
git commit -m "chore: Add package-lock.json"
git push origin main
```

---

### Azure Login Fails: "InvalidFederatedCredential"

**Symptoms**: Workflow fails at "Azure Login (OIDC)" step.

**Diagnostic**:
1. Verify GitHub Secrets are set (Settings → Secrets)
2. Verify federated credential in Azure AD App Registration:
   - Issuer: `https://token.actions.githubusercontent.com`
   - Subject: `repo:<owner>/<repo>:ref:refs/heads/main`
3. Verify App Registration has correct permissions on Static Web Apps resource

**Fix**: Update federated credential configuration in Azure Portal → Azure AD → App Registrations → [Your App] → Certificates & secrets → Federated credentials.

---

### Deploy Fails: "Secret AZURE_STATIC_WEB_APPS_API_TOKEN not found"

**Symptoms**: Workflow fails at "Deploy to Azure Static Web Apps" step.

**Fix**:
1. Obtain deployment token from Azure Portal:
   - Navigate to Static Web Apps resource
   - Click "Manage deployment token"
   - Copy token value
2. Add as GitHub Secret:
   - Repository Settings → Secrets → New secret
   - Name: `AZURE_STATIC_WEB_APPS_API_TOKEN`
   - Value: [paste token]

---

### Site Not Updating After Successful Deployment

**Symptoms**: Workflow shows green check, but Static Web Apps site shows old content.

**Diagnostic**:
1. Check deployment history in Azure Portal → Static Web Apps → Deployments
2. Wait 1-2 minutes for CDN cache invalidation
3. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
4. Check in private/incognito window (bypass browser cache)

**If still showing old content**:
- Verify workflow deployed to correct Static Web App resource
- Check Azure deployment logs for errors

---

## Performance Tips

### Speed Up Workflow Runs

**Enable Dependency Caching** (already in example workflow):
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'  # ← Caches node_modules between runs
```

**Expected Impact**: First run ~4 minutes, subsequent runs ~2-3 minutes (if dependencies unchanged).

---

### Reduce Build Size

**Optimize Vite Configuration** (`src/ai-genius-web/vite.config.js`):
```js
export default {
  build: {
    minify: true,        // Minify JS/CSS
    sourcemap: false,    // Disable source maps in production
  }
}
```

**Expected Impact**: Smaller `dist/` size → faster deployment upload.

---

## Next Steps

After successful first deployment:

1. **Set up branch protection** (Settings → Branches):
   - Require PR reviews before merge to `main`
   - Require status checks to pass (workflow must succeed)

2. **Add deployment status badge** to README.md:
   ```markdown
   ![Deploy Frontend](https://github.com/<owner>/<repo>/actions/workflows/deploy-web.yml/badge.svg)
   ```

3. **Monitor deployment metrics**:
   - Track workflow duration in Actions tab
   - Set up alerts for failed deployments (GitHub notifications)

---

## Reference Links

- **GitHub Actions Documentation**: https://docs.github.com/en/actions
- **Azure Static Web Apps Docs**: https://learn.microsoft.com/azure/static-web-apps/
- **Configuring OIDC in Azure**: https://docs.github.com/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-azure
- **Vite Build Documentation**: https://vitejs.dev/guide/build.html

---

## Support

**Workflow Issues**: Check workflow logs in Actions tab → Click failed run → Expand failed step  
**Azure Issues**: Azure Portal → Static Web Apps → Diagnostics and solve problems  
**Build Issues**: Run `npm run build` locally and fix errors before pushing
