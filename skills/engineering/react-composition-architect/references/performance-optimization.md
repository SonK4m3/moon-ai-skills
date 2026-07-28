# Performance and Re-render Optimization

This guide details performance principles, profiling workflows, memoization rules, and state subscription strategies for React applications.

---

## Core Performance Principles

1. **Composition Over Context**: Higher composition levels (especially Context Providers) broaden subscription scopes. Prefer Container + Composer props (Level 3A) when possible.
2. **Context is Not Selector-Based**: Updating a Context value causes **all** subscribing components to re-render, even if they only consume an unchanged property.
3. **Preserve Structural Sharing**: Maintain stable reference identity for unchanged array elements and object references to maximize `React.memo` effectiveness.
4. **Keep Client Boundaries Low**: Interactive state requires `"use client"`. Avoid wrapping Server Component trees inside unnecessary Client Providers.

---

## Performance Analysis Checklist

Before introducing Context, stores, or virtualization, analyze:

- [ ] Which values change frequently vs occasionally?
- [ ] Which components subscribe to each value?
- [ ] Is Context invalidating unrelated UI subtrees?
- [ ] Are unchanged collection item references preserved?
- [ ] Does TanStack Query `select` provide targeted subscriptions?
- [ ] Is selection state updating per-item or globally?
- [ ] Is DOM node count causing scrolling lag?

---

## Context Splitting & Stability

### Provider Value Stability
Always wrap Context values in `useMemo` to prevent invalidating subtrees on parent re-renders:

```tsx
const actions = useMemo(() => ({ toggleNote, deleteNote }), [toggleNote, deleteNote]);
const state = useMemo(() => ({ notes, selectedIds }), [notes, selectedIds]);
const value = useMemo(() => ({ state, actions }), [state, actions]);

return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
```

### Splitting Context by Update Frequency
Separate high-frequency state from low-frequency state or actions:

```tsx
const NotesDataContext = createContext<NotesDataContract | null>(null);
const NotesActionsContext = createContext<NotesActionsContract | null>(null);
const NotesSelectionContext = createContext<NotesSelectionContract | null>(null);
```

---

## Per-Item Subscription Strategy (Level 5)

For large collections or frequent per-item updates (e.g. selection checkboxes, inline editing), broad Context subscriptions force the entire list to re-render.

### Granular Selector-Based Store (Zustand / Keyed State)

```tsx
function NoteSelectionCheckbox({ noteId }: { noteId: string }) {
  const selected = useNotesSelectionStore((state) => state.selectedIds.has(noteId));
  const toggle = useNotesSelectionStore((state) => state.toggle);

  return (
    <Checkbox
      checked={selected}
      onCheckedChange={() => toggle(noteId)}
    />
  );
}
```

### Mutable Collections Guard
When using `Set` or `Map` in state, never mutate the existing instance:

```tsx
// Correct immutable update for Set
set((state) => {
  const next = new Set(state.selectedIds);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return { selectedIds: next };
});
```

---

## Memoization Rules (`memo`, `useMemo`, `useCallback`)

- **`memo`**: Apply to list items or expensive components that receive stable props.
- **`useCallback`**: Apply to callbacks passed into memoized child components or Context actions. Do not wrap event handlers that stay within local components.
- **`useMemo`**: Apply to expensive calculations or to preserve referential stability for arrays/objects passed to memoized children.

---

## List Virtualization

Evaluate virtualization (e.g., `@tanstack/react-virtual`) when:
* Collection contains hundreds of items.
* Item layout is heavy.
* Scroll degradation occurs.

```tsx
const virtualizer = useVirtualizer({
  count: notes.length,
  getScrollElement: () => containerRef.current,
  estimateSize: () => 84,
  overscan: 6,
});
```

---

## Profiling Workflow & Output Format

When performing performance analysis, provide:

```text
Performance diagnosis:
- Main update source:
- Current rerender scope:
- Recommended rerender scope:

Subscription boundaries:
- Contract / Store:
- Update scope:

Measurement / Evidence:
- Observed bottleneck:
- Potential rerender risk:
```
