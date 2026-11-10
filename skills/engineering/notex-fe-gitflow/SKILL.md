---
name: notex-fe-gitflow
description: "Standardised Git workflow for NoteX FE (v1.0): four environment branches (main/develop/staging/prod), selective cherry-pick through a promotion branch + PR, `cherry-pick -x` with commit mapping, feature lifecycle, release batch main→prod with tag and release record, hotfix from prod with back-sync. Includes exception handling: bug routing, textual/semantic conflicts, regression, feature dependency, QC tied to deployment SHA, release gate, an 8-step decision loop, three modes (Inspect/Prepare/Execute), three risk tiers, and promotion integrity. Use when creating a branch, promoting a feature to DEV/STAGING, accepting a PR into main, releasing to production, back-syncing a hotfix, classifying a bug, or when a PR template is needed. Keywords: gitflow, promotion, cherry-pick, commit mapping, QC SHA, release batch, tag, hotfix, regression, integration bug, conflict, bug routing, execution contract, main, prod, staging, develop."
license: MIT
metadata:
  author: SonK4m3
  version: "3.4.0"
---

# Git Workflow — NoteX FE (Standard v1.0)

## Overview

Selective cherry-pick and the four environment branches **stay as they are**. v1.0 standardises only how code travels through them: **promotion branch + PR** instead of hand-picking and pushing straight to an environment branch, `cherry-pick -x` with **commit mapping**, a **feature lifecycle** with nine states, three PR templates, a **release batch** `main → prod` with tag and release record, and hotfixes branched from `prod` then back-synced.

`main` holds code the FE Lead has **accepted** — it does not auto-deploy, and **acceptance does not mean released**. `prod` is what has been released.

**Not every bug is fixed on a feature branch.** Where to fix is decided by *where the bug occurs + the root cause + which versions must receive the fix* — see the decision matrix in §5.

## When to Use

Use when:
- Creating `feature/*`, `fix/*`, `hotfix/*`, `promote/*`, `release/*` branches — or deciding where to branch from
- Promoting a feature to DEV / STAGING
- Preparing to accept a PR into `main`, or waiting on BE PROD
- Running a release batch `main → prod`, tagging, writing the release record
- Fixing a production bug and back-syncing to `main` / `staging` / `develop`
- Deciding where to fix a bug found on DEV/STAGING/PROD and where to sync it
- Handling a cherry-pick conflict, a regression, or a feature that depends on an unreleased feature
- Writing a PR from the standard templates, or checking whether QC passed on the right deployment SHA
- Questions like "how do I promote", "where does this PR go", "where should I fix this bug", "is this feature released", "what tag"

Do not use when: the repo is not `notex-interface`, or the work is **EE** — v1.0 does not define EE (see [references/branch-map.md](references/branch-map.md); ask Son before promoting).

## Instructions

### 1. Decision loop and permissions

Do not run commands the moment a request arrives. Follow eight steps:

| Step | What happens | Output |
|---|---|---|
| 1 Intent | is this an **assessment** or an **execution**? | SOP + mode |
| 2 Context | repo, worktree, branch, source, target, dependency, prior promotion, conflicts, permissions | context block |
| 3 Diagnosis | feature bug / promotion / integration / config / release | work type |
| 4 Plan | branch to create, commits to pick, gates to run, refs to change | short plan |
| 5 Risk | LOW / MEDIUM / HIGH | which step needs approval |
| 6 Execute | only within the mode's scope | local/remote change |
| 7 Verify | gates + real SHA comparison | exit codes, diff |
| 8 Report | evidence, no claims | report |

**Intent routing** — the user does not need to name a SOP:

