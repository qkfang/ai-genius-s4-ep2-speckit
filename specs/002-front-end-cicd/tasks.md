# Tasks: Frontend CI/CD Deployment

**Feature Branch**: `002-front-end-cicd`  
**Input**: Design documents from `/specs/002-front-end-cicd/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/workflow-interface.md, quickstart.md

**Tests**: No test tasks included (not requested in feature specification)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create workflow directory structure and verify prerequisites

- [ ] T001 Create .github/workflows/ directory if not exists
- [ ] T002 Verify src/ai-genius-web/package.json and package-lock.json exist

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

**Status**: No foundational tasks required for this feature (workflow is self-contained)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Automated Deployment on Code Push (Priority: P1) 🎯 MVP

**Goal**: Developer pushes to main branch → GitHub Actions workflow automatically builds and deploys frontend to Azure Static Web Apps within 5 minutes

**Independent Test**: Push a simple code change (e.g., update text in src/ai-genius-web/src/App.jsx) to main branch and verify the change appears at the deployed Static Web App URL within 5 minutes

### Implementation for User Story 1

- [ ] T003 [US1] Create workflow file .github/workflows/deploy-web.yml with name and push trigger on main branch
- [ ] T004 [US1] Add checkout step using actions/checkout@v4 in .github/workflows/deploy-web.yml
- [ ] T005 [US1] Add Node.js setup step using actions/setup-node@v4 with node-version 20 and npm cache in .github/workflows/deploy-web.yml
- [ ] T006 [US1] Add install dependencies step running npm ci in src/ai-genius-web directory in .github/workflows/deploy-web.yml
- [ ] T007 [US1] Add build application step running npm run build in src/ai-genius-web directory in .github/workflows/deploy-web.yml
- [ ] T008 [US1] Add deploy step using Azure/static-web-apps-deploy@v1 with app_location set to src/ai-genius-web/dist and skip_app_build true in .github/workflows/deploy-web.yml

**Checkpoint**: At this point, User Story 1 should be fully functional - pushing to main triggers automated build and deployment

---

## Phase 4: User Story 2 - Secure Authentication Without Stored Secrets (Priority: P2)

**Goal**: Workflow authenticates to Azure using OIDC federated identity without storing long-lived credentials in repository

**Independent Test**: Review .github/workflows/deploy-web.yml and GitHub repository secrets to verify no passwords, API keys, or connection strings are stored, only non-sensitive identifiers (client ID, tenant ID, subscription ID)

**Dependencies**: Depends on User Story 1 workflow structure (T003-T008)

### Implementation for User Story 2

- [ ] T009 [US2] Add permissions block with id-token: write and contents: read to .github/workflows/deploy-web.yml
- [ ] T010 [US2] Add Azure Login step using azure/login@v2 before deploy step in .github/workflows/deploy-web.yml with client-id, tenant-id, subscription-id from GitHub Secrets
- [ ] T011 [US2] Update deploy step in .github/workflows/deploy-web.yml to use OIDC authentication instead of API token (if using Azure CLI deployment method)
- [ ] T012 [US2] Document required GitHub Secrets (AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_SUBSCRIPTION_ID) in quickstart.md Prerequisites section (verify already documented)
- [ ] T013 [US2] Document Azure federated credential configuration steps in quickstart.md Prerequisites section (verify already documented)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - automated deployment with OIDC security

---

## Phase 5: User Story 3 - Visible Deployment Status (Priority: P3)

**Goal**: Developers view deployment status in GitHub Actions tab with clear success/failure indicators and error messages

**Independent Test**: Trigger workflow run and verify GitHub Actions tab shows green check for success, step-by-step logs are visible, and intentional build error shows red X with clear error message

**Dependencies**: Depends on User Story 1 workflow structure (T003-T008)

### Implementation for User Story 3

- [ ] T014 [P] [US3] Add descriptive name properties to all workflow steps in .github/workflows/deploy-web.yml (e.g., "Checkout code", "Setup Node.js", "Install dependencies", "Build application", "Azure Login (OIDC)", "Deploy to Azure Static Web Apps")
- [ ] T015 [US3] Verify workflow uses ubuntu-latest runner for clear log output in .github/workflows/deploy-web.yml
- [ ] T016 [US3] Add workflow status badge to repository README.md showing deployment status
- [ ] T017 [US3] Document workflow monitoring steps in quickstart.md Daily Usage section (verify already documented)

**Checkpoint**: All user stories should now be independently functional - full automated deployment with security and visibility

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final validation

- [ ] T018 [P] Review .github/workflows/deploy-web.yml for consistency with workflow-interface.md contract
- [ ] T019 [P] Validate workflow syntax using GitHub Actions validator or local tools
- [ ] T020 Add example workflow run output to quickstart.md for troubleshooting reference
- [ ] T021 Run through quickstart.md validation steps to verify all documented procedures are accurate
- [ ] T022 [P] Update .github/copilot-instructions.md with workflow file location if needed
- [ ] T023 Verify constitution compliance: zero long-lived secrets stored, automated deployment on push to main

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: No tasks (skipped for this feature)
- **User Story 1 (Phase 3)**: Depends on Setup completion - MUST complete first (core workflow)
- **User Story 2 (Phase 4)**: Depends on User Story 1 (T003-T008) - modifies existing workflow
- **User Story 3 (Phase 5)**: Depends on User Story 1 (T003-T008) - enhances existing workflow
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Setup (Phase 1) - No dependencies on other stories - MUST BE IMPLEMENTED FIRST
- **User Story 2 (P2)**: Depends on User Story 1 workflow file existing (T003-T008) - Adds OIDC authentication to existing workflow
- **User Story 3 (P3)**: Depends on User Story 1 workflow file existing (T003-T008) - Adds visibility features to existing workflow

**Important**: Unlike typical features, User Stories 2 and 3 modify the same workflow file created in User Story 1. They CANNOT be implemented in parallel - must follow priority order (P1 → P2 → P3).

### Within Each User Story

**User Story 1**:
- T003 (create file) MUST be first
- T004-T007 can proceed sequentially (building workflow step by step)
- T008 (deploy step) completes the workflow

**User Story 2**:
- T009-T010 modify workflow structure (add permissions, add login step)
- T011 adjusts deploy step for OIDC
- T012-T013 update documentation in parallel with code changes

**User Story 3**:
- T014-T015 enhance existing workflow (can be done in parallel)
- T016-T017 update documentation

### Parallel Opportunities

- **Phase 1**: T001 and T002 can run in parallel (different operations)
- **User Story 1**: Tasks must be sequential (building single workflow file)
- **User Story 2**: T012-T013 (documentation) can run in parallel with T009-T011 (code changes)
- **User Story 3**: T014-T015 (workflow enhancements) can run in parallel
- **User Story 3**: T016-T017 (documentation) can run in parallel with T014-T015
- **Polish**: T018-T019 (validation) can run in parallel, T020-T022 (documentation) can run in parallel

**Note**: Due to all tasks modifying the same workflow file (.github/workflows/deploy-web.yml), parallelization opportunities are limited. Recommend implementing sequentially in priority order: US1 → US2 → US3.

---

## Parallel Example: User Story 3

Once User Story 1 is complete, User Story 3 enhancements can proceed:

```bash
# Task T014-T015: Workflow enhancements (can be in same commit)
git checkout -b us3-visibility-enhancements
# Edit .github/workflows/deploy-web.yml - add step names and verify runner
git add .github/workflows/deploy-web.yml

# Task T016-T017: Documentation (can be in same or different commit)
# Edit README.md - add status badge
# Review quickstart.md - verify monitoring steps documented
git add README.md
git commit -m "feat(US3): Add workflow visibility enhancements and documentation"
git push origin us3-visibility-enhancements
```

**Estimated Duration**: 1-2 hours for User Story 3 implementation

---

## Implementation Strategy

### Minimum Viable Product (MVP)

**MVP Scope**: User Story 1 (P1) only
- Basic automated deployment workflow
- Push to main → build and deploy
- Green check on success, red X on failure

**MVP Deliverable**: .github/workflows/deploy-web.yml with 6 steps (checkout, Node setup, install, build, deploy, basic naming)

**MVP Validation**: Push test commit to main, verify deployment completes within 5 minutes and site updates

### Incremental Delivery

**Iteration 1 (MVP)**: User Story 1 - Core automated deployment
- Satisfies: FR-001 through FR-004, FR-006 through FR-009
- Missing: OIDC security (temporarily use API token if needed)
- Duration: 2-3 hours

**Iteration 2 (Security)**: User Story 2 - OIDC authentication
- Satisfies: FR-005 (secure authentication), SC-003 (zero stored credentials)
- Builds on: Iteration 1 workflow
- Duration: 1-2 hours (assumes Azure infrastructure already configured)

**Iteration 3 (Polish)**: User Story 3 - Enhanced visibility
- Satisfies: SC-005 (actionable error messages), improved developer experience
- Builds on: Iteration 1-2 workflow
- Duration: 1 hour

**Total Estimated Duration**: 4-6 hours for full feature implementation

---

## Task Summary

**Total Tasks**: 23

**By Phase**:
- Phase 1 (Setup): 2 tasks
- Phase 2 (Foundational): 0 tasks (skipped)
- Phase 3 (User Story 1): 6 tasks
- Phase 4 (User Story 2): 5 tasks
- Phase 5 (User Story 3): 4 tasks
- Phase 6 (Polish): 6 tasks

**By User Story**:
- User Story 1 (P1): 6 tasks - Core automated deployment
- User Story 2 (P2): 5 tasks - OIDC security
- User Story 3 (P3): 4 tasks - Visibility enhancements

**Parallelizable Tasks**: 8 tasks marked [P]
- Most tasks are sequential due to single-file workflow implementation

**Independent Test Criteria**:
- User Story 1: Push code change → verify deployment within 5 minutes
- User Story 2: Review workflow and secrets → verify no long-lived credentials stored
- User Story 3: View Actions tab → verify clear status and error messages

---

## Format Validation

✅ All tasks follow checklist format: `- [ ] [TaskID] [P?] [Story?] Description with file path`
✅ All user story tasks include story label ([US1], [US2], [US3])
✅ All tasks include specific file paths where applicable
✅ Parallel tasks marked with [P]
✅ Each user story has independent test criteria
✅ Dependencies clearly documented
