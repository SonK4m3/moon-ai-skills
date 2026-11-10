# SOP-07 — Bug Routing & Back-sync Policy

**Guiding principle:** not every bug is fixed on a feature branch. Where to fix is decided by **where it occurs + the root cause + which versions must receive the fix**.

Three questions must be answerable before fixing:

1. **What is the root cause?**
2. **Which branch contains a baseline that reproduces the bug?**
3. **Which branches need the fix?**

Not enough evidence for all three → state a hypothesis plus the steps to verify it; **never** pick a branch on instinct. When told "X is broken on DEV", the agent must not default to checking out the feature branch.

## Ten-step procedure

1. Record: environment, FE deployment SHA, BE version, reproduction steps, timestamp.
2. Reproduce on **that exact SHA** — never fix based on a guess.
3. Classify the cause (table below).
4. Choose the source branch from the decision matrix.
5. Fix and add a regression test when it can be automated.
6. PR + CI + review — never push straight to an environment branch.
7. Deploy the affected environment.
8. QC retest on the new SHA.
9. Determine sync targets: branches that **have the bug**, **need** the fix, and are **compatible** with it.
10. Close the bug with evidence; for a hotfix, update the tracking table.

## Cause classification

| Cause | Signal | Fix location |
|---|---|---|
| Feature logic | reproduces on `feature/A` | `feature/A` |
| A + B integration | only reproduces when both features are present | `fix/*` from the environment baseline |
| Missing / duplicate cherry-pick | compare the promotion manifest; the commit is absent on the environment | promotion branch |
| Wrong conflict resolution | behaviour differs from the original feature although the build is green | promotion branch |
| BE contract mismatch | API shape differs between environments | FE/BE jointly |
| Config / feature flag | only one environment, same code | config / deployment |
| Regression | used to pass, fails after another change | the branch holding the broken version |

## Decision matrix

| Found on | Cause | Fix on | Sync to |
|---|---|---|---|
| Local | feature logic | `feature/A` | DEV → STAGING → `main` |
| DEV | feature logic | `feature/A` | DEV → STAGING → `main` |
| DEV | A + B integration | `fix/*` from `develop` | every branch containing A+B |
| DEV | missing cherry-pick | promotion branch | DEV |
| STAGING | feature logic | `feature/A` if not yet in `main` | STAGING, DEV, `main` when needed |
| STAGING | integration | `fix/*` from `staging` | branches with the same dependency |
| STAGING | BE / config | config or FE/BE fix | the affected environment |
| MAIN | bug after accept | `fix/*` from `main` | `main`, STAGING/DEV when needed |
| PROD | production bug | `hotfix/*` from `prod` | `prod`, `main`, STAGING/DEV when needed |
| Any | regression | the branch holding the broken version | every affected branch |

Never sync a fix to every branch automatically. The target must have the bug, need the fix, and be compatible with it.

Two clarifications when reading the table:

- A feature **already merged to `main`** whose bug shows on STAGING/DEV → use the **MAIN** row (bug after accept); do not fix on the feature branch.
- A bug that reproduces in only one environment with identical code → classify as **config/flag**, not integration.

## By environment

**B01 — new bug inside a feature in progress.** Fix on `feature/A` as its own commit (`fix(bookmark): …`), promote with the same batch. A fix that has not been promoted means the feature has not passed.

**B02 — feature bug found on DEV.** Reproduce on `feature/A` first:

| Cause | Where to handle |
|---|---|
| Logic wrong inside the feature | `feature/A` |
| Interaction with another feature | `fix/*` from `develop` |
| DEV BE returns a different contract | FE/BE align on the contract |
| Wrong feature flag / env config | config / deployment |
| Missing cherry-pick | fix the promotion — **never** add compensating code |

**B03 — integration bug between two features.** The most important case. Fix from `develop` (`fix/*`), then distinguish:

- **Feature-local fix** → land it on the feature branch.
- **Cross-feature integration fix** → may need its own PR into `main`, depending on both A and B.
- **Environment-only fix** → does not go into `main`, but must be proven to be a config/environment issue.

If A can ship without B, **do not** put an integration fix that depends on B into A's PR. Every integration fix must list its target branches and dependencies.

**B04 — bug on STAGING even though DEV passed.** Classify first: missing commit (compare the manifest) · wrong conflict resolution (review the promotion PR diff) · STAGING BE differs from DEV BE · config/flag · interaction with other code · logic bug carried over from DEV. Fix on `feature/A` for a feature bug, from `staging` for a STAGING-specific integration bug; port to the branches that need it; retest on the new SHA; **the previous QC pass is void for the changed code**.

**B05 — regression.** Three common causes: the branch was cut from an old baseline, a refactor cancelled the earlier fix, or a cherry-pick/conflict overwrote the fixed logic. Handle it: find the commit/PR that fixed it → compare current logic → identify where it broke → add a reproducing test → fix on the branch holding the bug → port to affected branches. On PROD → hotfix.

**B06 — PROD bug.** Never branch a hotfix from `main` (it drags unreleased features along). `hotfix/*` from `prod` → PR into `prod` → deploy + smoke → port to `main`, then `staging`/`develop` if needed. If `main` has refactored that area, **port the meaning of the fix**, not the raw commit.

## Regression ownership

A fixed bug needs **at least one guarding test** when it can be automated reliably. Pure logic bugs → a unit or integration test is faster and steadier than E2E.

```
Bug: audio player stops after note switching

Regression test:
- open Note A, start playback
- navigate to Note B, start playback
- verify player state and audio source
```

E2E is not required for every bug; a test is required for every bug that can come back.

## Hotfix tracking

Every hotfix needs a status table; do not close it while anything is `Pending`:

| Branch | Status |
|---|---|
| `prod` | Fixed |
| `main` | Ported / Not applicable / Pending |
| `staging` | Ported / Not applicable / Pending |
| `develop` | Ported / Not applicable / Pending |

`Not applicable` needs a reason (the branch does not contain the broken code, or already has an equivalent fix).

To decide `Ported`, check **the exact commit on `main`** against each target, not the whole branch:

```powershell
git cherry -v origin/staging origin/main | Select-String <sha-on-main>
git show --stat <sha-on-main>
git diff origin/staging:<file> origin/main:<file>
```

`-` is only a patch-id (textual equivalence); still read each file's diff and run the hotfix's tests before marking `Ported`.

## Anti-patterns

- Writing compensating code for a missing cherry-pick — more complexity, cause still there.
- Syncing a fix to every branch "to be safe".
- `git checkout --ours/--theirs` for an entire conflict.
- Treating a DEV pass as proof STAGING will pass.
- Closing a bug when the fix exists only on `develop`.

## Stop and ask Son

- The fix forces a change to logic already running on an environment.
- An integration fix depends on two or more features, or it is unclear whether it can ship independently.
- Which branch holds the bug cannot be determined (both are suspected).
- Porting the hotfix into `main` conflicts because `main` has refactored — the port strategy needs a decision.