| User says | Work | Read |
|---|---|---|
| "Create a branch for X" | feature development | §5 SOP-01 |
| "Push X to DEV" | selective promotion | §5 SOP-02 + `promotion-integrity.md` |
| "DEV breaks when A+B run" | integration diagnosis | `bug-routing.md` |
| "Send the QC-passed build to STAGING" | controlled promotion | §5 SOP-04 |
| "Can this PR be merged?" | **assessment only** | §6 + Inspect mode |
| "Prepare the PROD release" | batch release | §7 + `release-gate.md` |
| "Cherry-pick hit a conflict" | conflict handling | `conflict.md` |
| "Audio is broken on PROD" | hotfix | §8 + `bug-routing.md` |

"Can this be merged?" permits analysis and a recommendation only — never a merge.

**Three modes:** Inspect (read-only) · Prepare (branch/worktree, edit code, commit, cherry-pick locally, run gates) · Execute (push, PR, authorised promotion). A mode is a delegation scope; it does not override the FE Lead's decision rights.

**Three risk tiers:** LOW (read, analyse) · MEDIUM (local changes) · HIGH (push, PR, merge, deploy, tag). Force-push / `reset --hard` / branch deletion / discarding uncommitted changes: **never** self-executed, always need separate approval — even in Execute mode.

**Stop when:** repo/branch is outside the requested scope · the working tree has unrelated changes · source commits cannot be identified · a semantic conflict cannot be resolved confidently · a promotion would carry changes outside scope · QC evidence is missing · the action would violate branch protection or release policy.

Full detail — nine context questions, the per-mode permission table, nine self-check scenarios, and what does **not** count as authorisation: [references/execution-contract.md](references/execution-contract.md). Report with [templates/execution-report.md](templates/execution-report.md) — mark `Passed` only after the command ran with exit 0; never claim QC/deploy/approval without evidence.

### 2. Branch map

| Branch | Role | Receives code from | Deploys |
|---|---|---|---|
| `main` | code accepted by the FE Lead; integration branch | PR `feature/* → main` | does not auto-deploy |
| `develop` | DEV FE ↔ DEV BE | promotion PR (cherry-pick) | DEV |
| `staging` | STAGING FE ↔ STAGING BE | promotion PR (cherry-pick) | STAGING |
| `prod` | Production FE ↔ PROD BE | PR `main → prod` (release batch), PR `hotfix/* → prod` | PROD |

Only five PR types are valid:

| PR | From → To | Purpose |
|---|---|---|
| Feature PR | `feature/* → main` | review the feature and manage the accept decision |
| Promotion PR | `promote/* → develop` \| `staging` | move the approved commit set to an environment |
| Fix PR | `fix/* → develop` \| `staging` | integration bug on an environment baseline |
| Release PR | `main → prod` | release batch |
| Hotfix PR | `hotfix/* → prod` | production fix |

### 3. Eight invariants

1. Never push directly to `develop`, `staging`, `main`, `prod`.
2. Every feature needs a reviewed PR targeting `main`.
3. Every cherry-pick needs commit mapping and a named target environment.
4. A QC pass attaches to a **deployment SHA**, not to a feature name.
5. Never merge `develop → staging` or `staging → main` wholesale.
6. Never merge `main → prod` until the release batch is locked.
7. Feature bugs are fixed on the feature branch; integration bugs on the environment baseline, then synced where needed.
8. Every production release needs a **tag** and a **release record**.

### 4. Naming and commits

| Type | Format | Example |
|---|---|---|
| Feature | `feature/<ticket>-<slug>` | `feature/TOPX-142-bookmark` |
| Bugfix | `fix/<ticket>-<slug>` | `fix/TOPX-155-audio-sync` |
| Hotfix | `hotfix/<ticket>-<slug>` | `hotfix/TOPX-190-login-401` |
| Promotion | `promote/<ticket>-<env>` | `promote/TOPX-142-staging` |
| Release | `release/<version>` | `release/2026.11.1` |

`<ticket>` is the Jira project key (**TOPX**); the source spec uses `NOTEX-142` as a placeholder. Slugs are kebab-case, English, and describe the work.

Conventional Commits, English messages:

