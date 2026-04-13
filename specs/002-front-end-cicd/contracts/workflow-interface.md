# Workflow Interface Contract

**Feature**: 002-front-end-cicd  
**Date**: 2026-04-13  
**Workflow**: `.github/workflows/deploy-web.yml`

## Overview

This document defines the public interface contract for the Frontend CI/CD deployment workflow. It specifies inputs, outputs, triggers, and behaviors that external consumers (developers, CI/CD systems, Azure) can depend on.

---

## Workflow Triggers

### Automatic Trigger

**Event**: Push to `main` branch

**Contract**:
```yaml
on:
  push:
    branches:
      - main
```

**Behavior**:
- Workflow starts automatically within 30 seconds of push event
- Applies to direct pushes and merged pull requests
- Does NOT trigger on pushes to other branches or tags

**Exclusions**: 
- Does NOT trigger on pull request creation or updates
- Does NOT trigger on manual workflow dispatch (out of scope)
- Does NOT trigger on scheduled events (out of scope)

---

## Required Inputs

### GitHub Secrets (Environment Configuration)

The workflow requires the following secrets configured in repository Settings → Secrets and variables → Actions:

| Secret Name | Type | Purpose | Example Format | Sensitive? |
|------------|------|---------|----------------|------------|
| `AZURE_CLIENT_ID` | GUID | Azure App Registration client ID for OIDC | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` | No (identifier only) |
| `AZURE_TENANT_ID` | GUID | Azure AD tenant ID | `b2c3d4e5-f6g7-8901-bcde-fg2345678901` | No (identifier only) |
| `AZURE_SUBSCRIPTION_ID` | GUID | Azure subscription ID | `c3d4e5f6-g7h8-9012-cdef-gh3456789012` | No (identifier only) |

**Validation**: Workflow will fail at Azure authentication step if any secret is missing or malformed.

**Note**: These values are identifiers, not credentials. Authentication security comes from OIDC trust relationship between GitHub and Azure.

---

### Repository Structure Requirements

The workflow expects the following repository structure:

```
src/
└── ai-genius-web/
    ├── package.json          # REQUIRED: npm configuration with "build" script
    ├── package-lock.json     # REQUIRED: Locked dependency versions
    ├── vite.config.js        # REQUIRED: Vite bundler configuration
    ├── index.html            # REQUIRED: App entry point
    └── src/                  # REQUIRED: React source code
        └── *.jsx, *.css, ... # Application components
```

**Breaking Changes**: 
- Moving `src/ai-genius-web` to a different path requires updating `working-directory` in workflow
- Renaming `package.json` → workflow will fail at `npm ci` step
- Changing build command from `npm run build` → workflow will fail at build step

---

## Outputs

### Successful Deployment

**Location**: GitHub Actions workflow run summary

**Outputs**:
| Output | Location | Format | Example |
|--------|----------|--------|---------|
| Workflow status | Actions tab | Green check icon ✅ | "Deploy Frontend to Azure Static Web Apps" ✅ |
| Deployment URL | Azure Static Web Apps resource | HTTPS URL | `https://my-app.azurestaticapps.net` |
| Build duration | Workflow logs | `HH:MM:SS` | `02:34` (2 minutes 34 seconds) |
| Deploy time | Step summary | ISO 8601 timestamp | `2026-04-13T14:23:45Z` |

**Success Criteria**:
- All workflow steps complete with exit code 0
- `dist/` directory uploaded to Azure Static Web Apps
- Deployed site accessible at Static Web App URL within 2 minutes
- Latest commit SHA visible in deployed app (if version displayed in UI)

---

### Failed Deployment

**Location**: GitHub Actions workflow run summary

**Outputs**:
| Output | Location | Format |
|--------|----------|--------|
| Workflow status | Actions tab | Red X icon ❌ |
| Error message | Step logs | Plain text error with stack trace |
| Failed step | Workflow summary | Step name (e.g., "Build Application") |

**Common Failure Modes**:

| Failure Cause | Step Failed | Error Pattern | Developer Action |
|--------------|-------------|---------------|------------------|
| Syntax error in React code | Build Application | `SyntaxError: Unexpected token` | Fix code, push correction |
| Missing dependency | Install dependencies | `npm error code ENOENT` | Update package.json, run `npm install` locally, commit lock file |
| OIDC misconfigured | Azure Login | `InvalidFederatedCredential` | Verify federated credential in Azure AD App Registration |
| Missing GitHub Secret | Azure Login | `Secret AZURE_CLIENT_ID not found` | Add secret in repository settings |
| Azure outage | Deploy to Azure | `HTTP 503 Service Unavailable` | Wait and re-run workflow |

---

## Side Effects

### Repository State Changes

**None**: Workflow does NOT modify repository contents (read-only operations).

**Guarantees**:
- No commits created by workflow
- No branches created or modified
- No tags created
- No pull requests opened

---

### Azure State Changes

**Modified Resource**: Azure Static Web Apps resource (specified in deployment configuration)

**Changes**:
| Resource Property | Before Deployment | After Deployment | Idempotency |
|------------------|------------------|------------------|-------------|
| Static site content | Previous version | New version (from `dist/`) | Yes (overwrites) |
| CDN cache | Previous content cached | Cache invalidated automatically | Yes |
| Deployment history | Previous deployments | New deployment appended | Yes (append-only) |

**No Changes To**:
- Azure Static Web Apps configuration (custom domains, auth settings, etc.)
- Azure subscription resources outside target Static Web App
- GitHub repository settings or secrets

---

## Permissions Required

### GitHub Actions Permissions

**Required for OIDC**:
```yaml
permissions:
  id-token: write    # Request OIDC token from GitHub
  contents: read     # Checkout repository code
```

**Breaking Change**: Removing `id-token: write` will cause OIDC authentication to fail.

---

### Azure RBAC Permissions

**Identity**: Azure AD App Registration (specified by `AZURE_CLIENT_ID`)

**Required Role**: `Contributor` or `Website Contributor` on Azure Static Web Apps resource

**Required Actions** (Azure RBAC):
- `Microsoft.Web/staticSites/Read`
- `Microsoft.Web/staticSites/Write`
- `Microsoft.Web/staticSites/config/Read`
- `Microsoft.Web/staticSites/config/Write`

**Validation**: Deployment fails with HTTP 403 if identity lacks permissions.

---

## Performance Guarantees

### Timing Commitments

| Metric | Target | Maximum | Measurement Point |
|--------|--------|---------|-------------------|
| Workflow trigger latency | <30 seconds | 60 seconds | Push event → workflow starts |
| Total workflow duration | 3-5 minutes | 10 minutes | Checkout → deploy completes |
| Site availability | <2 minutes | 5 minutes | Deploy completes → site accessible |

**Degradation Handling**: If Azure Static Web Apps experiences high latency, deploy step may exceed target but workflow will NOT retry (fails fast).

---

### Resource Consumption

| Resource | Typical Usage | Notes |
|----------|---------------|-------|
| GitHub Actions minutes | 3-5 minutes per run | Billed to repository owner |
| Runner disk space | ~500 MB (node_modules + build artifacts) | Cleaned up after workflow completes |
| Network bandwidth | ~100 MB upload (dist/ to Azure) | Varies with bundle size |

---

## Versioning & Compatibility

### Action Versions

**Pinning Strategy**: Use major version tags with auto-update semantics

| Action | Version | Update Policy |
|--------|---------|---------------|
| `actions/checkout` | `v4` | Auto-update to latest v4.x (GitHub manages) |
| `actions/setup-node` | `v4` | Auto-update to latest v4.x |
| `azure/login` | `v2` | Auto-update to latest v2.x |
| `Azure/static-web-apps-deploy` | `v1` | Auto-update to latest v1.x |

**Breaking Changes**: Major version bumps (e.g., `v4` → `v5`) require manual workflow update and testing.

---

### Node.js Version

**Locked Version**: `20` (LTS)

**Compatibility Window**: Node.js 20.x (any patch version)

