# SOP detail — NoteX FE Git Workflow v1.0

Bugs are not in this file: SOP-07 and the decision matrix live in [bug-routing.md](bug-routing.md); the release blocking checklist in [release-gate.md](release-gate.md).

## SOP-01 — Feature Development

**Input:** ticket with confirmed scope; latest `main`.

```powershell
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c feature/TOPX-142-bookmark
```

The developer or AI agent implements, runs local checks, opens the PR:

```
Title : feat(bookmark): add bookmark management
Base  : main
Head  : feature/TOPX-142-bookmark
```

The PR may stay in **Draft** while the work is in progress.

**Conditions → `Code Reviewed`:**

- [ ] Scope is clear; no changes outside the ticket
- [ ] Reviewer checked logic, architecture and related impact
- [ ] CI passes
- [ ] Dependencies (BE, other features, config) are recorded
- [ ] The commit set to be promoted is identified

## SOP-02 — Promote Feature to DEV

Do **not** cherry-pick directly onto `develop` locally and push.

```powershell
git fetch origin
git switch -c promote/TOPX-142-dev origin/develop
git cherry-pick -x <commit-sha-1> <commit-sha-2>
```

Push and open the PR:

```
Head: promote/TOPX-142-dev
Base: develop
```

`-x` records the original commit in the message (`cherry picked from commit …`) for feature ↔ environment traceability.

**Promotion PR checklist:**

- [ ] Commit list is complete, in dependency order
- [ ] No commit was promoted before (no duplicates)
- [ ] No changes outside the feature
- [ ] Conflict resolution (if any) reviewed
- [ ] Typecheck, lint, unit tests, integration tests pass
- [ ] Commit mapping recorded in the PR: original SHA ↔ cherry-picked SHA

Manifest, completeness/duplicate/scope checks and the report template: [promotion-integrity.md](promotion-integrity.md).

After merge: CI deploys DEV, and the **deployment SHA** is recorded for QC.

## SOP-03 — Fix Bug on DEV

Classify before fixing:

| Bug type | Source branch | How |
|---|---|---|
| Independent feature bug | `feature/A` | fix commit on the feature, cherry-pick to DEV |
| Integration bug between A and B | `develop` | create `fix/*` from `origin/develop`, fix, test on DEV |
| BE contract mismatch | depends on the cause | coordinate with BE, update the contract or the FE |
| Environment / config | config / CI | change configuration; the feature need not be touched |

For an integration bug: if the fix is also needed on `main` or a feature branch, **land it in the right place before release**. Never let a fix live only on `develop`.

`fix/*` is not pushed straight to `develop`: open a PR `fix/* → develop`, or fold the commit into the batch's promotion branch if it is the same cycle.

## SOP-04 — Promote to STAGING

Promote only when **DEV QC passed**.

```powershell
git fetch origin
git switch -c promote/TOPX-142-staging origin/staging
git cherry-pick -x <approved-commit-1> <approved-commit-2> <approved-fix-commit>
```

The commit source is the **set confirmed on DEV**, not every latest commit on the feature branch. An integration fix joins that set only after checking: which feature it depends on (is that feature on STAGING?) and whether it applies to the STAGING baseline. A fix that only works in the DEV combination stays on DEV, with the reason recorded in the PR.

PR `promote/TOPX-142-staging → staging`, same checklist as SOP-02. After merge: QC tests on STAGING FE + STAGING BE and records the deployment SHA.

## SOP-05 — Accept PR into Main

After STAGING passes, the **FE Lead proactively** decides when to accept.

**Checks before merging:**

- [ ] PR head and commit set match what was QC'd
- [ ] Fixes that exist only on STAGING are handled (folded into the feature or a separate PR)
- [ ] Compatible with the latest `main` (rebase/merge if needed, re-run CI)
- [ ] Feature dependencies declared
- [ ] CI on the **expected merge result** is green

**BE PROD not being ready is not a blocking condition.** It informs release planning; the FE Lead decides to accept or hold, and records the dependency.

After merge: move the feature to `Release Pending`.

## SOP-06 — Release `main → prod`

When the FE Lead locks the batch:

1. Collect PRs merged into `main` but not yet on `prod`:
   `git log --oneline origin/prod..origin/main`
2. Confirm the feature + bugfix list in the batch.
3. Confirm FE/BE compatibility.
4. Verify the **release candidate**: the combination of code on `main`, not each feature in isolation.
5. Open the `main → prod` PR using the [release PR template](../templates/release-pr.md).
6. Required CI + release approval.
7. Merge, deploy, smoke test PROD.
8. Create the **tag** and store the **release record**.

**Missing-hotfix check (4 layers, see [release-gate.md](release-gate.md)):** ancestry (`git log origin/main..origin/prod` empty) **+** patch equivalence (`git cherry -v origin/main origin/prod` shows no `+`) **+** reading the release diff **+** the hotfix tracking table with no `Pending`. One empty layer does not prove safety.

**Why verify the combination:** STAGING may hold more features than `main`. Each feature passing STAGING does not prove the combination on `main` passes. Prefer a preview environment or one regression pass on the release candidate before merging.

## Definition of Done

**Accepted** — a feature is accepted when:

- Code review is complete
- DEV and STAGING QC passed (by deployment SHA)
- The commit set and bugfixes are traceable
- No blocker remains for code acceptance
- The FE Lead decides to merge into `main`

**Released** — a batch is released when:

- The batch was approved by the FE Lead
- The release candidate was verified
- FE/BE PROD compatibility was confirmed
- The `main → prod` PR was merged
- Deployment + smoke test succeeded
- The tag and release record were created

Release blocking checklist (unreleased dependencies, un-back-synced hotfixes, CI on the merge result, testing window): [release-gate.md](release-gate.md).

## Responsibility split

| Activity | Developer | Reviewer | QC | FE Lead | BE |
|---|---|---|---|---|---|
| Feature implementation | Owner | Review | — | Oversight | API coordination |
| Promotion DEV | Execute | Approve | Test | Oversight | Support |
| Promotion STAGING | Execute | Approve | Test | Oversight | Support |
| Bugfix | Execute | Review | Verify | Prioritize | Support |
| Merge `main` | Support | Review | Evidence | Decision | Coordination |
| Release batch | Support | Review | Regression | Decision | Compatibility |
| PROD deployment | Support | — | Smoke test | Approve | Coordinate |

## Rollout plan

| Week | Focus |
|---|---|
| 1 — Standardize | naming convention, PR templates, branch protection, QC SHA, bug classification |
| 2 — Controlled Promotion | promotion PR, `cherry-pick -x`, commit mapping, CI on the target branch, conflict review |
| 3 — Release Quality | release manifest, release candidate verification, production checklist, tagging, hotfix back-sync |

No dashboard or custom automation yet. Reassess after 2–3 release batches which parts (commit mapping, release manifest) are worth automating.
