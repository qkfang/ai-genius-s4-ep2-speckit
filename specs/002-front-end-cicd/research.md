# Research: Frontend CI/CD Deployment

**Feature**: 002-front-end-cicd  
**Date**: 2026-04-13  
**Status**: Complete

## Overview

This document captures technical research and decision rationale for implementing automated frontend deployment via GitHub Actions to Azure Static Web Apps.

## Technical Decisions

### Decision 1: GitHub Actions as CI/CD Platform

**Chosen**: GitHub Actions with official `Azure/static-web-apps-deploy@v1` action

**Rationale**: 
- Native integration with GitHub repository (no external CI/CD service required)
- Official Microsoft-maintained action for Static Web Apps deployment
- Built-in OIDC support for Azure authentication
- Aligns with Constitution Principle IV (Simplicity) by using platform-native tooling

**Alternatives Considered**:
- Azure DevOps Pipelines: Adds external service dependency, increases complexity
- Manual deployment via Azure CLI: Not automated, violates CI/CD-Driven principle

**References**:
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Azure Static Web Apps Deploy Action](https://github.com/Azure/static-web-apps-deploy)

---

### Decision 2: OIDC (Workload Identity Federation) for Authentication

**Chosen**: OpenID Connect (OIDC) federated identity with GitHub Actions

**Rationale**:
- Zero long-lived secrets stored in repository (satisfies Security-First principle)
- Short-lived tokens automatically issued per workflow run
- Azure best practice for GitHub Actions integration as of 2024+
- GitHub Secrets contain only non-sensitive identifiers (client ID, tenant ID, subscription ID)

**Alternatives Considered**:
- Azure Service Principal with secret: Requires storing credentials in GitHub Secrets, violates Security-First principle
- Azure Managed Identity: Not applicable to GitHub Actions (cloud-external workflow runner)

**References**:
- [Microsoft - Use GitHub Actions to connect to Azure](https://learn.microsoft.com/azure/developer/github/connect-from-azure)
- [GitHub - Configuring OpenID Connect in Azure](https://docs.github.com/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-azure)

---

### Decision 3: npm ci for Dependency Installation

**Chosen**: `npm ci` instead of `npm install`

**Rationale**:
- Deterministic installs using package-lock.json (exact dependency versions)
- Faster than `npm install` in CI environments (skips package resolution)
- Fails if package-lock.json is out of sync with package.json, catching inconsistencies early
- Standard practice for CI/CD pipelines

**Alternatives Considered**:
- `npm install`: Non-deterministic, can install different versions across runs
- `pnpm install`: Not currently used in project, would add new tooling

**References**:
- [npm-ci Documentation](https://docs.npmjs.com/cli/v10/commands/npm-ci)

---

### Decision 4: Node.js 20 LTS as Runtime Version

**Chosen**: Node.js 20 (Long-Term Support release)

**Rationale**:
- Current LTS version as of April 2026 (support until April 2026)
- Compatible with React 18 and Vite build tooling
- Matches typical production Azure Static Web Apps runtime environment
- Stability and security updates guaranteed through LTS lifecycle

**Alternatives Considered**:
- Node.js 18: Older LTS, shorter support window remaining
- Node.js 21+: Not LTS, may introduce breaking changes

**References**:
- [Node.js Release Schedule](https://github.com/nodejs/release#release-schedule)
- [React 18 Requirements](https://react.dev/learn/start-a-new-react-project)

---

### Decision 5: Trigger on Push to Main Branch

**Chosen**: `on: push: branches: [main]`

**Rationale**:
- Aligns with Constitution Principle III (CI/CD-Driven): "Every merge to main MUST trigger automated deployment"
- Simplest trigger mechanism (no manual approval steps)
- Ensures production deployment reflects latest committed code
- Assumes branch protection rules enforce PR review before merge

**Alternatives Considered**:
- Manual workflow dispatch: Violates CI/CD-Driven principle, introduces human error
- Pull request triggers: Would deploy preview environments (out of scope per spec)
- Tag-based deployment: Adds extra step (tag creation) without benefit for continuous delivery

**References**:
- [GitHub Actions - Triggering Workflows](https://docs.github.com/en/actions/using-workflows/triggering-a-workflow)

---

## Infrastructure Prerequisites

The following resources MUST exist before workflow execution (per spec Assumptions):

1. **Azure Static Web App Resource**: Provisioned via Bicep or Azure Portal
2. **Federated Identity Credential**: Configured in Azure AD App Registration to trust GitHub Actions tokens
3. **GitHub Secrets**: 
   - `AZURE_CLIENT_ID` (App Registration client ID)
   - `AZURE_TENANT_ID` (Azure AD tenant ID)
   - `AZURE_SUBSCRIPTION_ID` (Azure subscription ID)

These are documented as prerequisites, not created by this workflow (infrastructure provisioning out of scope).

---

## Build Process

**Standard Vite Build**:
- Command: `npm run build`
- Input: `src/ai-genius-web/src/` (source files)
- Output: `src/ai-genius-web/dist/` (optimized static assets)
- Validation: Build exits with code 0 on success, non-zero on errors

No custom build flags or post-processing required. Vite handles:
- JavaScript/JSX transpilation and bundling
- CSS processing and minification
- Asset optimization and fingerprinting
- HTML template generation

---

## Deployment Target

**Azure Static Web Apps**:
- Hosting service for static frontends (HTML, CSS, JS)
- Global CDN distribution
- Automatic SSL/TLS certificates
- Integration with Azure Functions for backend APIs (not used in this feature)

**Deployment Mechanism**: `Azure/static-web-apps-deploy@v1` action uploads `dist/` contents to Static Web App resource.

---

## Performance Expectations

Based on typical GitHub Actions and Azure Static Web Apps performance:

- **Workflow duration**: 2-4 minutes (checkout + Node setup + npm ci + build + deploy)
- **Deployment propagation**: <2 minutes (CDN cache invalidation and content distribution)
- **Total commit-to-live**: <6 minutes (satisfies 5-minute target in spec)

No optimization required at this stage; performance targets already met by standard configuration.

---

## Failure Scenarios & Handling

| Scenario | Detection | Response | Recovery |
|----------|-----------|----------|----------|
| Build syntax error | `npm run build` exits non-zero | Workflow fails, GitHub shows red X | Fix code, push new commit |
| Missing dependency | `npm ci` fails | Workflow fails at install step | Update package.json + package-lock.json |
| OIDC auth failure | Azure login step fails | Workflow fails with auth error | Verify federated credential config in Azure |
| Azure service unavailable | Deploy action fails | Workflow fails (no retry) | Re-run workflow or wait for Azure service recovery |

All failures result in immediate workflow termination with clear error logs in GitHub Actions tab (per spec FR-008).

---

## Open Questions

None. All technical details specified and validated against constitution.

---

## Next Steps

**Phase 1**: Generate design artifacts (data-model.md, contracts/workflow-interface.md, quickstart.md) based on this research.