```
feat(bookmark): add timestamp markers
fix(bookmark): correct marker navigation
refactor(audio): isolate player controller
test(bookmark): add navigation regression tests
chore(release): prepare production batch
```

**The promoted commit set must be self-contained:** correct dependency order, no change needed from outside the set, no unrelated changes mixed in. Individual commits do not have to stand alone — the set does; dependencies inside the set are valid.

### 5. Seven SOPs

| SOP | When | Result |
|---|---|---|
| SOP-01 | Starting a feature | branch from `main` + feature PR → `main` |
| SOP-02 | Promoting to DEV | promotion PR → `develop`, CI deploy, QC by SHA |
| SOP-03 | Bug on DEV | fix branch by bug type, sync to `main` when needed |
| SOP-04 | Promoting to STAGING | promotion PR → `staging`, QC by SHA |
| SOP-05 | Accepting into `main` | FE Lead merges the feature PR → `Release Pending` |
| SOP-06 | Release batch | PR `main → prod`, deploy, smoke test, tag + record |
| SOP-07 | Bug found anywhere | classify the cause → fix on the right branch → sync to the right targets |

Step-by-step detail, checklists and exit criteria: [references/sop.md](references/sop.md).

A promotion always follows the same shape — never hand-pick on the environment branch and push:

```powershell
git fetch origin
git switch -c promote/TOPX-142-dev origin/develop
git cherry-pick -x <sha1> <sha2>        # -x records the original commit in the message
# gate: typecheck / lint / unit + integration / build
git push -u origin HEAD
gh pr create --base develop --head promote/TOPX-142-dev
```

- **The commit source for STAGING** is the set that passed QC on DEV, not "every commit on the feature branch".
- **An integration fix goes to STAGING only after two checks:** which feature it depends on (is that feature on STAGING?) and whether it applies to the STAGING baseline. A fix that only works in the DEV combination is not promoted — record it in the PR and tell the FE Lead.
- `-x` is mandatory: the message carries `(cherry picked from commit …)` for traceability.
- Commit mapping (original SHA ↔ cherry-picked SHA) goes into the promotion PR: [templates/promotion-pr.md](templates/promotion-pr.md).

#### Where to fix a bug (SOP-07)

| Found on | Cause | Fix on | Sync to |
|---|---|---|---|
| Local | feature logic | `feature/A` | DEV → STAGING → `main` |
| DEV | feature logic | `feature/A` | DEV → STAGING → `main` |
| DEV | A + B integration | `fix/*` from `develop` | every branch containing A+B |
| DEV | missing cherry-pick | promotion branch | DEV — never write compensating code |
| STAGING | feature logic | `feature/A` (if not yet in `main`) | STAGING, DEV, `main` when needed |
| STAGING | integration | `fix/*` from `staging` | branches with the same dependency |
| STAGING | BE contract / config | config or FE/BE fix | the affected environment |
| MAIN | bug after accept | `fix/*` from `main` | `main`, STAGING/DEV when needed |
| PROD | production bug | `hotfix/*` from `prod` | `prod`, `main`, STAGING/DEV when needed |
| Any | regression | the branch holding the broken version | every affected branch |

Four rules:

1. Classify the cause **before** fixing. Never fix first and rationalise afterwards.
2. Do not sync a fix to every branch — only to branches that **have the bug**, **need** the fix, and are **compatible** with it.
3. A green build does not prove a conflict was resolved correctly; a QC pass on one environment does not prove another branch has the fix.
4. If the feature is already merged to `main` and the bug shows on STAGING → use the **MAIN** row (bug after accept); do not fix on the feature branch.

All 18 use cases (F01–F04, B01–B06, P01–P04, R01–R04): [references/exceptions-matrix.md](references/exceptions-matrix.md). Bug process, regression and hotfix tracking: [references/bug-routing.md](references/bug-routing.md).

### 6. Accepting into `main`

