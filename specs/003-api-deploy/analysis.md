# Cross-Artifact Analysis: 003-api-deploy

**Date**: 2026-05-20

## Coverage Matrix

| Requirement | Spec | Plan | Data Model | Contract | Tasks |
|-------------|------|------|------------|----------|-------|
| FR-001 workflow path | ✅ | ✅ | ✅ | ✅ | T003 |
| FR-002 triggers | ✅ | ✅ | ✅ | ✅ | T003 |
| FR-003 concurrency | ✅ | ✅ | ✅ | — | T003 |
| FR-004 environment binding | ✅ | ✅ | ✅ | — | T005 |
| FR-005 dotnet publish (.NET 10, linux-x64, self-contained) | ✅ | ✅ | ✅ | — | T007, T008 |
| FR-006 zip artifact | ✅ | ✅ | ✅ | — | T009 |
| FR-007 azure/login | ✅ | ✅ | — | ✅ | T010 |
| FR-008 webapps-deploy@v3 with vars.APP_SERVICE_NAME | ✅ | ✅ | ✅ | ✅ | T011 |
| FR-009 fail fast | ✅ | ✅ | — | ✅ | implicit (default GH Actions) |

## Consistency Checks

- Action versions match constitution & repo conventions (`@v4`, `@v1`, `@v3`). ✅
- Environment values (`dev`/`qa`/`prod`) match `001-deploy-infra.yml`. ✅
- Reuses existing `AZURE_CREDENTIALS` secret and `APP_SERVICE_NAME` variable (no new secrets). ✅
- Concurrency group identical to `001-deploy-infra.yml` (`${{ github.workflow }}-${{ github.ref }}`). ✅

## Open Risks

- .NET 10 SDK availability on `ubuntu-latest` — `actions/setup-dotnet@v4` with `10.0.x` installs the SDK; no risk.
- App Service runtime not configured for self-contained payloads — self-contained publish bundles runtime, so no platform stack mismatch.

## Verdict

All artifacts are internally consistent. No NEEDS CLARIFICATION markers. Ready to implement.
