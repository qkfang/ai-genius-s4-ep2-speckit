# Data Model: Frontend CI/CD Deployment

**Feature**: 002-front-end-cicd  
**Date**: 2026-04-13  
**Context**: GitHub Actions workflow for deploying React frontend to Azure Static Web Apps

## Overview

This feature involves a GitHub Actions workflow, not a traditional application data model. The "data model" here represents the workflow's configuration structure, inputs, outputs, and state transitions.

## Workflow Configuration Model

### Workflow Metadata

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `name` | string | Workflow display name | Must be descriptive for GitHub Actions UI |
| `on.push.branches` | array[string] | Trigger branches | Must include `main` per spec FR-001 |
| `permissions` | object | OIDC token permissions | Must include `id-token: write`, `contents: read` |

**Example**:
```yaml
name: Deploy Frontend to Azure Static Web Apps
on:
  push:
    branches: [main]
permissions:
  id-token: write
  contents: read
```

---

### Job Definition

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `runs-on` | string | Runner environment | Recommended: `ubuntu-latest` (fastest, cheapest) |
| `steps` | array[Step] | Sequential workflow steps | Must include: checkout, Node setup, install, build, deploy |

---

### Step Model

Each workflow step follows this structure:

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `name` | string | Step display name | Yes |
| `uses` | string | Action reference (e.g., `actions/checkout@v4`) | Yes (for action steps) |
| `run` | string | Shell command | Yes (for command steps) |
| `with` | object | Action inputs | Conditional (per action) |

---

## Workflow Steps (Ordered Sequence)

### Step 1: Checkout Repository

**Purpose**: Clone repository code to workflow runner

| Property | Value | Rationale |
|----------|-------|-----------|
| `uses` | `actions/checkout@v4` | Official GitHub action, v4 is latest stable |
| `with` | (none) | Default behavior sufficient (checkout current commit) |

**State Transition**: None → Repository files available on runner

---

### Step 2: Setup Node.js

**Purpose**: Install Node.js runtime for building React app

| Property | Value | Rationale |
|----------|-------|-----------|
| `uses` | `actions/setup-node@v4` | Official GitHub action for Node.js |
| `with.node-version` | `20` | Node.js 20 LTS (per research.md Decision 4) |
| `with.cache` | `npm` | Cache npm dependencies to speed up subsequent runs |

**State Transition**: Repository available → Node.js 20 + npm available

---

### Step 3: Install Dependencies

**Purpose**: Install frontend dependencies from package-lock.json

| Property | Value | Rationale |
|----------|-------|-----------|
| `run` | `npm ci` | Deterministic install (per research.md Decision 3) |
| `working-directory` | `src/ai-genius-web` | Frontend app directory |

**Validation**: Fails if package-lock.json is out of sync with package.json

**State Transition**: Node.js available → Dependencies installed in `node_modules/`

---

### Step 4: Build Application

**Purpose**: Compile React app to production-ready static assets

| Property | Value | Rationale |
|----------|-------|-----------|
| `run` | `npm run build` | Standard Vite build command (per research.md) |
| `working-directory` | `src/ai-genius-web` | Frontend app directory |

**Output**: `src/ai-genius-web/dist/` directory with optimized HTML, CSS, JS

**Validation Rules**:
- Exit code 0 = build success
- Exit code non-zero = build failure (workflow terminates)
- All syntax errors, missing imports, or type errors cause build failure

**State Transition**: Dependencies installed → Production build artifacts in `dist/`

---

### Step 5: Deploy to Azure

**Purpose**: Upload built assets to Azure Static Web Apps

| Property | Value | Rationale |
|----------|-------|-----------|
| `uses` | `Azure/static-web-apps-deploy@v1` | Official Microsoft action for Static Web Apps |
| `with.azure_static_web_apps_api_token` | `${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}` | Deployment token (alternative to OIDC for Static Web Apps) |
| `with.repo_token` | `${{ secrets.GITHUB_TOKEN }}` | GitHub token for action internal use |
| `with.action` | `upload` | Deploy mode (vs. close preview) |
| `with.app_location` | `src/ai-genius-web/dist` | Path to built static files |
| `with.skip_app_build` | `true` | Skip built-in Oryx build (already built in Step 4) |

**Authentication Model**: 
- Option A (preferred per user input): OIDC with federated credentials
  - Requires `permissions.id-token: write`
  - Uses `with.client-id`, `with.tenant-id`, `with.subscription-id`
- Option B (fallback): API token stored in GitHub Secrets
  - Uses `secrets.AZURE_STATIC_WEB_APPS_API_TOKEN`

**Note**: User specified OIDC in requirements. If using OIDC, replace `azure_static_web_apps_api_token` with Azure login step + OIDC parameters.

**State Transition**: Build artifacts ready → Assets uploaded to Azure CDN

---

## OIDC Authentication Flow (Detailed Model)

If using OIDC (Workload Identity Federation) per user requirement:

### Authentication Step (before Deploy)

**Step 3a: Azure Login**

| Property | Value |
|----------|-------|
| `uses` | `azure/login@v2` |
| `with.client-id` | `${{ secrets.AZURE_CLIENT_ID }}` |
| `with.tenant-id` | `${{ secrets.AZURE_TENANT_ID }}` |
| `with.subscription-id` | `${{ secrets.AZURE_SUBSCRIPTION_ID }}` |

**Required GitHub Secrets (non-sensitive identifiers)**:
- `AZURE_CLIENT_ID`: App Registration client ID (GUID)
- `AZURE_TENANT_ID`: Azure AD tenant ID (GUID)
- `AZURE_SUBSCRIPTION_ID`: Azure subscription ID (GUID)

**Authentication Flow**:
1. GitHub Actions requests OIDC token from GitHub
2. Azure verifies token against federated credential configuration
3. Azure issues short-lived access token
4. Subsequent Azure actions use token for authentication

**State Transition**: Unauthenticated → Authenticated Azure session (valid ~1 hour)

---

## Environment Variables

| Variable | Source | Purpose | Example Value |
|----------|--------|---------|---------------|
| `GITHUB_TOKEN` | Automatic GitHub secret | Internal action use | `ghp_***` (auto-injected) |
| `AZURE_CLIENT_ID` | GitHub Secret | OIDC client identifier | `a1b2c3d4-...` |
| `AZURE_TENANT_ID` | GitHub Secret | Azure AD tenant identifier | `e5f6g7h8-...` |
| `AZURE_SUBSCRIPTION_ID` | GitHub Secret | Azure subscription identifier | `i9j0k1l2-...` |

**Validation**: All secrets must be configured in repository Settings → Secrets and variables → Actions before workflow runs.

---

## Workflow Outputs

### Success State

| Output | Location | Description |
|--------|----------|-------------|
| Workflow status | GitHub Actions tab | Green check icon |
| Deployment URL | Static Web App resource | `https://<app-name>.azurestaticapps.net` |
| Build artifacts | Runner (ephemeral) | Deleted after workflow completion |

### Failure States

| Failure Cause | Detected At | Error Indicator | Recovery Action |
|--------------|-------------|-----------------|-----------------|
| Missing package-lock.json | Step 3 (npm ci) | `ENOENT: no such file or directory` | Commit package-lock.json |
| Syntax error in React code | Step 4 (build) | Vite build error with file/line number | Fix code syntax |
| OIDC misconfiguration | Step 3a (OIDC auth) | `InvalidFederatedCredential` | Verify Azure federated credential setup |
| Missing GitHub Secret | Step 3a or 5 | `Secret not found` | Add secret in repository settings |
| Azure service unavailable | Step 5 (deploy) | HTTP 503 or timeout | Re-run workflow or wait |

---

## State Diagram

```
[Push to main] 
    → [Trigger workflow]
        → [Checkout code]
            → [Setup Node.js 20]
                → [Install dependencies (npm ci)]
                    → [Build React app (npm run build)]
                        → [Authenticate to Azure (OIDC)]
                            → [Deploy dist/ to Static Web Apps]
                                → [✅ Success: Site live]

                    [Build fails]
                        → [❌ Workflow fails]
                            → [Developer checks logs]
                                → [Fix code]
                                    → [Push new commit]
                                        → [Retry workflow]
```

---

## Data Validation Rules

### Build Output Validation

- `dist/` directory MUST exist after `npm run build`
- `dist/index.html` MUST exist (entry point for Static Web App)
- Build command MUST exit with code 0
- No breaking TypeScript or ESLint errors during build

### Configuration Validation

- `on.push.branches` MUST include `main`
- `permissions.id-token` MUST be `write` for OIDC
- Working directory (`src/ai-genius-web`) MUST exist in repository
- `package.json` and `package-lock.json` MUST be present in working directory

---

## Relationships

```
[GitHub Repository]
    ↓ (triggers)
[GitHub Actions Workflow]
    ↓ (authenticates via)
[Azure AD Federated Credential]
    ↓ (grants access to)
[Azure Static Web Apps Resource]
    ↓ (serves)
[End Users]
```

---

## Notes

- This workflow has no persistent state between runs (stateless, idempotent)
- Each workflow run is isolated (no shared artifacts)
- Build cache (`with.cache: npm`) improves performance but does not affect output correctness
- Azure Static Web Apps handles CDN cache invalidation automatically on deployment