- The FE Lead decides **when**, proactively — there is no automatic gate.
- Before merging: PR head and commit set match what was QC'd; fixes that exist only on STAGING are handled; the branch is compatible with the latest `main`; feature dependencies are declared; CI on the **expected merge result** is green.
- **BE PROD not being ready is NOT a blocker.** It informs the FE Lead's release planning; it is not a merge condition. Record the dependency and move the feature to `Release Pending`.
- `Accepted` ≠ `Released`: a feature in `main` may wait for the next batch.
- **Baseline updates:** never rebase or merge `main` into a feature **that has already been QC'd**. If an update is unavoidable, measure the divergence first, re-run CI on the merge result, and treat the previous QC as void for the changed code ([exceptions F03](references/exceptions-matrix.md)).

### 7. Release batch

1. List PRs already in `main` but not yet on `prod`.
2. Lock the feature/fix list, confirm FE/BE compatibility.
3. Verify the **release candidate** — the combination of code on `main`, not each feature in isolation. STAGING may contain features that are not in `main`, so "each feature passed STAGING" does not prove the combination did.
4. Open the `main → prod` PR using [templates/release-pr.md](templates/release-pr.md), run required CI, get approval.
5. Merge, deploy, smoke test PROD.
6. Create the tag and store the release record. A fully filled Template C is the **minimum record**; if the repo already has a release-notes location, store it there too — do not invent a new directory without asking.

**Release integrity — 4 checks, none sufficient alone** (detail: [references/release-gate.md](references/release-gate.md)):

1. **Ancestry:** `git log --oneline origin/main..origin/prod` must be empty.
2. **Patch equivalence:** every prod-only commit must have an equivalent on `main` — `git cherry -v origin/main origin/prod` shows no remaining `+` lines.
3. **Content:** `git diff --stat origin/prod...origin/main` contains batch changes only; no files outside scope.
4. **Hotfix tracking:** no `Pending` rows for `prod`/`main`/`staging`/`develop`.

`git cherry` compares patch-ids — it proves the changes are **textually equivalent**, not that behaviour matches. Treat it as a signal; still read the diff and run the hotfix's tests.

If `main` changes after STAGING QC passed (another feature merged in), the old QC **no longer represents** the release candidate — re-run CI and regression on the final RC before merging the PR.

**Release Gate** (detail: [references/release-gate.md](references/release-gate.md)): no changes outside the batch · unreleased dependencies declared · CI on the merge result with `prod` · RC regression across the combination · FE/BE PROD compatibility · rollback plan. Verifying the RC on STAGING requires a **testing window / freeze**, because STAGING is serving other features.

### 8. Hotfix from `prod`

```
hotfix/<ticket>-<slug>  (branched from prod)  → PR into prod → deploy + smoke test
                                              → back-sync main → staging/develop when needed
```

- Check the **exact hotfix commit**, not the whole branch: `git show --stat <hotfix-sha>` to list touched files, compare each file between the target branch and `main`, then run the hotfix's tests on that branch. `git cherry -v` is only a patch-equivalence signal — a `-` line does not prove behaviour matches.
- If an equivalent already exists, do not pick again; same file but different behaviour means **port by hand**, not force the commit.
- A hotfix must not live only on `prod`; a later `main → prod` release will drop or conflict with it.

### 9. QC, regression and deployment SHA

A QC pass attaches to the SHA deployed on that environment. Every result needs all seven fields: **FE deployment SHA, BE version/deployment ID, environment, feature/test scope, result, timestamp, QC owner**. A missing field makes it unusable as evidence; "feature X was tested" is not a substitute for the SHA.

When a new deployment lands mid-QC:

- Do not void all previous results — determine the change scope and retest the affected parts.
- A release candidate must be tested on a **stable** build: a testing window or freeze, with no other feature deployed in between.

Regression:

- A fixed bug needs at least **one guarding test** when it can be automated reliably. Pure logic bugs → unit/integration; E2E is not required for every bug.
- Recurring regression: find the commit/PR that fixed it → compare current logic → identify where it broke → add a reproducing test → fix on the branch holding the bug → port to affected branches. On PROD, use the hotfix path.

