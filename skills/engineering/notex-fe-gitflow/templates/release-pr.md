# Production Release

**Release Version:**
**Source:** `main`
**Target:** `prod`
**Release Owner:**

## 1. Release Scope

| Feature / Fix | PR  | FE Status | BE Ready |
| ------------- | --- | --------- | -------- |
|               |     |           |          |

## 2. Release Candidate

- Main SHA:
- Prod baseline SHA:
- Release candidate SHA:
- Dependency check (`release_independent: false` already in the batch?):
- Regression scope / evidence:
- FE/BE compatibility:
- Tenant configuration changes:

## 3. Release Gate

- [ ] All included changes approved
- [ ] No unintended changes in release diff
- [ ] Ancestry: `git log origin/main..origin/prod` is empty
- [ ] Patch equivalence: every prod-only commit has an equivalent on `main`
- [ ] Hotfix tracking: no `Pending` on `prod`/`main`/`staging`/`develop`
- [ ] Unreleased dependencies satisfied (in the batch, or refactored)
- [ ] Required CI passed **on the merge result with `prod`**
- [ ] Release candidate regression verified — across the combination, not inferred from each feature
- [ ] BE PROD compatibility confirmed
- [ ] Testing window / freeze agreed (if the RC was verified on STAGING)
- [ ] Rollback plan ready

## 4. Production Deployment

- Deployment SHA:
- Deployment time:
- Smoke test:
- QC owner:
- Release tag:
- Release result:
