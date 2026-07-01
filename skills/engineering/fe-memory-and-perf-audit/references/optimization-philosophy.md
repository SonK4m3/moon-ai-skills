# Code Optimization Philosophy

## Purpose

Use this reference to review, design, or refactor code with a focus on scalable optimization.

This skill does not start from micro-optimizations like adding `memo`, `useMemo`, `useCallback`, caching, or virtualization immediately. Instead, it analyzes the deeper structure of the code:

* Object shape
* Data ownership
* State boundaries
* Feature boundaries
* Re-render scope
* Hot paths
* Memory allocation
* Derived data
* Scale assumptions
* Migration safety

The goal is to optimize code in a way that remains maintainable, measurable, and adaptable across different use cases.

---

## Core Mindset

Good optimization is not about making everything faster.

Good optimization is about identifying:

1. What is repeated the most.
2. What is expensive in the hot path.
3. What state changes too broadly.
4. What data is duplicated unnecessarily.
5. What feature is loaded even when unused.
6. What abstraction works at small scale but breaks at large scale.
7. What refactor is safe to do now, and what needs a migration path.

The default rule:

> Optimize architecture first. Optimize implementation second. Optimize syntax last.

---

## Optimization Principles

### 1. Measure the Right Thing

Do not optimize before identifying the real bottleneck.

| Problem | Better Metric |
|---------|---------------|
| UI feels slow | render count, commit time, long tasks |
| Browser uses too much RAM | heap snapshot, retained memory |
| Scroll is laggy | FPS, dropped frames, DOM node count |
| Data loading is slow | network waterfall, TTFB, API latency |
| Search/filter is slow | query time, indexing time |
| App freezes when opening page | data transformation time, object allocation |
| Build is slow | bundle size, type-checking time, dependency graph |

```ts
// ❌ Adding memo everywhere without knowing the bottleneck
const Row = memo(function Row(props) {
  return <div>{props.title}</div>
})

// ✅ Measure first
console.time('build-view-model')
const viewModel = buildViewModel(rawData)
console.timeEnd('build-view-model')
```

> No correct metric, no correct optimization.

---

### 2. Optimize What Is Repeated the Most

A small cost becomes large when repeated thousands or millions of times.

```ts
// ❌ Per-instance functions (50k items = 150k functions)
const items = rawItems.map((item) => ({
  id: item.id,
  value: item.value,
  getLabel: () => item.value.trim(),
  isActive: () => item.status === 'active',
  canEdit: () => item.role === 'owner',
}))

// ✅ Shared logic object
type Item = { id: string; value: string; status: 'active' | 'inactive'; role: 'owner' | 'viewer' }

const itemLogic = {
  getLabel(item: Item) { return item.value.trim() },
  isActive(item: Item) { return item.status === 'active' },
  canEdit(item: Item) { return item.role === 'owner' },
}
```

> The more often an object is created, the smaller and simpler it should be.

---

### 3. Share Behavior, Isolate Data

Data should belong to each instance. Behavior should usually be shared.

```ts
// ❌ Each item carries its own methods
const records = data.map((record) => ({
  id: record.id,
  name: record.name,
  formatName: () => record.name.toUpperCase(),
  getStatusLabel: () => mapStatus(record.status),
}))

// ✅ Data-only items + shared logic
type RecordItem = { id: string; name: string; status: string }

const recordView = {
  formatName(record: RecordItem) { return record.name.toUpperCase() },
  getStatusLabel(record: RecordItem) { return mapStatus(record.status) },
}
```

> Instance data should be private. Behavior should be shared.

Use this for: rows, cells, tree nodes, timeline items, search results, transcript segments, notification items, file items, message items, task items.

---

### 4. Pay for What You Use

Do not load, initialize, or maintain features that a screen does not need.

```ts
// ❌ Enable everything
createModule({
  enableSearch: true, enableSort: true, enableFilter: true,
  enableGroup: true, enableSelection: true, enableDragDrop: true,
  enableExport: true, enableRealtimeSync: true,
})

// ✅ Opt-in features
createModule({
  features: [searchFeature(), sortFeature(), paginationFeature()],
})
```

> Core should be small. Features should be attached only when needed.

---

### 5. Use Fine-Grained State Subscription

Components should subscribe only to the state they render.

```ts
// ❌ Subscribe to entire store
const state = useAppStore()
return <Timer value={state.timer} />

// ✅ Subscribe to specific slice
const timer = useAppStore((state) => state.timer)
return <Timer value={timer} />
```

| Component | Should Subscribe To |
|-----------|---------------------|
| Timer | `duration`, `status` |
| Progress bar | `progress`, `uploadStatus` |
| List | `itemIds`, `itemsById` |
| Dialog | `activeDialog` |
| Toolbar | `selectedIds`, `availableActions` |
| Search input | `keyword` |
| Pagination | `page`, `pageSize`, `total` |

> A component should not re-render because of state it does not use.

---

### 6. Normalize Data

Avoid duplicating nested objects across many items.

```ts
// ❌ Nested duplication
const items = [{
  id: 'item_1', title: 'Item 1',
  owner: { id: 'user_1', name: 'Alex', avatar: '...' },
  workspace: { id: 'workspace_1', name: 'Main Workspace' },
}]

// ✅ Normalized
const itemsById = { item_1: { id: 'item_1', title: 'Item 1', ownerId: 'user_1', workspaceId: 'workspace_1' } }
const usersById = { user_1: { id: 'user_1', name: 'Alex', avatar: '...' } }
const workspacesById = { workspace_1: { id: 'workspace_1', name: 'Main Workspace' } }
```

| Case | Why Normalize |
|------|--------------|
| Large lists | Avoid duplicated nested objects |
| Shared entities | Update one entity in one place |
| Complex cache | Easier patching |
| Selection state | Store IDs instead of objects |
| Tree structures | Avoid deep cloning |
| Real-time updates | Patch by ID |

> Store relationships by ID. Store entity details once.

---

### 7. Move Expensive Work Out of the Hot Path

The hot path: render, scroll, typing, drag, real-time updates, polling, animation, large data processing.

```tsx
// ❌ Transform all items every render
{items.map((item) => (
  <Row label={expensiveFormat(item)} status={calculateStatus(item)} />
))}

// ✅ Pre-compute
const viewItems = useMemo(() =>
  items.map((item) => ({ id: item.id, label: formatLabel(item), status: computeStatus(item) })),
  [items]
)

// ✅✅ For very large lists — only visible items
const visibleItems = virtualItems.map((v) => {
  const item = items[v.index]
  return { id: item.id, label: formatLabel(item) }
})
```

> Do not repeatedly compute what can be computed once. Do not compute invisible data.

---

### 8. Use Lazy Materialization

Do not build full view objects before the user needs them.

```ts
// ❌ Build all, then slice
const allRows = allItems.map(buildViewRow)
const visible = allRows.slice(start, end)

// ✅ Build only visible
const visible = virtualItems.map((v) => buildViewRow(allItems[v.index]))
```

| Area | Lazy Strategy |
|------|---------------|
| Large list | Build only visible rows |
| Tree | Load children when expanded |
| Version history | Compute diff when selected |
| File manager | Read metadata when needed |
| Search | Build index when query starts |
| Chat/messages | Hydrate attachments when opened |
| Dashboard | Load widgets independently |

> Raw data can be large. View objects should be created only when needed.

---

### 9. Keep Identity Stable

Unstable object and function identities cause unnecessary renders.

```tsx
// ❌ New object + functions every render
<Row actions={{ onEdit: () => edit(id), onDelete: () => remove(id) }} />

// ✅ Stable callbacks + ID
const handleEdit = useCallback((id: string) => edit(id), [])
const handleDelete = useCallback((id: string) => remove(id), [])
<Row id={id} onEdit={handleEdit} onDelete={handleDelete} />
```

> Pass stable actions and IDs. Avoid creating new object props for every row on every render.

---

### 10. Treat Cache as a Trade-Off

Caching saves CPU but costs memory and complexity.

| Good Cache Candidate | Poor Cache Candidate |
|---------------------|---------------------|
| Filtering large arrays | Reading a primitive field |
| Sorting large arrays | Simple boolean check |
| Building search index | Small string concatenation |
| Computing diffs | Direct property access |
| Parsing large content | Tiny style object |
| Highlighting large text | One-line calculation |

```ts
// ❌ Memo cheap values
const title = useMemo(() => item.title, [item.title])

// ✅ Memo expensive work
const filtered = useMemo(() =>
  items.filter(n => n.title.includes(keyword)).sort((a, b) => b.updatedAt - a.updatedAt),
  [items, keyword]
)
```

> Cache only when repeated computation is more expensive than the memory and complexity of caching.

---

### 11. Prefer Composition When Features Are Dynamic

```ts
// ❌ God class with all behaviors
class WorkflowController {
  start() {}; stop() {}
  enableUpload() {}; enableRealtimeSync() {}
  enableTranslation() {}; enableExport() {}
}

// ✅ Plugin composition
type Feature = { name: string; setup(ctx: Context): void; dispose?(ctx: Context): void }
createWorkflowController({
  features: [coreFeature(), uploadFeature(), permissionFeature()],
})
```

> If behavior changes by context, prefer feature composition over a large class or monolithic controller.

---

### 12. Handle Breaking Changes Intentionally

```ts
// Phase 1: Add new API while keeping old API.
newApi.doSomething()

// Phase 2: Mark old API as deprecated.
oldApi.doSomething() // ⚠️ deprecated

// Phase 3: Migrate call sites gradually.

// Phase 4: Remove old API in a major refactor.
```

| Refactor Type | Safer Migration |
|---------------|-----------------|
| Large provider split | Extract read-only selectors first |
| Data normalization | Add adapter layer |
| Feature plugin system | Start with one feature |
| Cache refactor | Patch one query/domain first |
| Table/list engine change | Migrate one screen first |
| Controller split | Extract pure services before UI changes |

> A good optimization can still be a bad change if it breaks existing mental models without a migration path.

---

### 13. Optimize According to Scale

| Data Size | Recommended Approach |
|-----------|---------------------|
| < 100 items | Keep code simple |
| 100–1,000 | Use selectors and basic memoization |
| 1,000–10,000 | Normalize data and consider virtualization |
| 10,000+ | Use lazy materialization and indexing |
| 100,000+ | Consider server-side processing, chunking, pagination |

> The right optimization depends on scale. Small data rewards clarity. Large data rewards structure.

---

### 14. Reduce Waste Before Adding More Optimization

```ts
// ❌ Fat model + cache on top
const item = {
  id, value,
  getLabel: () => value.trim(),
  cachedLabel, cachedStatus, cachedSearchText,
}

// ✅ Lean model + separate derived cache
type Item = { id: string; value: string; status: string }
type ItemDerivedCache = { label?: string; searchText?: string }
const derivedCacheByItemId: Record<string, ItemDerivedCache> = {}
```

> Make the base model lean first. Add cache only after the waste is removed.

---

## Common Anti-Patterns

### Anti-Pattern 1: Fat Item Model

```ts
// ❌
const item = { id, data, metadata, permissions, user, workspace, actions, helpers, callbacks, cachedValues }

// ✅
const item = { id, userId, workspaceId, permissionId }
// Details in separate maps or services.
```

### Anti-Pattern 2: Monolithic Store

```ts
// ❌ Everything in one store
const state = { user, workspace, notes, folders, upload, recording, transcript, dialogs, search, filters, pagination, permissions }

// ✅ Separate slices
const recordingSlice = {}
const transcriptSlice = {}
const uploadSlice = {}
const dialogSlice = {}
```

### Anti-Pattern 3: Monolithic Hook

```ts
// ❌ One hook doing everything
function useFeatureController() {
  // fetching + state + upload + validation + permissions + dialogs + tracking + keyboard + realtime + cleanup
}

// ✅ Composed hooks or services
function useFeatureController() {
  useCoreFeature()
  usePermissionFeature()
  useDialogFeature()
  useTrackingFeature()
}
```

### Anti-Pattern 4: Rendering Does Too Much

```tsx
// ❌ Expensive work inline
return items.map((item) => (
  <Row label={expensiveFormat(item)} searchText={buildSearchText(item)} status={calculateStatus(item)} />
))

// ✅ Pre-compute
const viewItems = buildViewItems(items)
// Or build only visible items.
```

### Anti-Pattern 5: Invalidating Too Broadly

```ts
// ❌ Nuclear invalidation
queryClient.invalidateQueries()

// ✅ Targeted update
queryClient.setQueryData(['item', itemId], updatedItem)
queryClient.setQueryData(['items', workspaceId], (old) => patchItem(old, updatedItem))
```

> Update the smallest correct scope.

---

## Review Checklist

| Question | What It Reveals |
|----------|-----------------|
| Is this object created many times? | Potential memory bloat |
| Does each item hold functions? | Behavior duplication |
| Is nested data copied repeatedly? | Need normalization |
| Does this component subscribe to too much state? | Unnecessary re-renders |
| Is expensive work done during render? | Hot path problem |
| Are invisible items being processed? | Need lazy materialization |
| Are unused features initialized? | Need feature boundary |
| Are callbacks/objects recreated every render? | Identity instability |
| Is cache added before fixing data shape? | Wrong optimization order |
| Does this refactor break existing usage? | Need migration plan |
| Is the data size actually large enough? | Avoid over-engineering |
| Can this be measured? | Avoid guesswork |

---

## Recommended Response Template

When applying this philosophy, structure the answer as:

```md
## Diagnosis
The main issue is not [surface symptom].
The deeper issue is [object shape / state boundary / hot path / data duplication / feature coupling].

## Optimization Principles Involved
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

---

## Final Rule

Before suggesting `memo`, `useMemo`, `useCallback`, virtualization, caching, or server-side pagination, first check:

1. Is the data model too fat?
2. Is behavior duplicated per item?
3. Is state subscription too broad?
4. Is the hot path doing too much work?
5. Are unused features active?
6. Is the scale large enough to justify complexity?
7. Can the improvement be measured?

> The strongest optimization usually comes from changing the shape of the system, not from adding small performance patches.
