---
name: react-composition-architect
description: Analyze, design, and refactor React components using progressive composition patterns. Start with plain props, then introduce compound components, Container + Composer props, Provider contracts, or selector stores only when concrete architectural problems justify added abstraction. Use whenever designing, reviewing, or refactoring React components, eliminating prop drilling, reducing boolean flag explosion, isolating re-renders, or building reusable UI libraries and design systems.
---

# React Composition Architect

A comprehensive framework for architecting and refactoring React components using progressive composition patterns and re-render performance controls.

---

## Core Principles

1. **Lowest Sufficient Abstraction**: Always start with the simplest pattern that solves the current problem cleanly.
2. **Composition Over Configuration**: Prefer passing components, slots, and `children` over multiplying boolean flags or configuration objects.
3. **Prefer Container Props Over Context**: When a UI component supports multiple data sources for a localized subtree, use Container + Composer props (Level 3A) instead of React Context (Level 3B).
4. **Explicit Data Flow & Minimal Client Boundaries**: Keep state local where possible, preserve React Server Component boundaries, and lift state only when multiple current consumers require it.

---

## Codebase Assumptions

* Next.js App Router, React 19, TypeScript strict mode.
* React Server Components by default; Client Components (`"use client"`) only for interactive islands.
* TanStack Query for remote client data; Zustand for global client state; URL search params for shareable filters/sorting.

---

## Progressive Composition Ladder

| Level | Pattern | Use When | Reference |
| :--- | :--- | :--- | :--- |
| **1** | **Plain Props** | Component has one clear responsibility & stable API | [references/composition-patterns.md](file:///d:/Web/moon-ai-skills/skills/engineering/react-composition-architect/references/composition-patterns.md#level-1-plain-props) |
| **2** | **Compound Components & Slots** | Caller needs layout flexibility or sub-component rearrangement | [references/composition-patterns.md](file:///d:/Web/moon-ai-skills/skills/engineering/react-composition-architect/references/composition-patterns.md#level-2-compound-components--slots) |
| **3A** | **Container + Composer Props** | Same UI needs multiple data sources (API/Cache/Fixtures) in a localized scope *(Preferred default)* | [references/composition-patterns.md](file:///d:/Web/moon-ai-skills/skills/engineering/react-composition-architect/references/composition-patterns.md#level-3a-container--composer-props-preferred-default) |
| **3B** | **Composer + Providers** | Multiple distant branches across the component tree need the same contract | [references/composition-patterns.md](file:///d:/Web/moon-ai-skills/skills/engineering/react-composition-architect/references/composition-patterns.md#level-3b-composer--providers) |
| **4** | **Shared Feature State** | State and actions cross multiple component boundaries | [references/composition-patterns.md](file:///d:/Web/moon-ai-skills/skills/engineering/react-composition-architect/references/composition-patterns.md#level-4-shared-feature-state) |
| **5** | **Collection Optimization** | Large or high-frequency collections requiring selector stores or virtualization | [references/performance-optimization.md](file:///d:/Web/moon-ai-skills/skills/engineering/react-composition-architect/references/performance-optimization.md#per-item-subscription-strategy-level-5) |

*Prefer Level 3A over Level 3B. A swappable data source does not automatically require React Context.*

---

## Level Selection Decision Tree

```text
Can the component remain clear with normal props?
├─ Yes → Level 1: Plain props
└─ No
   ├─ Is the problem layout flexibility or optional regions?
   │  └─ Yes → Level 2: Compound components & Slots
   │
   ├─ Does the same UI need different data sources?
   │  ├─ Limited consumer scope → Level 3A: Container + Composer props (Preferred)
   │  └─ Multiple distant branches need same contract → Level 3B: Composer + Providers
   │
   ├─ Do state and actions cross component boundaries?
   │  └─ Yes → Level 4: Shared feature state
   │
   └─ Is the collection large or updated frequently per-item?
      └─ Yes → Level 5: Collection optimization (Selector stores / Virtualization)
```

---

## Required Workflow

### Step 1: Inspect & Diagnose Concrete Smells
Classify current issues against architectural smells:

| Code Smell | Recommended Solution |
| :--- | :--- |
| **Component has small, stable prop API** | Keep Plain Props (Level 1) |
| **Boolean flag explosion (`hasHeader`, `isSmall`, etc.)** | Use Compound Components / Slots (Level 2) |
| **Same UI receives API, Cache, or Fixture data** | Use Container + Composer props (Level 3A) |
| **Distant component branches need same feature actions** | Use Feature Provider (Level 3B / 4) |
| **Every list row re-renders on selection toggle** | Use Granular Selector Store (Level 5) |

### Step 2: Reference Detailed Guides As Needed
- **Implementation & Code Snippets**: Consult [references/composition-patterns.md](file:///d:/Web/moon-ai-skills/skills/engineering/react-composition-architect/references/composition-patterns.md).
- **Performance, Context Splitting & Virtualization**: Consult [references/performance-optimization.md](file:///d:/Web/moon-ai-skills/skills/engineering/react-composition-architect/references/performance-optimization.md).
- **Full Architecture & Directory Examples**: Consult [references/case-studies.md](file:///d:/Web/moon-ai-skills/skills/engineering/react-composition-architect/references/case-studies.md).

### Step 3: Implement & Verify
Ensure changes preserve Server Component boundaries, keep state local, and avoid unnecessary abstractions.

---

## Review Checklist

- [ ] Is this the lowest sufficient composition level?
- [ ] Can a Context Provider be replaced by Container props (Level 3A)?
- [ ] Are Client Component boundaries kept as low as possible?
- [ ] Does every consumer subscribe only to state fields it actually uses?
- [ ] Are Context Provider values wrapped in `useMemo` to preserve reference identity?
- [ ] Are unchanged item references preserved during list transformations?

---

## Final Output Format

End architectural or refactoring tasks with this summary format:

```text
Composition decision:
- Current level:
- Recommended level:
- Why:

Performance diagnosis:
- Main update source:
- Current rerender scope:
- Recommended rerender scope:

Introduced:
- ...

Avoided:
- ...

Measurement / Evidence:
- Evidence available:
- Remaining risks:
```
