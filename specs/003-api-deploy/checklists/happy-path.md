# Happy-Path Checklist: Backend API CI/CD Pipeline

**Purpose**: Validate that the requirements for the main happy-path use case (push to `main` → build → deploy to App Service) are complete, clear, consistent, and measurable.
**Created**: 2026-03-22
**Feature**: [spec.md](../spec.md)

## Trigger Requirements

- [ ] CHK001 Is the trigger event for automatic deployment explicitly specified (push to `main`)? [Completeness, Spec §FR-001]
- [ ] CHK002 Is the default environment for automated push triggers unambiguously defined as `dev`? [Clarity, Spec §FR-013]
- [ ] CHK003 Is the workflow file location (`.github/workflows/003-deploy-api.yml`) specified? [Completeness, Spec §FR-003]

## Build Requirements

- [ ] CHK004 Is the .NET SDK version pinned to a specific value (.NET 10)? [Clarity, Spec §FR-005]
- [ ] CHK005 Is the API project path (`src/ai-genius-api/ai-genius-api.csproj`) explicitly identified? [Completeness, Spec §FR-005]
- [ ] CHK006 Is the build configuration (`Release`) specified for `dotnet publish`? [Clarity, Spec §FR-006]
- [ ] CHK007 Is the packaging format (`.zip` artifact for Zip Deploy) explicitly required? [Clarity, Spec §FR-006]

## Deploy Requirements

- [ ] CHK008 Is the Azure authentication mechanism (`azure/login@v1` + `AZURE_CREDENTIALS` secret) defined? [Completeness, Spec §FR-004]
- [ ] CHK009 Is the deploy action and mode (`azure/webapps-deploy@v3`, Zip Deploy) explicitly specified? [Clarity, Spec §FR-007]
- [ ] CHK010 Is the source of the target App Service name (`vars.APP_SERVICE_NAME`) unambiguously defined? [Clarity, Spec §FR-008]
- [ ] CHK011 Is the exact ordered sequence of build/deploy steps documented end-to-end? [Completeness, Spec §FR-008a]

## Success Criteria Quality

- [ ] CHK012 Is happy-path completion time bounded with a measurable threshold (e.g., ≤10 minutes)? [Measurability, Spec §SC-001]
- [ ] CHK013 Is "deployment success" objectively verifiable (e.g., via a health/version endpoint)? [Measurability, Spec §SC-002]
- [ ] CHK014 Are happy-path acceptance scenarios written in Given/When/Then form with observable outcomes? [Clarity, Spec §User Story 1]

## Assumptions & Dependencies

- [ ] CHK015 Is the assumption that the target App Service already exists (provisioned by `001-deploy-infra.yml`) documented? [Assumption, Spec §Assumptions]
- [ ] CHK016 Is the assumption that `vars.APP_SERVICE_NAME` is pre-configured per environment stated? [Assumption, Spec §Assumptions]
- [ ] CHK017 Is the assumption that `AZURE_CREDENTIALS` already exists and has permission to deploy documented? [Assumption, Spec §Assumptions]

## Notes

- Check items off as completed: `[x]`
- This checklist intentionally excludes manual-dispatch (P2), concurrency (P3), and edge-case requirements to keep focus on the push-to-main happy path.
