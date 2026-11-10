# Promotion PR

**Ticket:** TOPX-XXX
**Feature PR:** #
**Target Environment:** DEV / STAGING
**Source Feature:**

## 1. Commits to Promote

Manifest — a missing field means missing traceability:

| Field | Value |
| ----- | ----- |
| Feature PR | # |
| Source HEAD (feature) | `abc123` |
| Target | `develop` / `staging` |
| Original commits | A1, A2, A3 |
| Promoted commits | A1', A2', A3' |
| Additional integration fixes | F1 (if any) |

Per-commit mapping — one pair per row:

| Original commit (feature) | Cherry-picked SHA (env) |
| ------------------------- | ----------------------- |
| `abc1234`                 | `<sha after cherry-pick>` |

## 2. Dependency & Conflict

- [ ] Commit list verified — complete, in dependency order
- [ ] No missing or duplicated changes — nothing was promoted before
- [ ] Dependencies verified
- [ ] Conflict resolution reviewed (if any)

## 3. CI Verification

- [ ] Typecheck
- [ ] Lint
- [ ] Unit / Integration tests
- [ ] Build

## 4. Deployment & QC

- Deployment SHA:
- FE environment:
- BE version:
- QC Status: Pending / Passed / Failed
- QC owner:
- QC Evidence:
