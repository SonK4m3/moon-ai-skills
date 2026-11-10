# Feature PR

**Ticket:** TOPX-XXX
**Feature:**
**Target:** `main`
**Developer:**

**Dependency declaration** (fill in when opening the PR — see F02):

```
feature: TOPX-XXX
base_main_sha: <main SHA when the branch was cut>
dependencies: []          # features/tickets that must land before release
release_independent: true # false = do not release before the dependency
```

## 1. Scope

- Implemented:
- Excluded:
- Dependencies:

## 2. Technical Changes

- Components / modules:
- API changes:
- Shared code impact:
- Feature flags / tenant config:

## 3. Verification

- [ ] Typecheck / Lint
- [ ] Unit / Integration tests
- [ ] Code review approved
- [ ] DEV QC passed
- [ ] STAGING QC passed

## 4. Promotion Tracking

| Environment | Deployment SHA | QC Status | QC owner |
| ----------- | -------------- | --------- | -------- |
| DEV         |                |           |          |
| STAGING     |                |           |          |
| PROD        |                |           |          |

## 5. Acceptance

- STAGING approved commit:
- Main merge decision: Pending / Accepted
- Release dependency:
- Notes:
