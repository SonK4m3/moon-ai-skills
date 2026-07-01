# Optimization Examples

Practical code examples for each optimization principle. Each category has 3 examples showing wrong → right patterns.

Foundation: TanStack Table v9 reduced ~90% retained JS heap by moving row/cell/column/header behavior to shared prototypes instead of per-instance methods. Virtualization alone only reduces DOM/render — it does not reduce JS heap if the engine still processes all data.

---

## 1. Share Behavior, Isolate Data

Object appears many times → keep only data. Logic belongs in shared helper/service/prototype.

### Example 1: List item

```ts
// ❌ Per-instance methods (50k items = 100k functions)
const items = rawItems.map((item) => ({
  id: item.id,
  name: item.name,
  status: item.status,
  getLabel: () => item.name.trim(),
  isActive: () => item.status === 'active',
}))

// ✅ Data-only items + shared logic
type Item = { id: string; name: string; status: 'active' | 'inactive' }

const itemLogic = {
  getLabel(item: Item) { return item.name.trim() },
  isActive(item: Item) { return item.status === 'active' },
}

const items = rawItems.map((item) => ({
  id: item.id,
  name: item.name,
  status: item.status,
}))
```

### Example 2: File manager

```ts
// ❌
const files = rawFiles.map((file) => ({
  id: file.id,
  path: file.path,
  size: file.size,
  getSizeLabel: () => formatBytes(file.size),
  getExtension: () => file.path.split('.').at(-1),
  canPreview: () => isPreviewable(file.path),
}))

// ✅
type FileItem = { id: string; path: string; size: number }

const fileLogic = {
  getSizeLabel(file: FileItem) { return formatBytes(file.size) },
  getExtension(file: FileItem) { return file.path.split('.').at(-1) },
  canPreview(file: FileItem) { return isPreviewable(file.path) },
}
```

### Example 3: Task/workflow item

```ts
// ❌
const tasks = rawTasks.map((task) => ({
  id: task.id,
  status: task.status,
  dueDate: task.dueDate,
  isOverdue: () => Date.now() > task.dueDate,
  canRetry: () => task.status === 'failed',
}))

// ✅
type Task = { id: string; status: 'pending' | 'running' | 'failed' | 'done'; dueDate: number }

const taskLogic = {
  isOverdue(task: Task) { return Date.now() > task.dueDate },
  canRetry(task: Task) { return task.status === 'failed' },
}
```

---

## 2. Avoid Per-item Closures

Don't create a new function for every item. One function × 10,000 items = 10,000 closures.

### Example 1: Row actions

```tsx
// ❌ New closure per row
{members.map((member) => (
  <MemberRow
    key={member.id}
    member={member}
    onEdit={() => editMember(member.id)}
    onDelete={() => deleteMember(member.id)}
  />
))}

// ✅ Stable handler + ID
{members.map((member) => (
  <MemberRow
    key={member.id}
    memberId={member.id}
    onEdit={handleEditMember}
    onDelete={handleDeleteMember}
  />
))}

function handleEditMember(memberId: string) { editMember(memberId) }
function handleDeleteMember(memberId: string) { deleteMember(memberId) }
```

### Example 2: Menu actions

```ts
// ❌ Closures per item
const rows = items.map((item) => ({
  ...item,
  actions: [
    { label: 'Edit', onClick: () => edit(item.id) },
    { label: 'Archive', onClick: () => archive(item.id) },
  ],
}))

// ✅ Shared action definitions
const rowActions = [
  { label: 'Edit', run: (id: string) => edit(id) },
  { label: 'Archive', run: (id: string) => archive(id) },
]

const rows = items.map((item) => ({ id: item.id, title: item.title }))
```

### Example 3: Form field validators

