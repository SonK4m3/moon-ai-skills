---
name: fe-memory-and-perf-audit
description: Apply optimization philosophy to frontend JS/TS/React code — analyze object shape, state boundaries, feature boundaries, memory allocation, and hot paths before suggesting any memo/cache/virtualization. Use when user asks to optimize performance, reduce memory, refactor complex logic, split monolithic hooks/stores, optimize large lists/tables/trees, or says "why is this slow", "optimize this", "reduce memory", "refactor this module".
version: 2.0.0
domain: engineering
---

# FE Memory & Performance Audit

## Scope

Handles: performance and memory optimization of frontend JS/TS/React code through architectural analysis.
Does NOT handle: general bug finding, backend logic, infrastructure, or CSS/styling issues.

## Core Rule

> Optimize architecture first. Optimize implementation second. Optimize syntax last.

Never start with `useMemo`, `memo`, `useCallback`, virtualization, or caching. Start with the system's shape.

## Process

### Step 1 — Measure & Identify

Read the target code and identify what to measure:

| Problem | Correct Metric |
|---------|---------------|
| UI feels slow | render count, commit time, long tasks |
| Browser eats RAM | heap snapshot, retained memory |
| Scroll jank | FPS, DOM node count |
| Page freezes on open | data transformation time, object allocation |
| Search/filter slow | query/indexing time |

Do NOT proceed without identifying the actual bottleneck category.

### Step 2 — Apply Decision Formula

For each piece of code, ask in order:

1. Is this object created thousands of times? → Make it lean (Principle 2, 3, 14)
2. Does it hold its own functions/helpers? → Move to shared logic (Principle 3)
3. Is the component subscribing to too much state? → Narrow selector (Principle 5)
4. Building data user hasn't seen? → Lazy materialization (Principle 8)
5. Importing/enabling unused features? → Split into plugins (Principle 4)
6. Caching to fix wrong logic? → Fix logic first (Principle 10, 14)
7. Does the refactor break mental model? → Migration path needed (Principle 12)
8. Is the scale large enough? → Match optimization to data size (Principle 13)

### Step 3 — Diagnose & Report

Present findings using this structure:

```markdown
## Diagnosis
The main issue is not [surface symptom].
The deeper issue is [object shape / state boundary / hot path / data duplication / feature coupling].

## Principles Involved
| Principle | Why It Matters Here |
|---|---|

## Problems Found
1. ...

## Wrong Pattern
[code]

## Better Pattern
[code]

## Migration Plan
| Phase | Goal |
|-------|------|

## What To Measure
| Metric | Why |
|--------|-----|

## What Not To Do Yet
- ...
```

### Step 4 — Apply (on user approval)

Wait for user to choose which recommendations to apply. Never refactor without approval.

## Rules

- Always diagnose before prescribing. No blind `useMemo`.
- Show wrong vs better pattern with concrete code.
- Explain WHY, at WHAT SCALE it matters, and WHAT TRADE-OFF exists.
- Include migration plan for breaking changes.
- State what NOT to optimize yet.
- Scale the response: small issue → short answer. Large module → full template.

## References

- [Optimization Philosophy](references/optimization-philosophy.md) — 14 principles, anti-patterns, review checklist, response template
- [Examples](references/examples.md) — 8 categories × 3 code examples each (wrong → right patterns)
