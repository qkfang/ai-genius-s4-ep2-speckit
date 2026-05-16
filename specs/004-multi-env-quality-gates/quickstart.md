# Quickstart: Multi-Environment Pipeline Setup

> Manual GitHub configuration steps required for `004-multi-env-ci.yml` to
> work end-to-end.  **None of these steps involve editing workflow YAML.**

---

## Prerequisites

- You have **admin** access to the `qkfang/ai-genius-s4-ep2-speckit` repository.
- `AZURE_CREDENTIALS` secret is already set at repository level (used by
  existing `001-deploy-infra.yml`).
- `AZURE_RESOURCE_GROUP` and `APP_NAME` variables are already set.

---

## Step 1 — Create GitHub Environments

1. Go to **Settings → Environments** in the repo.
2. Create three environments (exact names matter — they match `environment:`
   keys in the workflow):

   | Environment name | Notes |
   |-----------------|-------|
   | `dev` | No protection rules needed |
   | `qa` | Add required reviewer(s) — see Step 2 |
   | `prod` | Add required reviewer(s) — see Step 2 |

---

## Step 2 — Add Approval Gates (qa and prod)

For **each** of `qa` and `prod`:

1. Open the environment in **Settings → Environments**.
2. Under **Environment protection rules**, tick **Required reviewers**.
3. Search for and add at least one reviewer (user or team).
4. Click **Save protection rules**.

> When a workflow job targets `qa` or `prod`, GitHub will pause the run and
> send a notification to the required reviewers.  The job proceeds only after
> approval.

---

## Step 3 — Configure Branch Protection on `main`

1. Go to **Settings → Branches → Add rule** (or edit the existing `main` rule).
2. Set the **Branch name pattern** to `main`.
3. Enable the following:

   | Setting | Value |
   |---------|-------|
   | Require a pull request before merging | ✅ enabled |
   | Required approvals | 1 |
   | Require status checks to pass before merging | ✅ enabled |
   | Required status checks | `Bicep Validate` (from `validate` job) |
   | Do not allow bypassing the above settings | ✅ enabled |

4. Click **Save changes** (or **Create** for a new rule).

> The status check name `Bicep Validate` is the `name:` field of the
> `validate` job in `004-multi-env-ci.yml`.

---

## Step 4 — Verify the Workflow Triggers

1. Open a pull request targeting `main`.
2. Confirm the **004 Multi-Env Bicep CI** check appears in the PR status area.
3. Watch the Actions run: `validate → plan-dev → deploy-dev` should proceed
   automatically; `plan-qa` should pause and display a **"Review deployments"**
   button.
4. Click **Review deployments**, select `qa`, and approve.
5. Repeat for `prod` after `deploy-qa` completes.

---

## Environment-Specific Resource Groups (optional)

If you want each environment in its own Azure resource group, override
`AZURE_RESOURCE_GROUP` at the GitHub Environment level:

1. Open **Settings → Environments → `dev`** (or `qa` / `prod`).
2. Under **Environment variables**, add `AZURE_RESOURCE_GROUP` with the
   environment-specific value (e.g., `rg-aigenius4-qa`).
3. Repeat for each environment.

GitHub environment-level variables take precedence over repository-level ones.