```ts
// ❌ Closure per field
const fields = schema.map((field) => ({
  name: field.name,
  label: field.label,
  validate: (value: unknown) => validateByRule(field.rule, value),
}))

// ✅ Shared validation function
type Field = { name: string; label: string; rule: ValidationRule }

function validateField(field: Field, value: unknown) {
  return validateByRule(field.rule, value)
}
```

---

## 3. Lazy Materialization

Don't build view models for data the user hasn't seen yet.

### Example 1: Virtual list

```ts
// ❌ Build all, then slice
const allViewRows = allRows.map((row) => buildViewRow(row))
const visibleRows = allViewRows.slice(startIndex, endIndex)

// ✅ Build only visible
const visibleRows = virtualItems.map((virtualItem) => {
  const row = allRows[virtualItem.index]
  return buildViewRow(row)
})
```

### Example 2: Tree/folder

```ts
// ❌ Build entire deep tree upfront
const tree = buildFullTree(allNodes)

// ✅ Load children on expand
function getVisibleChildren(parentId: string) {
  const childIds = childrenByParentId[parentId] ?? []
  return childIds.map((id) => nodesById[id])
}
```

### Example 3: Detail panel

```ts
// ❌ Pre-compute heavy detail for all items
const items = rawItems.map((item) => ({
  ...item,
  detail: buildHeavyDetail(item),
}))

// ✅ Compute on demand
function openDetail(itemId: string) {
  const item = itemsById[itemId]
  return buildHeavyDetail(item)
}
```

---

## 4. Pay for What You Use

Core should be small. Features should be pluggable. Only enable what the screen needs.

### Example 1: Table

```ts
// ❌ Enable everything
createTable({
  data, columns,
  enableSorting: true, enableFiltering: true, enableGrouping: true,
  enablePinning: true, enableRowSelection: true, enableColumnResizing: true,
})

// ✅ Opt-in features
createTable({
  data, columns,
  features: [sortingFeature(), filteringFeature(), paginationFeature()],
})
```

### Example 2: Editor

```ts
// ❌
createEditor({
  enableMarkdown: true, enableMentions: true, enableAI: true,
  enableTables: true, enableComments: true, enableCollaboration: true,
})

// ✅
createEditor({
  features: [markdownFeature(), mentionsFeature(), aiAssistFeature()],
})
```

### Example 3: Upload workflow

```ts
// ❌
createUploader({
  enableChunkUpload: true, enableImageCompress: true, enableVirusScan: true,
  enableAudioTranscode: true, enableRetry: true, enableLocalMapping: true,
})

// ✅
createUploader({
  features: [chunkUploadFeature(), retryFeature(), localMappingFeature()],
})
```

---

## 5. Fine-grained Subscription

Component should subscribe only to the state slice it renders.

### Example 1: Timer

```tsx
// ❌ Subscribe to entire store
const recordState = useRecordStore()
return <Timer value={recordState.duration} />

// ✅ Subscribe to slice
const duration = useRecordStore((s) => s.duration)
return <Timer value={duration} />
```

### Example 2: Dialog

```tsx
// ❌
const appState = useAppStore()
return <Dialog name={appState.activeDialog} />

// ✅
const activeDialog = useAppStore((s) => s.activeDialog)
return <Dialog name={activeDialog} />
```

### Example 3: Selection toolbar

```tsx
// ❌
const tableState = useTableStore()
return <Toolbar selectedCount={tableState.selectedIds.length} />

// ✅
const selectedCount = useTableStore((s) => s.selectedIds.length)
return <Toolbar selectedCount={selectedCount} />
```

---

## 6. Normalize Data

Large lists should not duplicate nested objects. Store entity once, reference by ID.

### Example 1: Notes/users

```ts
// ❌ Nested duplication
const notes = [{
  id: 'note_1', title: 'Meeting note',
  owner: { id: 'user_1', name: 'Moon', avatar: '...' },
}]

// ✅ Normalized
const notesById = { note_1: { id: 'note_1', title: 'Meeting note', ownerId: 'user_1' } }
const usersById = { user_1: { id: 'user_1', name: 'Moon', avatar: '...' } }
```

