# Release Gate — before merging `main → prod`

## Four control layers

| Layer | Controls | Purpose |
|---|---|---|
| Code | typecheck, lint, unit tests, code review | stop defects at implementation level |
| Integration | CI on the target branch, API contract, shared-module tests | stop defects when features combine |
| Environment | deployment SHA, BE version, QC evidence | prove the right version was tested |
| Release | RC verification, dependency check, smoke test, rollback | stop defects reaching PROD |

## Seven mandatory rules

1. Do not fix before classifying the cause to a reasonable level.
2. Do not cherry-pick directly onto a protected environment branch.
3. Do not treat a green build as proof a conflict was resolved correctly.
4. Do not treat a feature passing STAGING as proof the whole batch passes.
5. Do not close a bug while a branch that needs the fix is still unresolved.
6. Never let an AI agent merge into `main` or `prod` on its own.
7. Every important regression needs an automated guarding test where feasible.

## Release integrity — 4 layers, none sufficient alone

| Layer | Command | Green means | Limitation |
|---|---|---|---|
| Ancestry | `git log --oneline origin/main..origin/prod` | `prod` has no commit outside `main`'s history | empty only holds when the hotfix truly merged to `main`; proves nothing about content |
| Patch equivalence | `git cherry -v origin/main origin/prod` | every prod-only commit has an equivalent on `main` (no `+` left) | matching patch-id does **not** prove matching behaviour |
| Content | `git diff --stat` + `--name-only origin/prod...origin/main` | the diff contains only batch changes | must be read by a human; no automatic threshold |
| Tracking | the four-branch hotfix table | no `Pending` left | depends on someone keeping it current |

**Rule:** all four must be green before release. If any layer cannot be verified (missing tracking table, unreadable diff, patch equivalence inconclusive) → stop and tell the FE Lead. Never infer "ancestry is empty, so it is safe".

```powershell
git fetch origin

# 1. Batch: what will be released
git log --oneline origin/prod..origin/main

# 2. Ancestry: commits on prod that main lacks — MUST be empty
git log --oneline origin/main..origin/prod

# 3. Patch equivalence: a remaining '+' means no equivalent on main yet
git cherry -v origin/main origin/prod

# 4. Content: the real diff between the branches
git diff --stat origin/prod...origin/main
git diff --name-only origin/prod...origin/main
```

## Release candidate checklist

- [ ] Feature/fix list in the batch locked with the FE Lead
- [ ] Dependencies: every `release_independent: false` feature is in the batch (or refactored)
- [ ] **Ancestry:** `origin/main..origin/prod` is empty
- [ ] **Patch equivalence:** every prod-only commit has an equivalent on `main` — otherwise back-sync first
- [ ] **Content:** the diff holds no changes outside the batch
- [ ] **Tracking:** no `Pending` across the four branches
- [ ] CI ran on the **expected merge result** with `prod` (not just CI on `main`)
- [ ] Regression across the batch combination, not inferred from "each feature passed STAGING"
- [ ] FE/BE PROD compatibility confirmed
- [ ] Tenant configuration changes reviewed
- [ ] Rollback plan ready
- [ ] If verified on STAGING: testing window / freeze agreed with QC

## Why verify the combination

```
STAGING = A + B + C
MAIN    = A + B
PROD    = Previous Release
```

A and B passing STAGING does **not** mean A+B works without C. Likewise, `main` may have changed after STAGING QC passed. The Release Gate checks the **final combination**, preferring a preview environment or one regression pass on the release candidate.

## Hotfix before release

| Branch | State required before release |
|---|---|
| `prod` | Fixed — the hotfix is deployed |
| `main` | Ported (or Not applicable with a reason) |
| `staging` | Ported / Not applicable |
| `develop` | Ported / Not applicable |

A `Pending` row on `main` blocks release: the `main → prod` PR would drop or conflict with that fix.

## Rollback

- Roll back with a **revert PR on `prod`** (or redeploy the previous SHA), never force-push, never reset a long-lived branch.
- Record the rollback in the release record, with the SHA returned to and the reason.
- After a rollback, still back-sync `main` so the next release does not repeat the incident.

## Decisions owned by the FE Lead

| Situation | Decision |
|---|---|
| Two features with an architectural conflict | pick a shared contract or refactor |
| Feature B depends on unreleased A | batch the release or split the dependency |
| Integration fix only valid with A+B | release together or redesign |
| STAGING passed but the RC is a different combination | the regression scope to run |
| `main` holds a feature waiting on BE | wait for the batch or change the plan |
| PROD hotfix conflicts with `main` | how to port it while preserving behaviour |
