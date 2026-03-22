# Tasks: Bicep Infrastructure-as-Code CI/CD Pipeline

**Feature**: `001-bicep-cicd-workflow`
**Generated**: 2026-03-22
**Input**: `specs/001-bicep-cicd-workflow/plan.md`, `spec.md`, `data-model.md`, `contracts/workflow-interface.md`, `research.md`, `quickstart.md`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Maps to user story in spec.md — US1, US2, US3
- Exact file paths are included in every task description

---

## Phase 1: Setup

**Purpose**: Verify existing Bicep assets are compatible with the planned workflow; remove conflicting legacy files.

- [ ] T001 Review `bicep/main.bicep` — confirm outputs `nodeAppHostname`, `staticWebAppToken` are declared and `appName`/`environment` parameters are passed through to both module calls (`webapp` and `staticwebapp`)
- [ ] T002 Check for and remove legacy `.github/workflows/infra-deploy.yml` if it exists (superseded by `deploy-infra.yml` per plan.md)

---

## Phase 2: Foundational — Bicep Parameter Files

**Purpose**: Create the three per-environment ARM parameter files required by `az deployment group create`. No workflow deployment can succeed without them.

**⚠️ CRITICAL**: The `infra` job will fail immediately with a file-not-found error if any parameter file is missing before any Azure resource is mutated (data-model.md guarantee G5, FR-014).

- [ ] T003 [P] Create `bicep/parameters.dev.json` — ARM schema `https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#`, parameters: `appName=aigenius`, `environment=dev`, `appServicePlanSku=B1`, `staticWebAppSku=Free`
- [ ] T004 [P] Create `bicep/parameters.qa.json` — ARM schema `https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#`, parameters: `appName=aigenius`, `environment=qa`, `appServicePlanSku=B1`, `staticWebAppSku=Free`
- [ ] T005 [P] Create `bicep/parameters.prod.json` — ARM schema `https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#`, parameters: `appName=aigenius`, `environment=prod`, `appServicePlanSku=B2`, `staticWebAppSku=Standard`

**Checkpoint**: All three parameter files exist — the `infra` job can now select the correct file at runtime via `bicep/parameters.$ENV_SHORT.json`.

---

## Phase 3: User Story 1 — Automated Infrastructure Provisioning on Code Push (Priority: P1) 🎯 MVP

**Goal**: Every push to `main` automatically triggers the pipeline, authenticates to Azure via OIDC (no stored secrets), creates or verifies the resource group, deploys `bicep/main.bicep`, and emits `app-service-name` and `static-web-app-token` as job outputs for downstream jobs.

**Independent Test**: Push an empty commit (`git commit --allow-empty -m "chore: trigger infra deploy" && git push origin main`), wait for the Actions run to complete, then verify in the Azure portal that `rg-aigenius-dev` contains App Service Plan + Web App + Static Web App with correct tags, and that the workflow run shows non-empty values for both job outputs.

- [ ] T006 [US1] Create `.github/workflows/deploy-infra.yml` — `name: Deploy Infrastructure to Azure`, `on: push: branches: [main]`, `concurrency: {group: "deploy-${{ github.ref }}", cancel-in-progress: true}`, `env: {APP_NAME: aigenius, AZURE_LOCATION: eastus2}`
- [ ] T007 [US1] Add `infra` job skeleton to `.github/workflows/deploy-infra.yml` — `runs-on: ubuntu-latest`, `permissions: {id-token: write, contents: read}`, `outputs` block declaring `app-service-name: ${{ steps.capture-outputs.outputs.app-service-name }}` and `static-web-app-token: ${{ steps.capture-outputs.outputs.static-web-app-token }}`
- [ ] T008 [US1] Add `checkout` step (`uses: actions/checkout@v4`) and `azure-login` step (`uses: azure/login@v2` with `client-id: ${{ secrets.AZURE_CLIENT_ID }}`, `tenant-id: ${{ secrets.AZURE_TENANT_ID }}`, `subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}`) to `infra` job in `.github/workflows/deploy-infra.yml`
- [ ] T009 [US1] Add `env-map` step (id: `env-map`) to `infra` job in `.github/workflows/deploy-infra.yml` — bash `case` on `${{ github.event.inputs.environment || 'development' }}` mapping `development→dev`, `staging→qa`, `production→prod`; `else` branch exits non-zero; writes `env_short`, `resource_group` (`rg-aigenius-$env_short`), and `param_file` (`bicep/parameters.$env_short.json`) to `$GITHUB_OUTPUT`
- [ ] T010 [US1] Add `create-rg` step to `infra` job in `.github/workflows/deploy-infra.yml` — `az group create --name ${{ steps.env-map.outputs.resource_group }} --location ${{ env.AZURE_LOCATION }}`
- [ ] T011 [US1] Add `deploy-bicep` step to `infra` job in `.github/workflows/deploy-infra.yml` — `az deployment group create --name main-deploy --resource-group ${{ steps.env-map.outputs.resource_group }} --template-file bicep/main.bicep --parameters @${{ steps.env-map.outputs.param_file }}`
- [ ] T012 [US1] Add `capture-outputs` step (id: `capture-outputs`) to `infra` job in `.github/workflows/deploy-infra.yml` — query `az deployment group show --name main-deploy --resource-group ... --query properties.outputs.nodeAppHostname.value --output tsv` and `staticWebAppToken.value`; write `app-service-name` and `static-web-app-token` to `$GITHUB_OUTPUT`
- [ ] T013 [US1] Add placeholder `deploy-api` job to `.github/workflows/deploy-infra.yml` — `needs: [infra]`, `runs-on: ubuntu-latest`, single step echoing `Deploying API to ${{ needs.infra.outputs.app-service-name }}`
- [ ] T014 [US1] Add placeholder `deploy-web` job to `.github/workflows/deploy-infra.yml` — `needs: [infra]`, `runs-on: ubuntu-latest`, single step echoing `SWA token present: ${{ needs.infra.outputs.static-web-app-token }}`

**Checkpoint**: US1 complete — pushing to `main` triggers the full `infra` job end-to-end; `deploy-api` and `deploy-web` stub jobs are reachable and consume outputs via `needs.infra.outputs.*`.

---

## Phase 4: User Story 2 — Manual Infrastructure Deployment via Workflow Dispatch (Priority: P2)

**Goal**: Operators can re-deploy or recover infrastructure on demand (any environment) from the GitHub Actions UI without pushing a commit.

**Independent Test**: Navigate to **Actions → Deploy Infrastructure to Azure → Run workflow**, select `staging`, click **Run workflow** — verify `rg-aigenius-qa` is provisioned or updated with correct resources and tags, without a code change.

- [ ] T015 [US2] Add `workflow_dispatch` trigger to the `on:` block in `.github/workflows/deploy-infra.yml` — `inputs.environment`: `type: choice`, `description: Target deployment environment`, `default: development`, `options: [development, staging, production]`

**Checkpoint**: US2 complete — the workflow now appears in the "Run workflow" dropdown; both push and dispatch triggers share the same `env-map` step logic (already written to handle `${{ github.event.inputs.environment || 'development' }}` in T009).

---

## Phase 5: User Story 3 — Consistent Tagging of All Azure Resources (Priority: P3)

**Goal**: Every Azure resource provisioned by any pipeline run (App Service Plan, Web App, Static Web App) carries `app`, `environment`, and `managedBy=bicep` tags with correct values.

**Independent Test**: After a successful pipeline run (`dev`), run `az resource list --resource-group rg-aigenius-dev --query "[?tags.managedBy == 'bicep'].{name:name, env:tags.environment}" --output table` and confirm all three resources appear with non-empty `env` values.

