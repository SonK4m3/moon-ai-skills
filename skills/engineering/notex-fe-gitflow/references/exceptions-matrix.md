# Exception matrix — 18 use cases

Lookup table for incidents. Bug (B) detail lives in [bug-routing.md](bug-routing.md); P01 detail in [conflict.md](conflict.md).

| ID | Situation | Risk | Level | One-line rule |
|---|---|---|---|---|
| F01 | Two features touch the same component/hook | conflict, logic overwritten | High | promote one at a time on the latest baseline; regression for **both** |
| F02 | Feature depends on an unreleased feature | hidden dependency | Very high | declare dependency + `release_independent` in the feature PR |
| F03 | Feature branch is stale against `main` | regression at merge | High | never rebase/merge `main` right before release; measure the delta + test the merge result |
| F04 | Several AI agents edit the same module | conflict, inconsistent code | High | agree the interface first, one worktree each, integration test before promotion |
| B01 | New bug inside a feature in progress | fix not promoted | Medium | fix on `feature/A`, promote with the same batch |
| B02 | Feature bug found on DEV | fix on the wrong baseline | High | reproduce on the feature first; if only DEV fails, classify the cause |
| B03 | Integration bug between two features on DEV | fix never reaches `main` | Very high | `fix/*` from `develop`, declare target branches + dependencies |
| B04 | Bug found on STAGING | DEV passed but STAGING fails | High | classify first (missing commit / conflict / BE / config / interaction) |
| B05 | Old bug returns (regression) | bug reappears at release | Very high | find the original fix, locate the break point, add a test, port to affected branches |
| B06 | Bug only on PROD | hotfix + back-sync | Very high | `hotfix/*` from `prod`, never from `main`; track all four branches |
| P01 | Cherry-pick conflict | result differs from the feature | High | resolve inside the promotion branch; follow the conflict checklist |
| P02 | Missing or duplicate cherry-pick | build passes but logic is wrong | High | manifest + `git cherry -v` + patch-id comparison |
| P03 | Fix picked before its base commit | broken dependency | High | pick in historical order; check dependencies |
| P04 | Environment changes while QC is testing | QC result meaningless | Very high | QC binds to a SHA; on redeploy, scope the change and retest affected parts |
| R01 | `main` holds features waiting on BE | release blocked | Medium | the FE Lead picks the batch; BE PROD is not a merge blocker |
| R02 | `main` differs from the tested STAGING combination | PROD regression | Very high | verify the exact release candidate; never infer from individual features |
| R03 | PROD hotfix while `main` awaits release | divergence, lost hotfix | Very high | back-sync before release; run the four integrity layers (ancestry, patch equivalence, diff, tracking) |
| R04 | Bug after the PR merged to `main` | cannot be fixed on the feature branch | High | `fix/*` from `main`, promote to the branches that need it |

## F01 — Two features editing one component

Two conflict types: **textual** (Git reports it) and **semantic** (Git does not — A changes the state shape, B still uses the old logic). Semantic is worse because the cherry-pick is clean and typecheck/build stay green.

Before coding: identify shared modules at risk, agree the contract/interface, consider splitting the component or hook.

When promoting:

1. Promote A to DEV.
2. Promote B on the latest DEV baseline.
3. Resolve any conflict.
4. Review every piece of code changed by the resolution.
5. Run integration/regression for **both A and B**.
6. QC tests both features on the **same** DEV build.

After the fix: decide whether the fix belongs to A, B, or is a shared integration fix. Never dump every fix into B just because B was picked later.

> Passing independently does not mean passing when integrated.

## F02 — Feature depends on an unreleased feature

NoteX branches from `main`, and `main` may hold code that is not on `prod`. B uses a new hook from A, but B passes STAGING before A → B cannot ship independently.

Declare it in the feature PR ([templates/feature-pr.md](../templates/feature-pr.md)):

```
feature: TOPX-155
base_main_sha: abc123

dependencies:
  - TOPX-142

release_independent: false
```

Three options: release B with/after A · refactor the dependency away · split the shared foundation into its own PR.

## F03 — Feature branch is stale against `main`

Do not rebase or merge `main` into the feature right before release: that can drag un-QC'd changes into the PR. Instead: measure the delta (`git log --oneline origin/main..HEAD`, `git diff --stat origin/main...HEAD`), run CI on the **merge result**, then decide.

If the PR is actually conflicting with `main`, handle it with the `notex-branch-sync` skill — that is resolving a PR conflict, not syncing casually before release.

## F04 — Several AI agents working in parallel

| Phase | Rule |
|---|---|
| Before coding | identify shared modules + interfaces that must stay stable |
| While coding | one worktree and one feature branch per agent |
| Before the PR | check diff, dependencies, impact on other features |
| Before promotion | integration test on the latest target branch |
| On conflict | a developer reviews the resolution logic; the agent does not decide alone |
| After merge | do not promote further until QC confirms |

A worktree isolates the working environment; it does **not** solve semantic conflict.

## P02 — Missing or duplicate commits

Check completeness and duplicates per [promotion-integrity.md](promotion-integrity.md). Missing → promote the extra commit; duplicate → stop, do not pick again (empty pick or phantom conflict). Never replace the manifest with `-x`; `-x` records the original commit, it does not prove the set is complete.

## P03 — Wrong commit order

Pick in historical order: types → api → ui → fix. Picking UI before types fails the build. If the order must change, state it in the promotion PR and re-run every gate.

## P04 — Environment changes while QC is testing

A QC result attaches to a specific deployment. Mandatory fields: FE SHA, BE version, environment, scope, timestamp, result.

On a new deployment: do not void every previous result — scope the change and retest the affected parts. A release candidate must be tested inside a **testing window / freeze**.

## R01–R04 — Release phase

| Case | Situation | Action |
|---|---|---|
| R01 | `main` holds A+B, B is waiting on BE PROD | the FE Lead picks the batch and timing; A may ship first |
| R02 | STAGING tested A+B+C, `main` only has A+B | verify the A+B RC separately — see [release-gate.md](release-gate.md) |
| R03 | PROD has a new hotfix, `main` awaits release | back-sync before release; run all four layers — empty ancestry is not enough ([release-gate.md](release-gate.md)) |
| R04 | Bug after A merged to `main` | `fix/*` from `main`, promote to the branches that need it; the feature PR is no longer the only home |

R02 detail: each feature passing STAGING does **not** prove the combination on `main` passes. Before merging `main → prod`: pin the exact RC, check unreleased dependencies, run CI on the merge result with `prod`, run regression for the batch combination, confirm FE/BE PROD compatibility. Without a preview environment, use STAGING inside a testing window — coordinate it, because STAGING is serving other features' QC.
