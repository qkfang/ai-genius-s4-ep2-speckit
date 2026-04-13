# ai-genius-s4-ep2-speckit Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-13

## Active Technologies
- YAML (GitHub Actions workflow); Node.js 20; React 18 + Vite 5 + `actions/checkout@v4`, `actions/setup-node@v4`, `azure/login@v2`, `Azure/static-web-apps-deploy@v1` (003-frontend-swa-deploy)
- N/A (stateless CI/CD pipeline; build artifact written to `src/ai-genius-web/dist/`) (003-frontend-swa-deploy)

- YAML (GitHub Actions workflow syntax); Bicep (Azure infrastructure) + `actions/checkout@v4`, `azure/login@v2` (OIDC), Azure CLI (`az deployment group create`), `az group create` (001-bicep-cicd-workflow)

## Project Structure

```text
src/
tests/
```

## Commands

# Add commands for YAML (GitHub Actions workflow syntax); Bicep (Azure infrastructure)

## Code Style

YAML (GitHub Actions workflow syntax); Bicep (Azure infrastructure): Follow standard conventions

## Recent Changes
- 003-frontend-swa-deploy: Added YAML (GitHub Actions workflow); Node.js 20; React 18 + Vite 5 + `actions/checkout@v4`, `actions/setup-node@v4`, `azure/login@v2`, `Azure/static-web-apps-deploy@v1`

- 001-bicep-cicd-workflow: Added YAML (GitHub Actions workflow syntax); Bicep (Azure infrastructure) + `actions/checkout@v4`, `azure/login@v2` (OIDC), Azure CLI (`az deployment group create`), `az group create`

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
