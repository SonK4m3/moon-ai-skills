# Execution Contract — how the agent operates Git

Applies to every action, read-only commands included. This contract answers: **what is allowed, how far, when to stop, what to report**.

## 1. Pre-flight — nine questions answered before touching git

| Context | Question | Command |
|---|---|---|
| Repository | is this the right `notex-interface` checkout? | `git rev-parse --show-toplevel` |
| Worktree | are there uncommitted changes? | `git status --short`, `git worktree list` |
| Branch | which branch am I on? | `git branch --show-current` |
| Source | which feature/commits? | `git log --oneline origin/main..HEAD` |
| Target | what SHA is `develop`/`staging`/`prod` at? | `git fetch`, `git rev-parse origin/<target>` |
| Dependencies | what commit/feature does this depend on? | `git log --oneline <range>`, dependency block in the feature PR |
| Existing promotion | has this commit been promoted already? | `git cherry -v origin/<target> origin/main` (patch-id signal) |
| Conflicts | does it overlap the target? | `git diff --stat origin/<target>...<source>`, `git merge-tree` |
| Authorization | how far may I branch / commit / push / open a PR? | **ask**; never infer from the tone of the request |

**Rule:** context comes from real commands — not from a branch name, ticket title or the conversation. Run `git fetch` only when the environment may reach the remote; if you cannot fetch, say explicitly that you are comparing against stale refs.

## 2. Three modes

| Mode | Purpose | Allowed | Not allowed |
|---|---|---|---|
| **Inspect** | analyse state, bugs, dependencies | read commands, run tests without editing code | create branch, commit, push |
| **Prepare** | prepare local changes | create branch/worktree, edit code, commit locally, cherry-pick on a promotion branch, run gates | push, open PR, merge |
| **Execute** | move changes to the remote | push, open PR, authorised promotion | merge `main`/`prod`, deploy, tag without separate approval |

A mode is a **delegation scope**; it does not replace SOPs or the FE Lead's decision rights. "Fix this for me" defaults to Prepare; "promote to DEV" also defaults to Prepare until pushing is stated explicitly.

## 3. Three risk tiers

| Tier | Examples | Condition |
|---|---|---|
| **LOW** — read/analysis | `status`, `log`, `diff`, `cherry`, reading conflicts, drafting a plan | self-serve within the assigned scope |
| **MEDIUM** — local changes | create branch/worktree, edit code, commit, cherry-pick on a promotion branch | requires task authorisation |
| **HIGH** — remote/protected | push, open PR, merge, deploy, release tag | requires clear authorisation for **each** action |

Force-push, `reset --hard`, branch deletion, discarding uncommitted changes: **never** self-executed — separate approval plus impact review required, even in Execute mode. A normal push and a force-push do not share one approval.

## 4. Stop conditions

Stop, report, ask — do not guess:

- The repo/branch is outside the requested scope.
- The working tree has unrelated changes.
- Source commits cannot be identified.
- A semantic conflict or dependency cannot be resolved confidently.
- A promotion would carry changes outside scope.
- QC evidence is missing for a step that requires QC.
- The action would violate branch protection or release policy.

When stopping, state: what was checked · which evidence is missing · two options with their technical impact. Stopping at the right moment is correct behaviour, not failure.

## 5. Completion — evidence report

Only record a status after it actually ran and the output was read:

- `Passed` only when the gate command completed with exit code 0 and produced output.
- Command and exit code must appear in the report, not just the conclusion.
- Never claim "QC passed", "deployment succeeded" or "PR approved" without verifiable evidence.
- Work not done is "Not created"/"Pending"; never imply it finished.

Report template: [templates/execution-report.md](../templates/execution-report.md).

## 6. Self-check scenarios

| Situation | Correct behaviour |
|---|---|
| Working tree has uncommitted changes | do not overwrite or delete; stop and ask |
| Commit was already cherry-picked | detect the duplicate, do not promote again |
| Conflict in a shared hook | analyse the semantic conflict; do not pick `--ours`/`--theirs` blindly |
| Bug only reproduces when A+B run together | pick `fix/*` from the environment baseline, not the feature branch by default |
| QC passed on an old SHA | warn, determine the retest scope |
| `main` holds an unreleased feature | detect the dependency when a new feature branches off |
| `prod` has an un-back-synced hotfix | warn before release; run the four integrity checks |
| "Can this PR be merged?" | assess and recommend only, never merge |
| "push it for me" without authorisation | do not push; request authorisation |

## 7. What does **not** count as authorisation

| Phrase | Actual scope |
|---|---|
| "fix this for me" | Prepare — edit and commit locally, no push |
| "promote to DEV" | Prepare — create the promotion branch, pick, run gates; push/PR must be stated |
| "can this be merged?" | Inspect — assess only |
| "ship it" | still needs the locked batch plus separate approval to merge `main → prod` and tag |
| "just do it" | does not expand permission: stop at the level stated in the plan |

When the plan and the request diverge, state the intended permission level in the plan so the user confirms before any HIGH step runs.
