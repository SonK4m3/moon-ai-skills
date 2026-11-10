# Promotion integrity — verified cherry-pick

Promotion is not "cherry-pick until it runs". The goal: the commit set on the environment is **exactly** the approved set, in order, with nothing extra, and with evidence.

## Manifest — written before picking

```yaml
ticket: TOPX-142
source_branch: feature/TOPX-142-bookmark
target_branch: develop

source_commits:
  - a111111
  - a222222
  - a333333

dependencies:
  - TOPX-155

verification:
  commit_completeness: pending
  patch_equivalence: pending
  conflict_review: pending
  scope_check: pending
  ci: pending
```

The manifest is filled into the promotion PR ([templates/promotion-pr.md](../templates/promotion-pr.md)); a status flips to `passed` only after it actually ran.

## Procedure

```powershell
git fetch origin
git switch -c promote/TOPX-142-dev origin/develop
git cherry-pick -x <sha1> <sha2> <sha3>     # historical order
```

1. **Completeness** — every manifest commit present?
   `git log --oneline origin/develop..HEAD`
2. **Duplicate** — is a commit already on the target?
   `git cherry -v origin/develop <source-branch>` → a `-` line means the target already has an equivalent.
3. **Scope** — only feature files touched?
   `git diff --name-only origin/develop...HEAD` against `git diff --name-only origin/main...<source>`.
4. **Conflict review** — if a conflict occurred: [conflict.md](conflict.md); never `--ours`/`--theirs` for the whole conflict.
5. **Gate** — typecheck, lint, unit/integration tests, build (repo commands: `commands.md`).
6. **Report** — the table below, then open the PR.

## Patch equivalence ≠ semantic equivalence

`git cherry`/`-x` compare patch-ids: they prove **textual** equivalence, not behaviour. A conflict resolution can change logic while the patch-id still matches — read the diff and run targeted tests for the feature **and** for the environment code it touched.

## Report template

| Field | Value |
|---|---|
| Source | `feature/TOPX-142-bookmark` |
| Target | `develop` |
| Original commits | 3 |
| Promoted commits | 3 |
| Conflict | None |
| Typecheck | Passed (exit 0) |
| Build | Passed (exit 0) |
| PR | #512 |
| QC | Pending deployment |

Write `Passed` only when the command ran and exited 0; "Not created"/"Pending" for anything not done.

## Stop when

- The full source set cannot be identified (missing SHA, missing mapping).
- A commit was already promoted but still sits in the manifest.
- The diff touches files outside the feature scope.
- A conflict forces a change to logic that is already running on the environment.
- A gate is red and you cannot prove it was already red on the old target.
