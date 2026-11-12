---
name: notex-ticket-create
description: Author or upgrade a TOPX Jira ticket (Bug/Task/Sub-task/Story) so it is ready to hand off — enforces the NoteX summary tag [PRODUCT-ENV][SURFACE], the mandatory Steps/Expected/Actual/ENV block, Given/When/Then acceptance criteria, and a written <cần bổ sung tài liệu> placeholder instead of invented behaviour. Use when asked to create a ticket, write a bug report, turn a use case into a ticket, audit or rewrite an existing TOPX ticket that has no reproduction steps, or check whether a ticket is ready to assign to dev.
license: MIT
metadata:
  author: son-nguyen
  version: "1.1.0"
---

# NoteX Ticket Authoring (TOPX)

## Overview

Turns a raw bug report, QC message or use case into a TOPX ticket that another person can pick up without asking questions — and upgrades existing tickets that are too thin to assign.

A ticket is the smallest unit of work that has one owner, can be verified and can be closed. It fails when any of the three roles — reporter, implementer, tester — has to guess. This skill removes the guessing in two modes:

- **Mode A — create**: build a new ticket from scratch.
- **Mode B — upgrade**: audit an existing ticket, then rewrite it, preserving the original report and marking gaps instead of inventing behaviour.

## When to Use

This skill should be triggered when:

- User asks to create a ticket, file a bug, or turn a use case into a ticket
- User asks to rewrite, clean up or audit an existing TOPX ticket
- User asks whether a ticket is ready to hand to dev/QC
- A ticket has an empty description, no reproduction steps, or no expected-vs-actual
- Keywords: tạo ticket, viết ticket, bug report, usecase, TOPX, Jira, sẵn sàng giao việc, audit ticket

## Instructions

### Mode A — Create a new ticket

1. **Split first.** If the request contains two behaviours that can be fixed or closed independently, create two tickets and link them `relates`. Real case: TOPX-338 bundled Change Password + Delete Account, only half had a spec, so it could never close.

2. **Pick the issue type.** `Bug` for wrong behaviour, `Story` for a new user-facing capability, `Task` for technical/QC work, `Sub-task` for a slice of a parent — a Sub-task must have a parent.

3. **Write the summary in the mandatory shape** `[PRODUCT-ENV][SURFACE] <hành vi sai> khi <điều kiện>` where PRODUCT-ENV is `[DEV-EE]`, `[PROD-EE]`, `[STG-EE]`, `[EE]` or `[B2C]`/`[PROD]`, and SURFACE is `[WEB]`, `[App]`, `[BE]` or `[QC]`. Product and environment have no Jira field in this project, so the tag is the only routing signal. Good: `[DEV-EE][WEB] Với mode ẩn audio không add được bookmark`. Bad: `Bookmark lỗi`.

4. **Fill the description** from `references/ticket-template.md`. The four blocks below are never optional: `STEPS` (numbered reproduction), `EXPECTED` (correct behaviour), `ACTUAL` (what happens now, never mixed with expected), `ENV` (build, account, environment). Add evidence, and keep an existing original report verbatim in a `{quote}` block at the end.

5. **Write 5–8 acceptance criteria** as Given/When/Then, at least one happy path, one boundary, one failure state, and — for a bug that changes state or permission — one for the reverse direction. Use `deliver-acceptance-criteria` when the feature deserves a full set; use `deliver-edge-cases` for new features and fold only the plausible P1 cases into the AC.

6. **Create it with the script**, never by hand: `scripts/new-ticket.ps1 -Type Bug -Summary "..." -DescriptionFile .\ticket.md` prints the payload and validates the shape; add `-Create` to POST. The script rejects a summary without the tag, a description missing any of the four blocks, a description under 200 characters, and a Sub-task without `-Parent`. Jira is off by default — turn it on for the turn, create, turn it off.

7. **After creation** link the parent, related BE/design tickets and anything that blocks it, and give priority a reason (impact × frequency: `Critical/ High`, `High`, `Medium`, `Low`, `Minor`). Do not change status or assignee of other people's tickets.

### Mode B — Audit and upgrade an existing ticket

1. **Audit read-only first:** `scripts/improve-ticket.ps1 -Key TOPX-207` reports `[OK]`, `[MISSING]`, `[WARN]` and `READY=True|False` across eight checks: summary tag, four required blocks, acceptance criteria, Sub-task parent, assignee, attachment, comments, and days since last update.

2. **Treat `[MISSING]` as blockers, `[WARN]` as judgement calls.** A ticket can be `READY=True` and still be unassignable — ready means the ticket is structurally usable, not that the work is defined.

3. **Rewrite with placeholders instead of guesses.** Every unknown becomes `<cần bổ sung tài liệu>` plus who must supply it. Never invent reproduction steps, never invent business rules, never delete a bad original description — keep it in `{quote}`, keep attachments and comments.

4. **Write it back** with `-DescriptionFile .\rewritten.md -Update`. The script refuses to write if the new text is missing any of the four blocks, then reads the ticket back and compares character for character (`MATCH=True`).

5. **Leave status, assignee and priority untouched** unless the user asked for a specific change in that turn.

### Quality gate — run this before saying "done"

1. Would a stranger know what is broken from the summary alone?
2. Can a stranger reproduce it from the steps, without asking anything?
3. Are expected and actual in two separate places?
4. Does QC know which build, account and environment to use?
5. Is this two tickets pretending to be one?

### Anti-patterns seen in this project

| Pattern | Real example | Consequence |
|---|---|---|
| Empty description | TOPX-147/207/234 | Dev cannot start; ticket sits for weeks |
| Two jobs in one ticket | TOPX-338 | Cannot close, AC covers half |
| No expected behaviour | TOPX-314 | Two days lost to clarification |
| No boundary/failure AC | 7 of 16 bookmark tickets reopened | Fix takes several rounds |
| Nobody owns the state | TOPX-151 idle in `Ready for test` for 6 days | Ticket looks alive, nobody moves it |

## Examples

### Example 1: QC sends a screenshot in chat

**User request:** "tạo ticket cho lỗi này: chuyển share sang Công khai vẫn bị hạn chế"

**Expected behavior:** Ask only for what cannot be derived (build, account); produce `[PROD-EE][web][share] ...`, description with steps/expected/actual/env, 5–8 AC including the reverse direction (Công khai → Hạn chế), dry-run the payload, then create only after confirmation.

### Example 2: A sub-task with an empty description

**User request:** "audit TOPX-207"

**Expected behavior:** Report `[MISSING] description trong`, `READY=False`, then rewrite it with `<cần bổ sung tài liệu>` for steps and expected, a concrete "Cần bổ sung trước khi làm" list naming the blocking BE/design tickets, and write it back with `MATCH=True`.

### Example 3: Is this ticket ready to assign?

**User request:** "ticket này giao dev được chưa"

**Expected behavior:** Run the audit, answer with `READY` plus the blocking gaps, and refuse to call it ready when the blocker is a missing design or API — even if the ticket structure is complete.

## References

- [Ticket template](references/ticket-template.md) — description skeleton, field checklist, placeholder rules, AC rules for bugs
- [Worked examples](references/examples.md) — four tickets, including rewriting an empty one and one that must not be invented
- `scripts/new-ticket.ps1` — dry-run by default; `-Create` posts to Jira
- `scripts/improve-ticket.ps1` — read-only audit; `-Update` writes a rewritten description
- Outside this skill: `~/.dsh/references/jira-write.md` (POST/transition recipes), `~/.dsh/references/topx-workflow-saydi-bug.mmd` (workflow actionIds)