**Update Trigger**: When Node.js 22 becomes LTS (expected ~2027), workflow should be updated to `node-version: 22`.

---

## Error Handling Contract

### Failure Behavior

**Guarantee**: Workflow fails fast on first error (no retries, no fallback mechanisms).

**Rationale**: Per spec edge cases, immediate failure with clear error messages enables faster troubleshooting than silent fallback or automatic retry masking issues.

**Examples**:
- Build fails → Workflow stops at "Build Application" step
- OIDC auth fails → Workflow stops at "Azure Login" step
- Deploy fails → Workflow stops at "Deploy to Azure" step

**Developer Recovery**:
1. View workflow logs in GitHub Actions tab
2. Identify failed step and error message
3. Fix root cause (code, configuration, or Azure resources)
4. Push new commit (triggers automatic retry)

---

### Non-Retryable Errors

The workflow does NOT retry on:
- Build failures (syntax errors, missing dependencies)
- Authentication failures (OIDC misconfiguration)
- Deployment failures (Azure service errors)

**Justification**: All errors indicate configuration or code issues requiring human intervention. Automatic retry would waste CI minutes without resolving root cause.

---

## Security Guarantees

### Credential Handling

**Guarantee**: Zero long-lived credentials stored in repository or workflow file.

**Implementation**:
- OIDC tokens are short-lived (1 hour) and issued per workflow run
- GitHub Secrets contain only non-sensitive identifiers (client ID, tenant ID, subscription ID)
- Workflow file contains no passwords, API keys, or connection strings

**Audit Trail**: All deployments logged in Azure Static Web Apps deployment history with GitHub commit SHA and actor identity.

---

### Code Integrity

**Source Verification**: Deployed code matches exact commit SHA that triggered workflow (no intermediate modifications).

**Guarantees**:
- `actions/checkout@v4` checks out exact commit SHA
- No code generation or modification steps in workflow
- `dist/` built from checked-out source only

---

## Testing & Validation

### Workflow Testing

**Local Testing**: NOT SUPPORTED (GitHub-hosted runners required for OIDC).

**Validation Methods**:
1. **Pre-deployment**: Use `act` tool to simulate steps 1-4 locally (checkout, Node setup, install, build)
2. **Live Testing**: Push to `main` branch triggers real workflow run
3. **Error Testing**: Introduce intentional build error, verify workflow fails with clear message

**Acceptance Test**: Push simple code change (e.g., text label update) → verify change visible at Static Web App URL within 5 minutes.

---

## Deprecation Policy

**Workflow Stability**: This workflow interface is considered stable once deployed.

**Breaking Changes Require**:
1. New feature spec documenting change rationale
2. Pull request with updated workflow file
3. Constitution Check review
4. At least one successful test deployment

**Backward Compatibility**: Future workflow updates MUST maintain compatibility with existing repository structure and GitHub Secrets configuration unless breaking change is justified and documented.

---

## Support & Troubleshooting

### Workflow Status Visibility

**Primary Interface**: GitHub repository → Actions tab

**Information Available**:
- Workflow run history (past deployments)
- Step-by-step logs with timestamps
- Error messages and stack traces
- Deployment duration and resource usage

### Common Issues & Diagnostics

| Symptom | Diagnostic Command | Resolution |
|---------|-------------------|------------|
| Workflow not triggering | Check Actions tab for recent runs | Verify push was to `main` branch |
| Build fails locally and in CI | Run `npm run build` locally | Fix syntax/import errors |
| Build succeeds locally, fails in CI | Check Node.js version (`node -v`) | Ensure local Node.js matches workflow (20.x) |
| OIDC auth fails | Verify secrets in Settings → Secrets | Add missing secrets or fix GUID format |
| Deployed site not updating | Check Azure Static Web Apps deployment history | Verify deployment completed, check CDN cache (can take 1-2 min) |

---

## Contract Version

**Version**: 1.0.0  
**Date**: 2026-04-13  
**Status**: Initial specification

**Change History**: None (initial version)

**Next Review**: After first production deployment (validate performance targets and error handling)