**Change scope → test scope** (impact analysis, not a fixed checklist):

| Change | Required tests |
|---|---|
| Isolated UI component | unit / component |
| Feature-specific hook | feature integration |
| Shared hook/component (e.g. `useAudioController`) | cross-feature regression for **every** consumer |
| API client / auth | contract + integration |
| Routing / middleware | navigation + authorization regression |
| Tenant config | B2C/B2B tenant-specific |
| Build / Next.js config | full build + deployment check |

Conclusions must come from the real import graph, code search and test coverage — e.g. "`useAudioController` is used by Note Detail and Shared Note, so both need regression", not just the tests of the feature being changed.

### 10. Lifecycle

| Status | Condition | Confirmed by |
|---|---|---|
| In Development | being implemented | Developer |
| Code Reviewed | PR reviewed | Reviewer |
| DEV Testing | promoted and deployed to DEV | Developer / CI |
| DEV Passed | QC pass on the DEV SHA | QC |
| STAGING Testing | promoted and deployed to STAGING | Developer / CI |
| STAGING Passed | QC pass on the STAGING SHA | QC |
| Accepted | FE Lead merges the PR into `main` | FE Lead |
| Release Pending | in `main`, not yet on `prod` | FE Lead |
| Released | deployed to PROD + smoke test | FE Lead / QC |

### 11. CI and branch protection

| Branch | PR required | Required CI | Approver |
|---|---|---|---|
| `develop` | Yes | typecheck, lint, tests, build | FE reviewer |
| `staging` | Yes | typecheck, tests, build | FE reviewer |
| `main` | Yes | full CI + merge-result verification | FE Lead |
| `prod` | Yes | full CI + release checks | FE Lead / release owner |

NoteX FE baseline: TypeScript typecheck, ESLint (the repo currently uses oxlint → map equivalently), unit tests, Next.js build, Playwright smoke for critical flows. Actual repo commands: [references/commands.md](references/commands.md).

Enable if not already on: block force-push and branch deletion on long-lived branches, dismiss stale approvals, require conversation resolution, restrict merges to `main`/`prod` to authorised people.

### 12. Agent boundaries

- Never push directly to the four environment branches; every change goes through a PR.
- A promotion always carries `-x` and commit mapping; without mapping, do not open the PR.
- Never merge environment → environment (`develop → staging`, `staging → main`).
- Never open or merge a `main → prod` PR before the batch is locked.
- Never create a tag outside the release process.
- Never fix before classifying the cause; never use `--ours` / `--theirs` for an entire conflict.
- Never promote further after a merge when QC has not confirmed it.
- Never close a bug while a branch that needs the fix is unsynced or not marked Not applicable.
- Accept decisions, QC passes and architecture calls (two features colliding, batching releases) **are not the agent's** — only the FE Lead / QC.

Permissions, modes and shared stop conditions live in **§1**; this section only adds NoteX-specific rules.

## Examples

### Example 1: Feature TOPX-142 from branch to release

**Behaviour:** `feature/TOPX-142-bookmark` branches from `main` → draft PR → `promote/TOPX-142-dev` from `origin/develop`, `cherry-pick -x`, gates, PR into `develop` → QC pass on the DEV SHA → `promote/TOPX-142-staging` from `origin/staging`, picking the passed set (plus integration fixes if any), PR into `staging` → QC pass on the STAGING SHA → FE Lead merges the feature PR into `main` → `Release Pending`. A later release batch groups this feature with other PRs into the `main → prod` PR, tags it, records it.

### Example 2: Integration bug visible only on DEV

**Behaviour:** bug between feature A and B → `fix/TOPX-155-audio-sync` from `origin/develop`, PR into `develop` (no direct push). If the fix must also exist on `main`/the feature branch, land it in the right place **before** accepting — never leave a fix living only on `develop`. The fix commit is added to the STAGING promotion set when needed.

