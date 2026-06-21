---
name: mutation-patterns
description: CRUD mutation hooks with cache invalidation strategy for notex-interface feature modules
---

# Mutation Patterns

## Full CRUD — mutations.ts

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { EntityApi } from '@/features/{name}/services/api';
import { entityKeys } from '@/features/{name}/keys';
import type { CreateEntityPayload, UpdateEntityPayload } from '@/features/{name}/types';

export const useEntityMutations = () => {
  const queryClient = useQueryClient();

  const createEntity = useMutation({
    mutationFn: (payload: CreateEntityPayload) => EntityApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entityKeys.all() });
    },
  });

  const updateEntity = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateEntityPayload }) =>
      EntityApi.update(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: entityKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: entityKeys.list() });
    },
  });

  const deleteEntity = useMutation({
    mutationFn: (id: string) => EntityApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entityKeys.all() });
    },
  });

  return {
    createEntity,
    updateEntity,
    deleteEntity,
  };
};
```

> **Error handling:** Do NOT put `toast.error()` in mutation hooks. Handle errors at the component level where you have access to the i18n `t` function. See "Error Handling in Component" below.

## Cache Invalidation Decision Table

| Mutation | Why | Keys to invalidate |
| -------- | --- | ------------------ |
| create | New item appears in list | `entityKeys.all()` |
| update | Detail + list both stale | `entityKeys.detail(id)` + `entityKeys.list()` |
| delete | Item gone from list + detail invalid | `entityKeys.all()` |
| bulk move/update | Multiple lists affected | `entityKeys.all()` |

Use `entityKeys.all()` (broad) when in doubt — safer than missing a stale list.
Use targeted keys (detail + list) for update to avoid re-fetching unrelated queries.

## Error Handling in Component

The project uses i18n-aware error handling. Always handle errors at the component level:

```typescript
import { showErrorToast } from '@/shared/lib/helper/error';
import { useTranslation } from 'react-i18next';

function EntityForm({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('common');
  const { createEntity, isPending } = useEntityMutations();

  const handleSubmit = (payload: CreateEntityPayload) => {
    createEntity(payload, {
      onSuccess: () => onClose(),
      onError: (err) => showErrorToast(err, 'entity.create_failed', t),
    });
  };

  return <button disabled={isPending}>Save</button>;
}
```

> `onSuccess`/`onError` callbacks passed at call-site run **in addition to** hook-level ones. Use call-site for navigation/modal close logic.

## Duplicate Check Before Create

Pattern from `features/folders` — check for duplicates before API call:

```typescript
export function useCreateEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateEntityPayload) => {
      // client-side guard — avoids unnecessary round-trip
      const existing = qc.getQueryData<Entity[]>(entityKeys.list());
      if (existing?.some((e) => e.name.toLowerCase() === payload.name.toLowerCase())) {
        throw new Error('An entity with this name already exists');
      }
      return EntityApi.create(payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: entityKeys.all() }),
  });
}
```
