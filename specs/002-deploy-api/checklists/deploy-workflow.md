# Deploy Workflow Quality Checklist: Deploy AI Genius Backend API via GitHub Actions

**Purpose**: Validate that the requirements for the GitHub Actions deploy workflow are complete, clear, and consistent against standard best practices for CI/CD deploy pipelines.
**Created**: 2026-05-16
**Feature**: [spec.md](../spec.md)

## Triggers & Concurrency

- [ ] CHK001 Are all workflow triggers (push, workflow_dispatch) explicitly enumerated with their scopes? [Completeness, Spec §FR-002, §FR-003]
- [ ] CHK002 Is the default value and allowed set for the `environment` input unambiguously specified? [Clarity, Spec §FR-003]
- [ ] CHK003 Is the concurrency group key (workflow + ref) and `cancel-in-progress` behavior explicitly defined? [Clarity, Spec §FR-005]
- [ ] CHK004 Are requirements defined for behavior when `workflow_dispatch` is invoked from a non-`main` ref? [Edge Case, Spec §Edge Cases]

## Environments, Secrets & Variables

- [ ] CHK005 Are the GitHub Environment names (`dev`/`qa`/`prod`) and their selection rules documented? [Completeness, Spec §FR-004]
- [ ] CHK006 Is the source of the App Service name (env-scoped variable `APP_SERVICE_NAME`) specified with no hard-coded fallback? [Clarity, Spec §FR-010]
- [ ] CHK007 Are the Azure authentication mechanism and required secret name (`AZURE_CREDENTIALS`) explicitly identified? [Completeness, Spec §FR-008]
- [ ] CHK008 Are requirements specified for behavior when an environment is missing `APP_SERVICE_NAME` or `AZURE_CREDENTIALS`? [Edge Case, Spec §Edge Cases]
- [ ] CHK009 Are least-privilege expectations for the Azure credential / job `permissions` block documented? [Gap, Security]

## Build & Package

- [ ] CHK010 Is the target .NET SDK version (.NET 10) and project path (`src/ai-genius-api/ai-genius-api.csproj`) explicitly pinned? [Clarity, Spec §FR-006]
- [ ] CHK011 Are the publish parameters (Release, linux-x64, self-contained) fully specified and consistent with the Linux B1 plan? [Consistency, Spec §FR-006, §FR-015]
- [ ] CHK012 Is the zip packaging step's input directory and output artifact contract defined unambiguously? [Clarity, Spec §FR-007]
- [ ] CHK013 Is the ordered step sequence (checkout → setup-dotnet → publish → zip → deploy) defined without ambiguity? [Clarity, Spec §FR-014]
- [ ] CHK014 Is the runner image (`ubuntu-latest`) specified consistently with sibling workflows? [Consistency, Spec §FR-012]

## Deployment

- [ ] CHK015 Is the deploy action and version (`azure/webapps-deploy@v3`) and deployment method (zip deploy) explicitly specified? [Clarity, Spec §FR-009]
- [ ] CHK016 Is fail-fast behavior across all steps (checkout, setup, publish, zip, login, deploy) explicitly required? [Completeness, Spec §FR-011]
- [ ] CHK017 Are requirements defined for what happens to the existing App Service deployment when build or deploy fails? [Edge Case, Spec §Edge Cases]

## Observability & Verification

- [ ] CHK018 Are requirements defined for surfacing failed runs visibly in the Actions UI (status, logs)? [Coverage, Spec §Edge Cases]
- [ ] CHK019 Is there a defined post-deploy verification expectation (e.g., health/version endpoint)? [Gap, Spec §US1 Independent Test]

## Non-Functional & Maintenance

- [ ] CHK020 Are version-pinning expectations for third-party actions (`actions/checkout`, `actions/setup-dotnet`, `azure/login`, `azure/webapps-deploy`) specified? [Gap, Security/Maintainability]
- [ ] CHK021 Are requirements consistent with `001-deploy-infra.yml` conventions (environment block, concurrency, runner) as claimed? [Consistency, Spec §FR-003, §FR-005]
- [ ] CHK022 Is the assumption that the API project builds as-is (no source changes required) documented and validated? [Assumption, Spec §FR-013]