### Example 2: Comments/authors

```ts
// ❌
const comments = rawComments.map((comment) => ({
  id: comment.id, body: comment.body, author: comment.author,
}))

// ✅
const commentsById = { c1: { id: 'c1', body: 'Good idea', authorId: 'u1' } }
const authorsById = { u1: { id: 'u1', name: 'Alex' } }
```

### Example 3: Files/tags

```ts
// ❌
const files = [{
  id: 'file_1', name: 'report.pdf',
  tags: [{ id: 'tag_1', name: 'Work' }, { id: 'tag_2', name: 'PDF' }],
}]

// ✅
const filesById = { file_1: { id: 'file_1', name: 'report.pdf', tagIds: ['tag_1', 'tag_2'] } }
const tagsById = { tag_1: { id: 'tag_1', name: 'Work' }, tag_2: { id: 'tag_2', name: 'PDF' } }
```

---

## 7. Cache Only When Measured

`useMemo`/`useCallback` are performance optimizations, not logic fixes. If code doesn't work without memo, fix the root cause first.

### Example 1: Don't memo cheap values

```ts
// ❌ Pointless memo
const title = useMemo(() => item.title, [item.title])
const isActive = useMemo(() => item.status === 'active', [item.status])

// ✅ Direct access
const title = item.title
const isActive = item.status === 'active'
```

### Example 2: Memo expensive filter/sort

```ts
// ❌ Recompute every render
const visibleItems = items
  .filter((item) => item.name.includes(keyword))
  .sort((a, b) => b.updatedAt - a.updatedAt)

// ✅ Memoize expensive work
const visibleItems = useMemo(() => {
  return items
    .filter((item) => item.name.includes(keyword))
    .sort((a, b) => b.updatedAt - a.updatedAt)
}, [items, keyword])
```

### Example 3: Memo handler passed to heavy child

```tsx
// ❌ New function every render
<HeavyChild onSubmit={(value) => submitForm(value)} />

// ✅ Stable reference
const handleSubmit = useCallback((value: FormValue) => {
  submitForm(value)
}, [])

<HeavyChild onSubmit={handleSubmit} />
```

---

## 8. Scale-aware Optimization

Match complexity to actual data size. Don't over-engineer small data.

### Example 1: Small list (< 100 items)

```ts
// ✅ Keep it simple
const rows = items.map((item) => ({
  id: item.id,
  label: item.name,
  status: item.status,
}))
```

No plugin engine needed.

### Example 2: Medium list (100–1,000 items)

```ts
// ✅ Add memo where it helps
const filteredRows = useMemo(() => {
  return rows.filter((row) => row.label.includes(keyword))
}, [rows, keyword])
```

### Example 3: Large list (10,000+ items)

```ts
// ✅ Normalize + virtualize + lazy build
const rowsById: Record<string, Row> = {}
const rowIds: string[] = []

for (const row of rawRows) {
  rowsById[row.id] = { id: row.id, label: row.label, status: row.status }
  rowIds.push(row.id)
}

const visibleRows = virtualItems.map((virtualItem) => {
  const id = rowIds[virtualItem.index]
  return rowsById[id]
})
```

---

## Quick Reference

| Principle | When to apply |
|-----------|---------------|
| Share behavior, isolate data | Many items/rows/nodes/messages |
| Avoid per-item closures | List with many actions/handlers |
| Lazy materialization | User sees only part of the data |
| Pay for what you use | Module with optional features |
| Fine-grained subscription | Large store, many components |
| Normalize data | Entity duplicated across items |
| Cache only when measured | Computation is truly expensive |
| Scale-aware optimization | Avoid over-engineering small data |

## Final Check

Before suggesting memoization, caching, virtualization, or server-side processing, first check:
- Object shape and duplicated behavior
- State subscription scope
- Feature boundaries
- Whether the data scale actually justifies the complexity
