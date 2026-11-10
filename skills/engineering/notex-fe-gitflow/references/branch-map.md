# Branch map — NoteX Interface FE

Roles per **Git Workflow Standard v1.0**. Signs this table is stale: `git branch -r` shows a new environment branch, or `main` was renamed. If either happens, stop, ask Son, and update this file.

| Branch | v1.0 role | Receives code from | Deploys |
|---|---|---|---|
| `main` | code the FE Lead **accepted**; integration branch; **does not auto-deploy** | PR `feature/* → main` | — |
| `develop` | DEV FE, wired to DEV BE | promotion PR (cherry-pick) | DEV |
| `staging` | STAGING FE, wired to STAGING BE | promotion PR (cherry-pick) | STAGING |
| `prod` | Production FE, wired to PROD BE | PR `main → prod` (release batch), PR `hotfix/* → prod` | PROD |

## Consequences to remember

- **`main` running ahead of `prod` is normal**, not a fault: a feature in `main` may be waiting on BE PROD or the next batch. Never "sync" by merging `prod → main`; hotfixes travel their own path (see `references/sop.md`).
- `develop` / `staging` **receive promotion PRs**, never feature PRs directly and **never** a merge from `main`. The environment histories diverged long ago (different hashes, not ancestors) — compare content, not `--is-ancestor`.
- `prod` **accepts no cherry-picks**. Only the `main → prod` release PR and hotfix PRs.
- No environment branch accepts a direct push, not even for an urgent fix.

## EE — outside v1.0 scope

Standard v1.0 defines B2C only. EE branches still exist and **must not be promoted using this skill** — ask Son before doing anything on EE.

| Branch | State |
|---|---|
| `notex-ee` | trunk + EE production |
| `notex-ee-dev` | EE dev, receives cherry-picks |
| `notex-ee-main` | frozen 2026-10-14 |
| `notex-ee-prod` | unused |
| `notex-ee-moj`, `notex-hanoiwork` | tenant branches, only when the ticket says so |

To move B2C changes onto EE, read `docs/merge-main-into-notex-ee-guide.md` on `notex-ee`: consumer-only components are deleted by design, and "restoring" them breaks the branch.

## Worktree

One worktree = **one product + one environment**. Never carry a B2C worktree into EE work.

- Path: `<repo parent>\notex-interface.worktrees\<product>-<env>-<slug>`
- Create/adopt a worktree with the `notex-worktree-context` skill; do not run `git worktree add` yourself — husky `post-checkout` can hang.

## Jira

The tag in the summary follows the **product**, not the environment: B2C has no `EE` tag; EE uses `[EE]` / `[DEV-EE]` / `[PROD-EE]`. Jira rules live in `~/.dsh/AGENTS.md` — do not copy them into this repo.

## Re-verification

```powershell
git fetch --prune origin
git branch -r
git log --oneline -1 origin/main
git log --oneline -1 origin/develop
git log --oneline -1 origin/staging
git log --oneline -1 origin/prod

# how far main and prod have diverged (normal when main is ahead)
git rev-list --left-right --count origin/prod...origin/main
# commits on prod that main lacks — must be empty before a release
# (only 1 of the 4 integrity layers; see release-gate.md)
git log --oneline origin/main..origin/prod
```
