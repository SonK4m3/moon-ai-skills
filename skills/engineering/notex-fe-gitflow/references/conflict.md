# Conflicts when cherry-picking onto an environment branch

The conflict happens **inside the promotion branch** (`promote/<ticket>-<env>`), not on the environment branch. Resolve it there, push, then open the PR — the environment branch only ever receives a merge from a PR.

## Textual vs semantic conflict

| Type | Does Git detect it? | Example | How to detect |
|---|---|---|---|
| Textual | Yes, with conflict markers | both sides edit the same JSX block | `git status`, `<<<<<<<` markers |
| Semantic | **No** | A changes the state shape, B still uses the old logic | read both diffs + integration test |

Semantic conflicts are more dangerous: the cherry-pick is clean, typecheck and build stay green, and only QC or an integration test catches it.

## Checklist before closing a conflict

- [ ] The resolution was read through — not just "build is green"
- [ ] Behaviour of **both** sides preserved (feature + environment logic)
- [ ] Targeted regression: tests of the feature **and** of the environment code it touched
- [ ] The post-resolution diff was reviewed in the promotion PR
- [ ] If the resolution changed business logic → state it in the PR and assess porting it to other branches
- [ ] `--ours` / `--theirs` was not used for the **entire** conflict

## By file type

| Conflict type | Resolution |
|---|---|
| Imports / paths changed by a migration on `main` | take `main` (incoming) — the new structure is canonical |
| Logic added on the environment (develop/staging) | **keep both**: keep the environment logic, port the feature delta on top |
| `messages/<locale>/*.json` | **union keys**: environment keys survive, feature keys are added. Verify with `npm run i18n:verify` |
| `assets/icons/index.ts` | if `main` deleted it, keep it deleted; import the leaf `@/assets/icons/<file>.svg`. SVG ≥ 32KB as base64 raster → `assets/icons/raster-illustrations.tsx` (`?url` + `<img>`), enforced by `tests/unit/icon-raster-inlining.test.ts` |
| `AGENTS.md`, `CLAUDE.md`, `CONTEXT.md`, `docs/**` | the environment copy if the environment has its own edits, `main`'s copy if it is shared documentation; keep the feature's **new** doc files |
| Lockfile | take the environment copy, never hand-merge |
| Unclear, the two sides are entirely different | `git checkout --ours <file>` then re-apply the feature delta by hand |

In a cherry-pick, `--ours` is the **target branch** (the environment baseline you are standing on) and `--theirs` is the commit being picked.

## Three hard rules

1. **Keep the environment's running logic** — code serving real users on DEV/STAGING must not be deleted to make the pick clean.
2. **Record the decision** — original message (with the `(cherry picked from commit …)` line from `-x`) plus a `Conflict resolved:` block.
3. **Too many conflicts means stop** — `git cherry-pick --abort`, tell Son. Do not resolve just to be done.

## Procedure

```powershell
git fetch origin
git switch -c promote/TOPX-142-dev origin/develop
git cherry-pick -x <sha1> <sha2>     # stops at the first conflict
git status                            # list of unmerged files
# resolve each file per the table above
git add <file>
git cherry-pick --continue            # keeps the original message + cherry picked from line
```

After `--continue`:

```powershell
git status                            # clean, no unmerged paths
git log -3 --format="%h %s"           # message still has the Conflict resolved: block
npm run typecheck; npm run build      # gate — see commands.md
git push -u origin HEAD
```

## Commit message format

```
fix(bookmark): keep marker position after note switch

(cherry picked from commit 4f2c9ab7c1d3e5f60a8b9c0d1e2f3a4b5c6d7e8f)

Conflict resolved:
- messages/vi/bookmark.json: union of keys; env kept `marker.hidden`, feature added `marker.pinned`.
- features/bookmark/hooks/use-marker.ts: kept env retry logic, re-applied feature's
  optimistic update delta on top.
```

State **which file**, **whose logic was kept**, **why**. That message is all a later reviewer has.

## When to stop and ask Son

- The pick requires changing logic that is already running on the environment.
- The conflict spreads to files outside the feature scope.
- The same file conflicts on both DEV and STAGING for different reasons.
- It is unclear which side is "the running logic" (both look new).
- The promotion branch was already pushed and history must be rewritten to re-resolve — never force-push an environment branch; ask first.

Stopping means `git cherry-pick --abort` (return the promotion branch to its pre-batch state), then report: which files, why, and the proposed options. Merging `main` into an environment is an **exception** that Son must approve — environment histories have diverged, and a merge drags in changes outside scope.

## Equivalence check before back-sync

A hotfix on `prod` must reach `main`, then possibly `staging`/`develop`. Check **the exact commit to port**, not the whole branch:

```powershell
$sha = git rev-parse <commit-on-main-after-back-sync>
git show --stat $sha                                             # touched files
git cherry -v origin/staging origin/main | Select-String $sha    # '-' = target already has it, '+' = not yet
git diff origin/staging:<file> origin/main:<file>                 # compare each file
```

`git cherry` compares patch-ids: `-` means a **textually** equivalent change exists — it does not prove behaviour matches. If `-` but the file diff still differs, or the hotfix's tests fail on the target branch, port by hand anyway.

If an equivalent already exists, **do not cherry-pick again** — a second pick creates a duplicate commit or a phantom conflict.

## Do not misread the signals

- `git merge-base --is-ancestor` returning `false` does **not** mean the environment lacks the fix: cherry-picks create new hashes, and `develop`/`staging` are cherry-pick lineages.
- `git cherry -v <target> <source>`: `-` means the source already has an equivalent on the target, `+` means it does not. It is a patch-id, only a signal — never a substitute for reading the diff and running tests.