### Example 3: Production hotfix

**Behaviour:** `hotfix/TOPX-190-login-401` from `prod` → PR into `prod` → deploy + smoke test → back-sync `main`. Before picking to `staging`/`develop`: list the files the hotfix touches (`git show --stat <sha>`), compare each file between the target branch and `main`, run the hotfix's tests — relying on `git cherry -v` alone is not enough. Record each branch's status in the tracking table; the next release batch checks all four integrity layers (ancestry, patch equivalence, diff, tracking).

### Example 4: Bug on STAGING although DEV passed

**Behaviour:** record the STAGING deployment SHA + BE version before doing anything → reproduce and classify: missing commit (compare the promotion manifest), wrong conflict resolution (review the promotion PR diff), STAGING BE differs from DEV BE, config/flag, or feature interaction. Only then choose the source branch from the decision matrix — feature logic → `feature/A`; STAGING-specific integration → `fix/*` from `staging`. Port the fix to the branches that need it, retest on the new SHA, and mark the previous QC **void** for the changed code.

## References

What to read for what:

| Request | Read |
|---|---|
| Start a new feature | `sop.md` — SOP-01 |
| Promote to DEV / STAGING | §5 + `promotion-integrity.md` + `commands.md` |
| Bug on DEV / STAGING / PROD | §5 decision matrix + `bug-routing.md` |
| Cherry-pick conflict | `conflict.md` |
| Accept a PR into `main` | §6 + `sop.md` — SOP-05 |
| Release to PROD | §7 + `release-gate.md` + `templates/release-pr.md` |
| Production hotfix | §8 + `bug-routing.md` + `commands.md` |
| Two features touching the same module, dependencies | `exceptions-matrix.md` (F01–F04) |
| Permissions, modes, when to stop | `execution-contract.md` |
| Unclear branch / environment | `branch-map.md` |

Structure: SKILL is the entry point and orchestrator; SOPs, policies and detailed decisions live in `references/` so there is exactly one source of truth. The `bug-routing` / `feature-dependency` / `release-integrity` files proposed in review are not split out — their content lives in `bug-routing.md`, `exceptions-matrix.md`, `release-gate.md`.

- [references/sop.md](references/sop.md) — SOP-01…06 in detail, checklists, DoD, responsibility split, three-week rollout
- [references/execution-contract.md](references/execution-contract.md) — nine pre-flight questions, 3 modes, 3 risk tiers, stop conditions, self-check scenarios
- [references/bug-routing.md](references/bug-routing.md) — **SOP-07**: cause classification, decision matrix, regression ownership, hotfix back-sync tracking
- [references/promotion-integrity.md](references/promotion-integrity.md) — manifest, completeness/duplicate/scope checks, patch vs semantic equivalence, report
- [references/exceptions-matrix.md](references/exceptions-matrix.md) — 18 use cases F01–F04 / B01–B06 / P01–P04 / R01–R04 with a rule per case
- [references/release-gate.md](references/release-gate.md) — 4 control layers, 7 mandatory rules, release candidate checklist, decisions owned by the FE Lead
- [references/branch-map.md](references/branch-map.md) — branch table, EE (outside v1.0 scope), legacy branches, re-verification commands
- [references/commands.md](references/commands.md) — copy-paste commands: feature, promotion, release, hotfix, QC SHA, Windows gotchas
- [references/conflict.md](references/conflict.md) — textual vs semantic conflict, resolution checklist, `Conflict resolved:` format, equivalence checks on back-sync
- Templates: [feature PR](templates/feature-pr.md) · [promotion PR](templates/promotion-pr.md) · [release PR](templates/release-pr.md) · [execution report](templates/execution-report.md)
- Source: NoteX FE — Git Workflow Standard v1.0 + Agent Strategy v1.1; related skills `write-pr-description`, `notex-worktree-context`, `notex-branch-sync`
