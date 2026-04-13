# AI Genius: Season 4 Episode 2 

## Spec-Kit with GitHub Copilot

> **Hands-On Session: Spec-Driven Development using Spec-Kit and GitHub Copilot**
>
> This guide follows the live session agenda - from setting up Spec-Kit in the GitHub
> repo, to explaining an existing Azure IaC spec, to creating brand-new specs for the
> frontend and backend, adding quality gates, and wrapping up with next steps.
>
> **Core message:** Specifications become the source of truth. Code is their expression.
> Deployment is the outcome.

---

## 🗺️ Session Overview

| Part | Topic |
|------|-------|
| [Part 0 - The Demo Apps](#part-0---the-demo-apps) | Overview of the frontend and API apps |
| [Part 1 - Setup](#part-1---setup) | Set up Spec-Kit in the GitHub repo |
| [Part 2 - Azure IaC Deployment](#part-2---azure-iac-deployment) | Explain the existing Azure IaC pipeline spec & its components |
| [Part 3 - Frontend App](#part-3---frontend-app) | Step-by-step: create a new spec to deploy the frontend via GitHub Actions |
| [Part 4 - API App](#part-4---api-app) | Speed run: create a spec for backend API deployment the same way |
| [Part 5 - Quality Gates](#part-5---quality-gates) | Add quality gates to the pipelines |
| [Part 6 - Wrap-up](#part-6---wrap-up) | Wrap-up and next steps |

---

## Part 0 - The Demo Apps

> **Agenda:** Overview of the frontend and API apps that will be deployed during this session.

This session uses the **AI Genius** demo app — a full-stack web application consisting of two components:

### React Frontend (`src/ai-genius-web`)

A React 18 + Vite single-page application that displays Microsoft AI Genius series episodes. It fetches episode data from the backend API and renders them as interactive cards.

![Microsoft AI Genius web app](res/web-app.png)

### .NET API Backend (`src/ai-genius-api`)

A .NET 9 minimal API that serves episode and series metadata. It exposes a set of REST endpoints consumed by the frontend and includes a built-in Swagger UI for exploration. Swagger endpoint `http://localhost:5151/swagger/index.html`.

![AI Genius API](res/web-api.png)

| Endpoint | Description |
|----------|-------------|
| `GET /api/status` | Runtime status |
| `GET /api/health` | Health check |
| `GET /api/series` | Series info |
| `GET /api/episodes` | All episodes |
| `GET /api/episodes/{id}` | Episode by number |

Both components are deployed to Azure — the frontend to **Azure Static Web Apps** and the API to **Azure App Service** — via GitHub Actions workflows built with Spec-Kit.

---

## Part 1 - Setup

> **Agenda:** Set up Spec-Kit in the GitHub repo.

### 1.1 Prerequisites

Before starting, make sure you have:

- **GitHub Copilot** subscription (individual, Business, or Enterprise)
- **Python 3.8+** with `uv` (for installing Specify CLI)
- **Node.js 20+** and `npm`
- **Azure CLI** (`az`) - authenticated via `az login`
- **Git** configured locally
- The repository cloned locally or opened in GitHub Codespaces

```bash
# Verify prerequisites
node --version   # >= 20
python --version # >= 3.8
az --version     # any recent version
git --version
```

Install `uv` if you don't have it:

```bash
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v0.6.1
```

---

### 1.2 - Install Specify CLI

The `specify` CLI scaffolds the spec-kit file structure and installs the `/speckit.*`
slash commands into your AI agent. For GitHub Copilot, this writes prompt files into
`.github/copilot-instructions.md` and the `.github/` commands directory.

```bash
# Initialise spec-kit in the current directory for GitHub Copilot
specify init . --ai copilot

specify init . --ai copilot --script ps
```

### 1.3 Verify the installation

```bash
specify check
```

After initialisation, Copilot gains these slash commands in its context:

| Command | Purpose |
|---------|---------|
| `/speckit.constitution` | Define project governing principles |
| `/speckit.specify` | Describe what to build |
| `/speckit.clarify` | Resolve ambiguities in the spec |
| `/speckit.checklist` | Validate spec completeness |
| `/speckit.plan` | Create a technical implementation plan |
| `/speckit.tasks` | Generate an actionable task list |
| `/speckit.analyze` | Cross-artifact consistency check |
| `/speckit.implement` | Execute all tasks |

> **Context Awareness:** Spec-Kit commands automatically detect the active feature based
> on your current Git branch (e.g., `002-frontend-deploy`). Switch features by switching branches.

---

### 1.4 - Define Your Constitution

**In GitHub Copilot Chat**, use `/speckit.constitution` to establish the governing
principles for this project. The constitution is committed to `specs/constitution.md` and
guides every subsequent specification and implementation decision.

```
/speckit.constitution This project is the AI Genius demo application.
It consists of a Node.js Express API backend and a React frontend.
Core principles:
- Security-first: all inputs validated, HTTPS only, no secrets in code.
- Cloud-native: infrastructure is defined as code using Azure Bicep.
- CI/CD-driven: every merge to main triggers automated build and deployment.
- Simplicity: prefer standard libraries, avoid over-engineering.
- Tested: API routes must have unit tests; frontend must build clean.
```

Copilot will generate `specs/constitution.md` with your project's articles and principles.
Review and commit it.

---

## Part 2 - Azure IaC Deployment

> **Agenda:** Explain the existing Azure IaC pipeline spec & its components.

Before building anything new, orient yourself in the existing Bicep CI/CD spec that
already lives in `specs/001-bicep-cicd-workflow/`. Walking through it demonstrates
what a complete Spec-Kit feature looks like and shows the role of every artifact.

### 2.1 - Tour the Spec Folder

Open `specs/001-bicep-cicd-workflow/` and note each file's purpose:

| File | Role |
|------|------|
| `spec.md` | Business requirements - the **what** and **why** |
| `plan.md` | Technical implementation plan - the **how** |
| `tasks.md` | Ordered, atomic task list derived from the plan |
| `data-model.md` | Entities, attributes, and relationships |
| `research.md` | Library choices and rationale |
| `quickstart.md` | Key validation scenarios and smoke-test steps |
| `contracts/workflow-interface.md` | GitHub Actions workflow I/O contract |
| `checklists/requirements.md` | Spec completeness checklist |

Open `spec.md` and trace one requirement all the way through to `tasks.md` to see
how Spec-Kit keeps every layer in sync.

### 2.2 - How the Spec Was Created

For reference, this spec was bootstrapped with the following commands:

```
/speckit.specify Add Bicep infrastructure-as-code CI/CD to the AI Genius project.
Create a GitHub Actions workflow (.github/workflows/deploy-infra.yml) that:
1. Triggers on every push to main (or manually via workflow_dispatch).
2. Authenticates to Azure via OIDC.
3. Creates the resource group if it does not exist.
4. Runs az deployment group create with bicep/main.bicep to provision:
   - Azure App Service Plan (Linux B1) + Web App (for the API)
   - Azure Static Web App (for the frontend)
5. Outputs the App Service name and Static Web App token for downstream
   deploy-api and deploy-web workflows.
All Azure resources must be tagged with app, environment, and managedBy=bicep.
The Bicep templates already exist in bicep/main.bicep and bicep/modules/.
```

Then clarify → plan → tasks → implement in quick succession:

```
/speckit.clarify The Bicep modules are:
  - bicep/modules/webapp.bicep: App Service Plan + Web App
  - bicep/modules/staticwebapp.bicep: Static Web App
Parameters: appName (default: aigenius), environment (dev/qa/prod),
appServicePlanSku (default: B1), staticWebAppSku (default: Free).
```

```
/speckit.plan
/speckit.tasks
/speckit.implement
```

### 2.3 - Bicep Parameters & Resources

| Parameter | Default | Description |
|-----------|---------|-------------|
| `appName` | `aigenius` | Base name for all Azure resources |
| `location` | resource group location | Azure region |
| `environment` | `development` | `dev`, `qa`, or `prod` |
| `appServicePlanSku` | `B1` | App Service Plan SKU (`F1`, `B1`, `B2`, `S1`) |
| `staticWebAppSku` | `Free` | Static Web App tier (`Free` or `Standard`) |

| Resource | Bicep module | Purpose |
|----------|-------------|---------|
| Azure App Service Plan (Linux B1) | `modules/webapp.bicep` | Compute plan for the API |
| Azure App Service | `modules/webapp.bicep` | Hosts `src/ai-genius-api` |
| Azure Static Web App | `modules/staticwebapp.bicep` | Hosts built `src/ai-genius-web` |

---

## Part 3 - Frontend App

> **Agenda:** Step-by-step walkthrough to create a new spec to deploy the frontend app using GitHub Actions.

### 3.1 - Create the Spec

**In GitHub Copilot Chat**, use `/speckit.specify` to describe what you want to build.
Focus on the **what** and **why** - not the tech stack.

This first spec focuses on deploying the **React frontend web app** to Azure
Static Web Apps using a GitHub Actions workflow.

Spec-Kit will:
1. Automatically determine the next feature number (e.g., `001`)
2. Create a feature branch (`002-frontend-deploy`)
3. Generate `specs/002-frontend-deploy/spec.md` from the template

```
/speckit.specify Deploy the AI Genius React frontend web app via GitHub Actions.
The frontend is a React + Vite application in src/ai-genius-web.
Create a GitHub Actions workflow that:
1. Triggers on every push to the main branch.
2. Installs dependencies (npm ci) and builds the React app (npm run build).
3. Deploys the built output (dist/) to Azure Static Web Apps.
4. Uses OIDC (Workload Identity Federation) for Azure authentication - no
   long-lived secrets stored in the repository.
The workflow must produce a green check on the Actions tab and the deployed
site must be reachable at the Static Web App URL.
```

Watch the `GitHub Copilot` logs and it will take a few moments. While waiting, go to `.specify\templates` folder to explore the template like `spec-template.md` and show whats there.

When `/speckit.specify` completes, inspect the generated spec file below:

```bash
cat specs/002-frontend-deploy/spec.md
cat specs/002-frontend-deploy/checklists/requirements.md
```

Create feature branch to work on the task by running below. Check the new feature branch.

```bash
/speckit.git.feature
/speckit.git.commit
```

---

### 3.2 - Clarify the Spec

**In GitHub Copilot Chat**, use `/speckit.clarify` to resolve any ambiguities.
Run it once with a general focus, then again with specific concerns. 

Use the `Clarify` button suggested by `GitHub Copilot` to continue the flow, answer follow up questions (about 5 of them). For each Q/A, look at the `spec.md` to review the incremental changes.

**First pass - general clarification:**

```
/speckit.clarify Resolve all [NEEDS CLARIFICATION] markers in the spec.
The frontend is a React 18 + Vite app in src/ai-genius-web.
The build output goes to dist/. The workflow file should be
.github/workflows/deploy-web.yml.
The Azure Static Web App deployment uses the
Azure/static-web-apps-deploy@v1 action.
```

**Second pass - deployment and security details:**

```
/speckit.clarify Focus on deployment and security requirements.
The Static Web App uses the Free tier for development and Standard for
production. The workflow authenticates to Azure via OIDC - no long-lived
credentials. Required GitHub secrets: AZURE_CLIENT_ID, AZURE_TENANT_ID,
AZURE_SUBSCRIPTION_ID. The workflow must set permissions:
  id-token: write and contents: read.
```

Review `specs/002-frontend-deploy/spec.md` after each clarify pass to confirm the
`[NEEDS CLARIFICATION]` markers are resolved.

---

### 3.3 - Validate the Spec

**In GitHub Copilot Chat**, use `/speckit.checklist` to run a quality check on
the specification before moving to implementation planning. This acts like a
unit test for the English requirements.

```
/speckit.checklist
```

Copilot will report on:

- ✅ No `[NEEDS CLARIFICATION]` markers remaining
- ✅ All requirements are testable and unambiguous
- ✅ Success criteria are measurable
- ✅ Non-functional requirements (performance, security) are defined
- ✅ Deployment target and environment strategy are specified

Address any failing checklist items before continuing.

---

### 3.4 - Create a Technical Implementation Plan

**In GitHub Copilot Chat**, use `/speckit.plan` to provide the tech stack and
architecture choices. Spec-Kit translates the business requirements into a
detailed technical implementation plan.

```
/speckit.plan
The frontend is a React 18 app built with Vite in src/ai-genius-web.
The workflow file is .github/workflows/deploy-web.yml.
On every push to main:
  1. Checkout the repository.
  2. Set up Node.js 20.
  3. Install dependencies with npm ci.
  4. Build the React app with npm run build (produces dist/).
  5. Deploy dist/ to Azure Static Web Apps using
     Azure/static-web-apps-deploy@v1.
Authentication uses OIDC (Workload Identity Federation) - no long-lived
credentials stored as secrets. GitHub secrets required:
AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_SUBSCRIPTION_ID.
```

Spec-Kit generates into `specs/002-frontend-deploy/`:

| File | Contents |
|------|----------|
| `plan.md` | Full technical implementation plan |
| `data-model.md` | Data structures and API schemas |
| `contracts/` | API endpoint contracts |
| `research.md` | Library choices and rationale |
| `quickstart.md` | Key validation scenarios |

---

### 3.5 - Generate Tasks

**In GitHub Copilot Chat**, use `/speckit.tasks` to generate an actionable task
list from the implementation plan. Tasks are derived from the contracts, data
model, and test scenarios.

```
/speckit.tasks
```

Spec-Kit reads `plan.md` and supporting documents to produce
`specs/002-frontend-deploy/tasks.md` with:

- Tasks ordered by dependency
- Independent tasks marked `[P]` (safe to run in parallel)
- References to which contract or data-model entity each task implements

Review `specs/002-frontend-deploy/tasks.md` and adjust priorities if needed.

---

### 3.6 - Analyze and Validate

**In GitHub Copilot Chat**, use `/speckit.analyze` to run a cross-artifact
consistency check. This catches mismatches between the spec, plan, contracts,
and tasks before any code is written.

```
/speckit.analyze
```

Copilot will check:

- All API endpoints in `contracts/` are covered by tasks
- Data models referenced in the plan match the contracts
- The implementation phases have clear prerequisites and deliverables
- No speculative or "might need" features crept in

Address any inconsistencies reported before proceeding.

---

### 3.7 - Implement

**In GitHub Copilot Chat**, use `/speckit.implement` to execute the task list and
build the frontend deployment workflow.

```
/speckit.implement
```

Copilot will generate the `.github/workflows/deploy-web.yml` workflow file and any
supporting configuration. After implementation, verify locally:

```bash
# Build the frontend to confirm it succeeds
cd src/ai-genius-web
npm ci
npm run build    # Output in dist/
```

Commit the generated workflow and any related changes:

```bash
git add .
git commit -m "feat: add frontend deployment workflow"
```

---

### 3.8 - Run the Frontend Deployment End-to-End

With the frontend deployment workflow implemented, push to GitHub and run the
pipeline end-to-end to confirm everything works.

#### Configure GitHub Secrets

Before the workflow can authenticate to Azure, set up the required secrets in your
GitHub repository under **Settings → Secrets and variables → Actions**:

**Secrets:**

| Secret | Value |
|--------|-------|
| `AZURE_CLIENT_ID` | App registration client ID |
| `AZURE_TENANT_ID` | Azure tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |

> **Tip:** If you haven't created an Azure OIDC federated credential yet, follow the
> Azure AD setup in [Part 2](#part-2--existing-infrastructure-pipelines).

#### Push and Trigger the Workflow

```bash
git push origin main
```

The `deploy-web.yml` workflow triggers automatically. Monitor progress in the
**Actions** tab of your GitHub repository.

#### Verify Success

1. Open the **Actions** tab and confirm the workflow run shows a green ✅ check.
2. Click into the run to inspect each step: checkout, setup node, install, build, deploy.
3. Open the Static Web App URL printed in the deployment step output.
4. Verify the React frontend loads correctly in your browser.

```
Expected:
✅ Workflow completes with all steps green
✅ Static Web App URL is reachable
✅ Frontend renders the AI Genius application
```

If any step fails, check the workflow logs for errors and fix before proceeding.

---

## Part 4 - API App

> **Agenda:** Speed run to create a spec for backend API deployment in the same way as the frontend.

Use the Spec-Kit **speed workflow** to create a spec for deploying the backend API.
The speed workflow runs all spec-kit commands in rapid succession -
specify → clarify → plan → tasks → implement.

### 4.1 - Create the Backend Deployment Spec

```
/speckit.specify Deploy the AI Genius backend API via GitHub Actions.
The backend is a .NET API in src/ai-genius-api.
Create a GitHub Actions workflow (.github/workflows/deploy-api.yml) that:
1. Triggers on every push to main.
2. Builds the .NET API project.
3. Deploys the API to Azure App Service using azure/webapps-deploy@v3.
4. Uses OIDC (Workload Identity Federation) for authentication.
The App Service must enforce HTTPS only. The workflow must produce a green
check and the /health endpoint must return { "status": "ok" }.
```

### 4.2 - Speed-Run: Clarify, Plan, Tasks

Run each command in quick succession without pausing:

```
/speckit.clarify The API runs on .NET 8+. The App Service Plan uses Linux B1.
Zip deploy is used. Required secrets: AZURE_CLIENT_ID, AZURE_TENANT_ID,
AZURE_SUBSCRIPTION_ID. The App Service name is output from Bicep or configured
as a GitHub variable APP_SERVICE_NAME.
```

```
/speckit.plan
Workflow: .github/workflows/deploy-api.yml
Steps: checkout → setup-dotnet → dotnet publish → zip artifact → azure/webapps-deploy@v3
Authentication: OIDC with id-token: write permission.
```

```
/speckit.tasks
```

### 4.3 - Implement and Deploy

```
/speckit.implement
```

After implementation, push and verify:

```bash
git add .
git commit -m "feat: add backend API deployment workflow"
git push origin main
```

Monitor the **Actions** tab. Once the workflow completes:

```bash
# Verify the deployed API
curl https://YOUR_APP_SERVICE.azurewebsites.net/health
# Expected: { "status": "ok" }
```

```
Expected:
✅ deploy-api.yml workflow completes green
✅ API is reachable at the App Service URL
✅ /health returns { "status": "ok" }
```

---

## Part 5 - Quality Gates

> **Agenda:** Add quality gates to the frontend and backend pipelines.

Use the Spec-Kit **speed workflow** to add quality gates and deployment approvals
to the CI/CD pipeline. Gates enforce code quality, security checks, and manual
approvals before changes reach production.

### 5.1 - Create the Gates Spec

```
/speckit.specify Add quality gates and deployment approvals to the AI Genius CI/CD pipeline.
Update the GitHub Actions workflows to include:
1. A CI workflow (.github/workflows/ci.yml) that runs on every pull request
   to main - builds the frontend and API, runs tests.
2. Branch protection on main: require PR, require passing CI checks,
   require code review before merge.
3. GitHub environment protection rules:
   - dev: auto-deploy (no gates)
   - qa: 1 required reviewer
   - prod: 2 required reviewers + 5-minute wait timer
4. Update deploy-web.yml and deploy-api.yml to reference the production
   environment so deployment pauses for approval.
All gates must be enforced - no bypassing allowed.
```

### 5.2 - Speed-Run: Clarify, Plan, Tasks

Run each command in quick succession without pausing:

```
/speckit.clarify The CI workflow builds the frontend (npm ci && npm run build
in src/ai-genius-web) and the API (dotnet build && dotnet test in
src/ai-genius-api). Branch protection and environment rules are configured
in GitHub Settings, not in workflow files. The deployment workflows add
an environment: production key to trigger the approval gate.
```

```
/speckit.plan
CI workflow: .github/workflows/ci.yml
Trigger: pull_request to main
Steps: checkout → build frontend → build & test API
Environments: dev (no gate), qa (1 reviewer), prod (2 reviewers + wait)
Deploy workflows: add environment: production to deploy jobs.
Branch protection: require PR, require status checks, require review.
```

```
/speckit.tasks
```

### 5.3 - Implement and Verify

```
/speckit.implement
```

After implementation, push and verify:

```bash
git add .
git commit -m "feat: add quality gates and deployment approvals"
git push origin main
```

Verify the gates are working:

1. Create a pull request targeting `main`.
2. Confirm the CI workflow runs and must pass before merge.
3. After merging, confirm the deployment workflow pauses for approval.
4. Approve the deployment and verify it completes successfully.

```
Expected:
✅ PRs require passing CI checks before merge
✅ Deployments to production require manual approval
✅ Environment protection rules are enforced
```

---

## Part 6 - Wrap-up

> **Agenda:** Wrap-up and next steps.

### What We Built Today

We used Spec-Kit and GitHub Copilot to:

1. **Set up** the spec-kit scaffolding and project constitution.
2. **Understood** a complete, existing spec (`001-bicep-cicd-workflow`) by reading every artifact.
3. **Created** a frontend deployment spec step-by-step - specify → clarify → checklist → plan → tasks → analyze → implement.
4. **Speed-ran** the same workflow for the backend API.
5. **Added** quality gates as a new spec without touching a single workflow file manually.

Every decision - from auth to environment tiers to reviewer counts - lives in the spec. The code is just its expression.

### Explore Spec-Kit Further

**GitHub repository:** [github.com/github/spec-kit](https://github.com/github/spec-kit)

---

*AI Genius - Season 4, Episode 2 · Spec-Kit with GitHub Copilot*
