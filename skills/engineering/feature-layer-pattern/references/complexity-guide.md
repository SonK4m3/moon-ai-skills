---
name: complexity-guide
description: L1/L2/L3 complexity levels and advanced patterns for feature modules (optimistic updates, pagination, file upload, real-time)
---

# Complexity Guide

## L1 — Read-Only Catalog

Skip `mutations.ts` entirely. Store is minimal (selected item, filter open).

No additional patterns needed beyond the quick-start in SKILL.md.

---

## L2 — Basic CRUD

Use `onSettled` invalidation only — no optimistic updates.

```typescript
// mutations.ts (L2 — all 3 mutations)
export function useUpdateEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateEntityPayload }) =>
      EntityApi.update(id, payload),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: entityKeys.detail(id) });
      qc.invalidateQueries({ queryKey: entityKeys.list() });
    },
  });
}

export function useDeleteEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: EntityApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: entityKeys.all() }),
  });
}
```

> Error handling: use `showErrorToast(err, 'fallback.key', t)` at the component level. See `references/mutation-patterns.md`.

---

## L3 — Complex Interactions

### Optimistic Updates (instant feedback)

Use when: list reordering, toggle switches, actions that must feel instant.

```typescript
export function useToggleEntity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      EntityApi.update(id, { isActive }),
    onMutate: async ({ id, isActive }) => {
      await qc.cancelQueries({ queryKey: entityKeys.list() })
      const snapshot = qc.getQueryData(entityKeys.list())
      qc.setQueryData(entityKeys.list(), (prev: Entity[]) =>
        prev.map((e) => (e.id === id ? { ...e, isActive } : e))
      )
      return { snapshot }
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData(entityKeys.list(), ctx?.snapshot);
      // Error toast handled at component level via showErrorToast()
    },
    onSettled: () => qc.invalidateQueries({ queryKey: entityKeys.list() }),
  })
}
```

### Pagination

Add `page` + `pageSize` to `EntityListParams`. Use `keepPreviousData` to prevent flicker.

```typescript
import { useQuery } from '@/shared/query/useQuery';
import { keepPreviousData } from '@tanstack/react-query';

export const useEntityList = (params?: EntityListParams, enabled = true) =>
  useQuery({
    queryKey: entityKeys.list(params),
    queryFn: () => EntityApi.list(params),
    staleTime: STALE,
    enabled,
    placeholderData: keepPreviousData,  // prevents blank state on page change
  });
```

Key factory must include page in the key — already handled by `normalizeEntityListParams`.

### Search with Debounce

Never pass raw input directly to `useEntityList`. Always debounce first.

```typescript
// in the component
const [input, setInput] = useState('')
const debouncedSearch = useDebounce(input, 300)
const { data } = useEntityList({ search: debouncedSearch })
```

### File Upload (e.g. entity image)

Pattern: validate → presigned URL → S3 PUT → PATCH entity.

```typescript
async function uploadEntityImage(id: string, file: File) {
  // 1. validate
  if (!file.type.startsWith('image/')) throw new Error('Invalid file type')
  if (file.size > 5 * 1024 * 1024) throw new Error('Max 5MB')
  // 2. presigned URL
  const { url, key } = await EntityApi.getUploadUrl(id)
  // 3. S3 upload
  await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
  // 4. update entity with key
  await EntityApi.update(id, { imageKey: key })
}
```

Reference: `features/setting` (avatar upload) and `features/auth` for presigned URL pattern.

### Persistent UI State (layout preference)

Use Zustand `persist` middleware with hydration guard to avoid SSR mismatch.

```typescript
export const useEntityStore = create<State & Actions>()(
  persist(
    (set) => ({ layout: 'grid', setLayout: (l) => set({ layout: l }) }),
    { name: 'entity-ui', skipHydration: true }
  )
)
// In component: useEffect(() => useEntityStore.persist.rehydrate(), [])
```

Reference: `features/folders` Zustand store for full hydration guard pattern.

### Real-time / SSE

Only implement if user explicitly requests live updates. Reference `features/meetings`
`useTrackingMeetingBot` for SSE reconnect pattern with max-retry logic.

---

## Upgrade Checklist: L2 → L3

- User reports lag on toggle/reorder → add optimistic updates
- List has >20 items → add pagination + `keepPreviousData`
- Search fires on every keystroke → add debounce
- Feature needs image/file → add upload orchestration
- Data changes without user action → add SSE/polling