- [ ] T016 [P] [US3] Audit `bicep/modules/webapp.bicep` — verify or add `app`, `environment`, and `managedBy` tag declarations on both the App Service Plan resource and the Web App resource; tag values must reference the corresponding Bicep parameters
- [ ] T017 [P] [US3] Audit `bicep/modules/staticwebapp.bicep` — verify or add `app`, `environment`, and `managedBy` tag declarations on the Static Web App resource; tag values must reference the corresponding Bicep parameters
- [ ] T018 [US3] Audit `bicep/main.bicep` — confirm `appName` and `environment` parameters are wired through to both module calls (`module webapp` and `module staticwebapp`) so tag values resolve correctly at deploy time; add parameter wiring if missing

**Checkpoint**: US3 complete — every deployment will produce fully-tagged resources auditable via Azure Resource Graph (`az resource list --query "[?tags.managedBy == 'bicep']"`).

---

## Final Phase: Polish & Cross-Cutting Concerns

- [ ] T019 [P] Validate `.github/workflows/deploy-infra.yml` end-to-end — confirm `concurrency` block is at workflow level (not job level), all three `secrets.*` references match required names (`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`), step id `env-map` and `capture-outputs` match output references in job `outputs` block, and both `deploy-api`/`deploy-web` carry `needs: [infra]`
- [ ] T020 [P] Run pre-flight Bicep validation — `az deployment group what-if --resource-group rg-aigenius-dev --template-file bicep/main.bicep --parameters @bicep/parameters.dev.json` — confirm template syntax and parameter file are compatible before the first push to `main`

---

## Dependencies

```
Phase 1 (Setup)
    │
    ▼
Phase 2 (Parameter files: T003, T004, T005 run in parallel)
    │
    ▼
Phase 3 / US1 (T006 → T007 → T008 → T009 → T010 → T011 → T012 → T013 → T014)
    │
    ├──► Phase 4 / US2 (T015 — adds dispatch trigger to workflow file)
    │
    └──► Phase 5 / US3 (T016, T017 in parallel → T018)  [independent of US2]
              │
              └──────────┐
                         ▼
               Phase 4+5 complete ──► Final Phase (T019, T020 in parallel)
```

**User story completion order**:
1. **US1** (P1) — must complete first; creates the workflow file all other stories extend
2. **US2** (P2) — depends on US1 (modifies the same workflow file's `on:` block)
3. **US3** (P3) — independent of US1/US2 (modifies only Bicep modules); can run concurrently with US2

---

## Parallel Execution Examples

### Phase 2 — Parameter files (3 parallel agents)

```
After T002 (Setup done):
  Agent A ──► T003  bicep/parameters.dev.json
  Agent B ──► T004  bicep/parameters.qa.json
  Agent C ──► T005  bicep/parameters.prod.json
  → All merge into Phase 3
```

### Phase 3 — US1 has no internal parallelism

T006–T014 each extend the same workflow file sequentially; all must run in order.

### After US1 — US2 and US3 run in parallel

```
After T014 (US1 complete):
  Agent A ──► T015  (US2 — add dispatch trigger to .github/workflows/deploy-infra.yml)
  Agent B ──► T016  (US3 — audit bicep/modules/webapp.bicep)
              T017  (US3 — audit bicep/modules/staticwebapp.bicep, parallel with T016)
              T018  (US3 — audit bicep/main.bicep, after T016+T017)
  → Merge: T019, T020 (Final Phase, parallel)
```

---

## Implementation Strategy

**Suggested MVP scope — complete Phases 1–3 first (US1 only)**:

| Phase | Tasks | Deliverable |
|-------|-------|-------------|
| Setup | T001–T002 | Verified Bicep outputs; no conflicting files |
| Foundational | T003–T005 | Three parameter files in `bicep/` |
| US1 (P1) | T006–T014 | Full `infra` job + placeholder downstream jobs in `.github/workflows/deploy-infra.yml` |

With US1 complete, the pipeline executes end-to-end on every push to `main`. US2 (manual dispatch, T015) and US3 (tag audit, T016–T018) are additive and low-risk — both can land in a single follow-up commit without touching the core infra logic.
