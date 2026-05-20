# 003 — API Deploy

GitHub Actions workflow that builds the `src/ai-genius-api` .NET 10 backend and
deploys it to Azure App Service.

## Artifacts in this folder

| File | Purpose |
|------|---------|
| [`spec.md`](spec.md) | Feature specification (user stories, FRs, success criteria, clarifications) |
| [`plan.md`](plan.md) | Implementation plan and Constitution Check |
| [`research.md`](research.md) | Phase 0 decisions and alternatives considered |
| [`data-model.md`](data-model.md) | Logical entities (workflow, job, build artifact) |
| [`quickstart.md`](quickstart.md) | How to run and troubleshoot the workflow |
| [`contracts/workflow-interface.md`](contracts/workflow-interface.md) | Inputs, outputs, failure modes |
| [`tasks.md`](tasks.md) | Implementation task breakdown (T001–T013) |
| [`analysis.md`](analysis.md) | Cross-artifact coverage matrix |
| [`checklists/requirements.md`](checklists/requirements.md) | Spec quality checklist |

## Result

- Workflow file: [`.github/workflows/003-deploy-api.yml`](../../.github/workflows/003-deploy-api.yml)
- Triggers on push to `main` and `workflow_dispatch` (env: `dev`/`qa`/`prod`).
- Build → zip → deploy pipeline using `azure/webapps-deploy@v3`.

## Configuration required

| Kind | Name | Scope | Purpose |
|------|------|-------|---------|
| Secret | `AZURE_CREDENTIALS` | Repository | Service principal JSON for `azure/login@v1` |
| Variable | `APP_SERVICE_NAME` | Environment (`dev`/`qa`/`prod`) | Target App Service name |

See [`quickstart.md`](quickstart.md) for the step-by-step run guide.
