# AI Genius: Season 4 Episode 2

## Spec-Kit with GitHub Copilot

> **Hands-On Session: Spec-Driven Development using Spec-Kit and GitHub Copilot**
>
> This guide follows the live session agenda - from setting up Spec-Kit in the GitHub repo, to explaining an existing Azure IaC spec, to creating brand-new specs for the frontend and backend, adding quality gates, and wrapping up with next steps.
> **Core message:** Specifications become the source of truth. Code is their expression.
> Deployment is the outcome.

**Best to fork the repo and create GitHub Actions in your own repo so that you can configure settings, variable and secrets.**

---

## 🗺️ Session Overview

| Part                                                            | Topic                                                                     |
| --------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [Part 0 - The Demo Apps](#part-0---the-demo-apps)               | Overview of the frontend and API apps                                     |
| [Part 1 - Setup](#part-1---setup)                               | Set up Spec-Kit in the GitHub repo                                        |
| [Part 2 - Azure IaC Deployment](#part-2---azure-iac-deployment) | Explain the existing Azure IaC pipeline spec & its components             |
| [Part 3 - Frontend App](#part-3---frontend-app)                 | Step-by-step: create a new spec to deploy the frontend via GitHub Actions |
| [Part 4 - API App](#part-4---api-app)                           | Speed run: create a spec for backend API deployment the same way          |
| [Part 5 - Quality Gates](#part-5---quality-gates)               | Speed run: Add quality gates to the pipelines                             |
| [Part 6 - Wrap-up](#part-6---wrap-up)                           | Wrap-up and next steps                                                    |

Refer to `GitHub Actions Settings` section inside `AGENTS.md` to create GitHub repo variable and secrets.

---

## Part 0 - The Demo Apps

> **Agenda:** Overview of the frontend and API apps that will be deployed during this session.

This session uses the **AI Genius** demo app — a full-stack web application consisting of two components:

### React Frontend (`src/ai-genius-web`)

A React 18 + Vite single-page application that displays Microsoft AI Genius series episodes. It fetches episode data from the backend API and renders them as interactive cards.

![Microsoft AI Genius web app](res/web-app.png)

### .NET API Backend (`src/ai-genius-api`)

A .NET 10 minimal API that serves episode and series metadata. It exposes a set of REST endpoints consumed by the frontend and includes a built-in Swagger UI for exploration. Swagger endpoint `http://localhost:5151/swagger/index.html`.

![AI Genius API](res/web-api.png)

| Endpoint                 | Description       |
| ------------------------ | ----------------- |
| `GET /api/status`        | Runtime status    |
| `GET /api/health`        | Health check      |
| `GET /api/series`        | Series info       |
| `GET /api/episodes`      | All episodes      |
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

```powershell
(for windows)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v0.8.3
```

```bash
(for linux)
curl -LsSf https://astral.sh/uv/install.sh | sh

uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v0.8.3
```

---

### 1.2 - Install Specify CLI

The `specify` CLI scaffolds the spec-kit file structure and installs the `/speckit.*`
slash commands into your AI agent. For GitHub Copilot, this writes prompt files into
`.github/copilot-instructions.md` and the `.github/` commands directory.

```bash
# Initialise spec-kit in the current directory for GitHub Copilot
specify init .

specify init . --ai copilot --script ps
```

### 1.3 Verify the installation

```bash
specify check
```

After initialisation, Copilot gains these slash commands in its context:

| Command                 | Purpose                                |
| ----------------------- | -------------------------------------- |
| `/speckit.constitution` | Define project governing principles    |
| `/speckit.specify`      | Describe what to build                 |
| `/speckit.clarify`      | Resolve ambiguities in the spec        |
| `/speckit.plan`         | Create a technical implementation plan |
| `/speckit.tasks`        | Generate an actionable task list       |
| `/speckit.analyze`      | Cross-artifact consistency check       |
| `/speckit.checklist`    | Validate spec completeness             |
| `/speckit.implement`    | Execute all tasks                      |

> **Context Awareness:** Spec-Kit commands automatically detect the active feature based
> on your current Git branch (e.g., `002-web-deploy`). Switch features by switching branches.

---

### 1.4 - Define Your Constitution

**In GitHub Copilot Chat**, use `/speckit.constitution` to establish the governing
principles for this project. The constitution is committed to `specs/constitution.md` and
guides every subsequent specification and implementation decision.

Selected `Claude Sonnect 4.5` model.

```
/speckit.constitution

This project is the AI Genius web application. It consists of a .net API backend and a React frontend.

Core principles:
- Security-first: HTTPS only, no secrets in code.
- Cloud-native: infrastructure is defined as code using Azure Bicep.
- CI/CD-driven: every merge to main triggers automated build and deployment.
- Simplicity: prefer standard libraries, avoid over-engineering.
- Demo Session: keep process simple, and use common practise.
```

Copilot will generate `specs/constitution.md` with your project's articles and principles. Review and commit it.

---

## Part 2 - Azure IaC Deployment

> **Agenda:** Explain the existing Azure IaC pipeline spec & its components.

Before building anything new, orient yourself in the existing Bicep CI/CD spec that
already lives in `specs/001-bicep-deploy/`. Walking through it demonstrates
what a complete Spec-Kit feature looks like and shows the role of every artifact.

### 2.1 - Tour the Spec Folder

Open `specs/001-bicep-deploy/` and note each file's purpose:

| File                              | Role                                             |
| --------------------------------- | ------------------------------------------------ |
| `spec.md`                         | Business requirements - the **what** and **why** |
| `plan.md`                         | Technical implementation plan - the **how**      |
| `research.md`                     | Library choices and rationale                    |
| `data-model.md`                   | Entities, attributes, and relationships          |
| `contracts/workflow-interface.md` | GitHub Actions workflow I/O contract             |
| `quickstart.md`                   | Key validation scenarios and smoke-test steps    |
| `tasks.md`                        | Ordered, atomic task list derived from the plan  |
| `checklists/requirements.md`      | Spec completeness checklist                      |

Open `spec.md` and trace one requirement all the way through to `tasks.md` to see how Spec-Kit keeps every layer in sync.

### 2.2 - How the Spec Was Created

For reference, this spec was bootstrapped with the following commands:

```
/speckit.specify

Add Bicep infrastructure-as-code CI/CD to the AI Genius project.
Create a GitHub Actions workflow (.github/workflows/deploy-infra.yml) that:

1. Triggers on every push to main (or manually via workflow_dispatch).
2. Authenticates to Azure via azure/login@v1.
3. Creates the resource group if it does not exist.
4. Runs az deployment group create with bicep/main.bicep to provision:
   - Azure App Service Plan (Linux B1) + Web App (.net for the API)
   - Azure Static Web App (for the frontend)

The Bicep templates already exist in bicep/main.bicep and bicep/modules/.
```

Then clarify → plan → tasks → implement in quick succession:

```
/speckit.clarify

The Bicep modules are:
  - bicep/modules/webapp.bicep: App Service Plan + .Net Web App
  - bicep/modules/staticwebapp.bicep: Static Web App

Parameters: appName (default: aigenius), environment (dev/qa/prod), appServicePlanSku (default: B1), staticWebAppSku (default: Free).
```

You can also explore below commands.

```
/speckit.plan
/speckit.tasks
/speckit.implement
```

### 2.3 - Bicep Parameters & Resources

| Parameter           | Default                 | Description                                   |
| ------------------- | ----------------------- | --------------------------------------------- |
| `appName`           | `aigenius`              | Base name for all Azure resources             |
| `location`          | resource group location | Azure region                                  |
| `environment`       | `development`           | `dev`, `qa`, or `prod`                        |
| `appServicePlanSku` | `B1`                    | App Service Plan SKU (`F1`, `B1`, `B2`, `S1`) |
| `staticWebAppSku`   | `Free`                  | Static Web App tier (`Free` or `Standard`)    |

| Resource                          | Bicep module                 | Purpose                         |
| --------------------------------- | ---------------------------- | ------------------------------- |
| Azure App Service Plan (Linux B1) | `modules/webapp.bicep`       | Compute plan for the API        |
| Azure App Service                 | `modules/webapp.bicep`       | Hosts `src/ai-genius-api`       |
| Azure Static Web App              | `modules/staticwebapp.bicep` | Hosts built `src/ai-genius-web` |

---

## Part 3 - Frontend App

> **Agenda:** Step-by-step walkthrough to create a new spec to deploy the frontend app using GitHub Actions.

### 3.1 - Create the Spec

**In GitHub Copilot Chat**, use `/speckit.specify` to describe what you want to build.
Focus on the **what** and **why** - not the tech stack.

This first spec focuses on deploying the **React frontend web app** to Azure Static Web Apps using a GitHub Actions workflow.

Create feature branch to work on the task by running below. Check the new feature branch.

```bash
/speckit.git.feature use feature name `web-deploy`
```

```bash
/speckit.git.commit setup feature branch
```

Spec-Kit will:

1. Automatically determine the next feature number (e.g., `00x`)
2. Create a feature branch (`002-web-deploy`)
3. Generate `specs/002-web-deploy/spec.md` from the template

```
/speckit.specify

Deploy the AI Genius React frontend web app via GitHub Actions. The frontend is a React + Vite application in src/ai-genius-web.

- The new GitHub Actions workflow is called `002-deploy-web.yml` that:
- Follow the ENVIRONMENT & concurrency like `001-deploy-infra.yml`
- Triggers on every push to the main branch and also `workflow_dispatch`
- Installs dependencies (npm ci) and builds the React app (npm run build).
- Deploys the built output (dist/) to Azure Static Web Apps.
- Uses azure/login@v1 with: secrets.AZURE_CREDENTIALS
- Azure/static-web-apps-deploy@v1 uses secrets.AZURE_STATIC_WEB_APPS_API_TOKEN

```

Watch the `GitHub Copilot` logs and it will take a few moments. While waiting, go to `.specify\templates` folder to explore the template like `spec-template.md` and show whats there.

When `/speckit.specify` completes, inspect the generated spec file below:

```bash
cat specs/002-web-deploy/spec.md
cat specs/002-web-deploy/checklists/requirements.md
```

---

### 3.2 - Clarify the Spec

**In GitHub Copilot Chat**, use `/speckit.clarify` to resolve any ambiguities.
Run it once with a general focus, then again with specific concerns.

Use the `Clarify` button suggested by `GitHub Copilot` to continue the flow, answer follow up questions (about 5 of them). For each Q/A, look at the `spec.md` to review the incremental changes.

**First pass - general clarification:**

```
/speckit.clarify

The frontend is a React 18 + Vite app in `src/ai-genius-web`. Resolve all [NEEDS CLARIFICATION] markers in the spec.

- The build output goes to `dist/`
- The Azure Static Web App deployment uses: `Azure/static-web-apps-deploy@v1` action
- GitHub secrets: AZURE_CREDENTIALS, AZURE_STATIC_WEB_APPS_API_TOKEN
- GitHub env variable: ENVIRONMENT, APP_NAME
- GitHub Action variable: VITE_API_URL

Only ask 1-2 questions max if needed.

```

**Second pass - deployment and security details (Optional):**

```
/speckit.clarify

Focus on deployment and security requirements.
- The Static Web App uses the Free tier for development and Standard for production.
- Concurrency based on group workflow and cancel older ones if newer job starts

Only ask 1-2 questions max if needed.

```

Review `specs/002-web-deploy/spec.md` after each clarify pass to confirm the
`[NEEDS CLARIFICATION]` markers are resolved.

---

### 3.3 - Create a Technical Implementation Plan

**In GitHub Copilot Chat**, use `/speckit.plan` to provide the tech stack and architecture choices. Spec-Kit translates the business requirements into a detailed technical implementation plan.

```
/speckit.plan

One week sprint for React 18 app built with Vite in `src/ai-genius-web`.

```

Spec-Kit generates into `specs/002-web-deploy/`:

| File            | Contents                           |
| --------------- | ---------------------------------- |
| `plan.md`       | Full technical implementation plan |
| `data-model.md` | Data structures and API schemas    |
| `contracts/`    | API endpoint contracts             |
| `research.md`   | Library choices and rationale      |
| `quickstart.md` | Key validation scenarios           |

The progress will take a long time. while waiting, let's explore the models, prompts, mcp for the GitHub Copilot inside VS Code. (talk about 5 minutes). Optional to show `how to create a custom agent` if needed to pass time.

---

### 3.4 - Generate Tasks

**In GitHub Copilot Chat**, use `/speckit.tasks` to generate an actionable task
list from the implementation plan. Tasks are derived from the contracts, data
model, and test scenarios.

```
/speckit.tasks
```

Spec-Kit reads `plan.md` and supporting documents to produce `specs/002-web-deploy/tasks.md` with:

- Tasks ordered by dependency
- Independent tasks marked `[P]` (safe to run in parallel)
- References to which contract or data-model entity each task implements

Review `specs/002-web-deploy/tasks.md` and adjust priorities if needed.

---

### 3.5 - Analyze and Validate

**In GitHub Copilot Chat**, use `/speckit.analyze` to run a cross-artifact consistency check. This catches mismatches between the spec, plan, contracts, and tasks before any code is written.

```
/speckit.analyze
```

Copilot will check:

- All API endpoints in `contracts/` are covered by tasks
- Data models referenced in the plan match the contracts
- The implementation phases have prerequisites and deliverables
- No speculative or "might need" features crept in

Address any inconsistencies reported before proceeding.

It will take 3-4 minutes, while waiting, show `GitHub Copilot Cli` and demostration the features.

---

### 3.6 - Validate the Spec (Optional)

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

### 3.7 - Implement

**In GitHub Copilot Chat**, switch to `Cloud` mode, then use `/speckit.implement` to execute the task list and build the frontend deployment workflow on the cloud. It will take about 10 minutes to finish.

```
/speckit.implement 002-web-deploy
```

Copilot will generate the `.github/workflows/deploy-web.yml` workflow, review and commit the generated workflow and any related changes:

```bash
git add .
git commit -m "feat: add frontend deployment workflow"
```

Go to GitHub to check newly created action inside `Actions` tab and verify the deployment status.

---

### 3.8 - Run the Frontend Deployment End-to-End

With the frontend deployment workflow implemented, push to GitHub and run the pipeline end-to-end to see if everything works. There is a working backup file inside `backup` folder.

#### Configure GitHub Secrets & Copilot Configure

Before the workflow can authenticate to Azure, set up the required secrets in your
GitHub repository under **Settings → Secrets and variables → Actions**. Refer to `GitHub Actions Settings` section inside `AGENTS.md` to create GitHub repo variable and secrets.

Raise a PR for the branch and merge to main.

#### Verify Success

1. Open the **Actions** tab and confirm the workflow run shows a green ✅ check.
2. Click into the run to inspect each step: checkout, setup node, install, build, deploy.
3. Open the Static Web App URL. e.g. https://agreeable-stone-0c6bbdd0f.7.azurestaticapps.net/
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

Use the Spec-Kit with `GitHub Cloud Agent` or `GitHub Copilot + Autopilot` to create a spec for deploying the backend API. The speed workflow runs all spec-kit commands: specify → clarify → plan → tasks → implement.

### 4.1 - Create the Backend Deployment (via GitHub Copilot Coding Agent)

Go to GitHub.com and select the repo, go to `Agent` tab to invoke agent session. It takes about 20 minutes to run. Suggest to launch this session in the beginning of the talk and leave it running in the background.

```
Please run below steps one by one, and provide response automatically. Don't overthink, make sure each step finishes promptly!

Step 1:
/speckit.specify

Deploy the AI Genius backend API via GitHub Actions. The backend is a .NET API in `src/ai-genius-api`.

- New GitHub Actions workflow (.github/workflows/003-deploy-api.yml)
- Follow the ENVIRONMENT & concurrency like `001-deploy-infra.yml`
- Triggers on every push to main.
- Builds the .NET API project as linux-x64 & self-contained.
- Deploys the API to Azure App Service using `azure/webapps-deploy@v3`

Step 2:
/speckit.clarify

- The API runs on .NET 10.
- The App Service Plan uses Linux B1, Zip deploy is used.
- Steps: checkout → setup-dotnet → dotnet publish → zip artifact → azure/webapps-deploy@v3
- The App Service name is configured as GitHub variable APP_SERVICE_NAME.

Step 3:
/speckit.plan

Step 4:
/speckit.tasks

Step 5:
/speckit.analyze

Step 6:
/speckit.checklist

Step 7:
/speckit.implement
```

### 4.2b - Create the Backend Deployment (via GitHub Copoilot + Autopilot)

Use `Autopilot` to implement the action end to end:

- Turn on `Autopilot` in VS Code
- Invoke the prompt in #4.2 in a sepearate VS Code IDE and run it locally.
- Don't create a branch in the prompt so that it is isolated.
- Checkout a second repo folder locally, so it wont conflict with part 3.

### 4.3 - Review Logs

Check the logs and review changes. We can check the progress during the wait time of earlier demo steps.

---

## Part 5 - Multiple Environment Quality Gates

> **Agenda:** Speed run to add quality gates to the frontend and backend pipelines.

Use the Spec-Kit with `GitHub Copilot Cli` to add quality gates and end to end CI/CD deployment to the CI/CD pipeline. Gates enforce code quality, security checks, and approvals before changes reach production.

### 5.1 - Create Multiple Environment Gates Spec

Create a local branch in VS Code, call it `004-multi-env-cicd`, then go to terminal windows inside VS code and run `copilot`.

```
Please run below steps one by one, and provide response automatically. Don't overthink, make sure each step finishes promptly!

Step 1:
/speckit.specify

Setup multiple environment deployment for bicep with approvals to the AI Genius CI/CD infra pipeline. Update the GitHub Actions workflows to include:

- New workflow (.github/workflows/004-multi-env-cicd.yml) that runs on every pull request to main
- Follow the ENVIRONMENT & concurrency like `001-deploy-infra.yml`
- `001-deploy-infra.yml` already have dev env, use this as baseline
- The pipeline should deployes bicep validation, bicep plan and deploy.
- Setup the stage for dev, qa, prod in order in the pipeline
- The deployment can't go to upper env until lower env is completed

Step 2:
/speckit.clarify

- Branch protection and environment rules are configured in GitHub repo / env Settings, not in workflow files.
- Document the process to setup up these in GitHub manually

Step 3:
/speckit.plan

Step 4:
/speckit.tasks

Step 5:
/speckit.analyze

Step 6:
/speckit.checklist

Step 7:
/speckit.implement
```

### 5.2 - Review Logs

Check the logs and review changes. We can check the progress during the wait time of earlier demo steps.

---

## Part 6 - Wrap-up

> **Agenda:** Wrap-up and next steps.

### What We Built Today

We used Spec-Kit and GitHub Copilot to:

1. **Set up** the spec-kit scaffolding and project constitution.
2. **Understood** a complete, existing spec (`001-bicep-deploy`) by reading every artifact.
3. **Created** a frontend deployment spec step-by-step - specify → clarify → checklist → plan → tasks → analyze → implement.
4. **Speed-ran** the same workflow for the backend API.
5. **Added** quality gates as a new spec without touching a single workflow file manually.

Every decision - from auth to environment tiers to reviewer counts - lives in the spec. The code is just its expression.

### Explore Spec-Kit Further

**GitHub repository:** [github.com/github/spec-kit](https://github.com/github/spec-kit)

---

_AI Genius - Season 4, Episode 2 · Spec-Kit with GitHub Copilot_
