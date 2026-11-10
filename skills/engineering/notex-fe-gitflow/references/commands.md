# Commands — copy-paste

The machine's default shell is **PowerShell 5.1**. The blocks below run in PS 5.1; anything needing Git Bash is called out.

## Feature

```powershell
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c feature/TOPX-142-bookmark
```

Push and open the PR (Draft is fine):

```powershell
$env:HUSKY='0'
git push -u origin HEAD
gh pr create --base main --head feature/TOPX-142-bookmark --draft `
  --title "feat(bookmark): add bookmark management" --body-file templates\feature-pr.md
```

`gh` needs `gh auth login`; without it, open the PR in the browser and paste the template.

## Promotion (DEV / STAGING)

```powershell
git fetch origin
git switch -c promote/TOPX-142-dev origin/develop
git cherry-pick -x <sha1> <sha2>          # -x is mandatory: records the original commit

# record the commit mapping in the PR
git log --format="%h %s" origin/develop..HEAD   # new SHA on the promotion branch
git cherry -v origin/develop HEAD               # original SHA (second column)
```

Gate before pushing:

```powershell
npm run typecheck;                              $t=$LASTEXITCODE
npx oxlint src/features/bookmark;               $l=$LASTEXITCODE
npm run i18n:verify;                            $i=$LASTEXITCODE
npx vitest run --project unit tests/unit/bookmark; $v=$LASTEXITCODE
npm run build;                                  $b=$LASTEXITCODE
"typecheck=$t oxlint=$l i18n=$i vitest=$v build=$b"
```

All six must be `0` before pushing. `build` can be skipped when `node_modules` is a junction into a shared install (Turbopack refuses to build); in that case `typecheck` is the official gate — say so in the PR.

```powershell
git push -u origin HEAD
gh pr create --base develop --head promote/TOPX-142-dev --body-file templates\promotion-pr.md
```

For STAGING: repeat with `origin/staging` and `promote/TOPX-142-staging`; the commit source is the set that passed QC on DEV — an integration fix is added only after checking its dependency and whether it applies on STAGING.

## QC by deployment SHA

```powershell
git fetch origin
git ls-remote origin refs/heads/develop   # SHA the environment runs — compare with Deployment SHA in the PR
```

A QC pass is only valid for exactly this SHA. If the SHA changes (someone promoted more), the old QC no longer holds.

## Release `main → prod`

```powershell
git fetch origin
git log --oneline origin/prod..origin/main      # batch: what will be released
git log --oneline origin/main..origin/prod      # ancestry: MUST be empty
git cherry -v origin/main origin/prod           # patch equivalence: a remaining '+' means no equivalent on main yet
git diff --stat origin/prod...origin/main       # the real diff; check nothing outside the batch changed

gh pr create --base prod --head main `
  --title "chore(release): 2026.11.1" --body-file templates\release-pr.md
```

After merge + deploy + smoke test:

```powershell
git tag -a v2026.11.1 -m "Release 2026.11.1"
git push origin v2026.11.1
git ls-remote --tags origin v2026.11.1          # is the tag actually on the remote?
```

Tag format `v<version>` mirrors the `release/<version>` branch; if the team settles on a different format, follow it — but stay consistent.

## Hotfix + back-sync

```powershell
git fetch origin prod
git switch -c hotfix/TOPX-190-login-401 origin/prod
# fix, commit, PR:
gh pr create --base prod --head hotfix/TOPX-190-login-401

# after the PROD deploy — back-sync to main
git switch main; git pull --ff-only origin main
git cherry-pick -x <hotfix-sha>
$mainSha = git rev-parse HEAD        # the ported commit on main

# check THAT exact commit on each target — never the whole branch
git cherry -v origin/staging origin/main | Select-String $mainSha   # '-' = target has it, '+' = not yet
git show --stat $mainSha                                            # files the hotfix touched
git diff origin/staging:<file> origin/main:<file>                    # compare each file
```

`git cherry` compares patch-ids: `-` is a signal that a **textually** equivalent change exists, not proof of identical behaviour. Same file but different behaviour → port by hand; after picking, run the hotfix's tests on the target branch.

## Check whether a fix reached an environment

```powershell
git fetch --prune origin
$sha = git rev-parse <commit-on-main>
git cherry -v origin/staging origin/main | Select-String $sha   # '-' = target has it, '+' = not yet
git show --stat $sha                                             # files the fix touched
git diff origin/staging:<file> origin/main:<file>                # compare each file
```

Answer "has it landed?" for **one specific commit**, never by comparing whole branches. `git cherry` is a patch-id: `-` only says a **textually** equivalent change exists, not that behaviour matches — still read the diff and run tests before concluding. Do not use `git merge-base --is-ancestor` to decide a fix is missing: environments are cherry-pick lineages with different hashes. Detail: [conflict.md](conflict.md).

## Windows gotchas

| Symptom | What it actually is |
|---|---|
| `[exit code: 1]` after `git push` / `commit` / `checkout` | may be a spurious PS 5.1 marker: read `$LASTEXITCODE` and the output before believing it |
| Commit message with Vietnamese diacritics gets mangled | write the message to a UTF-8 file **without BOM**, then `git commit -F <file>` |
| `git worktree add` hangs > 2 minutes | Husky `post-checkout` runs `npm run prepare`; if you only need a clean HEAD copy, `git archive HEAD \| tar -x -C $tmp` |
| Husky hook blocks the `docs:` tracking commit | `$env:HUSKY='0'` for that one commit; never disable it permanently |
| `npx oxlint` / `prettier` silently skips files | pass explicit paths — PS does not expand globs for binaries |
