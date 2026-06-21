---
name: layer-architecture
description: Full file templates for each layer in the notex-interface feature module pattern
---

# Layer Architecture — Full Templates

## types/index.ts

```typescript
import { z } from 'zod';

// 1. Zod DTO schema — check actual API response format (may be camelCase or snake_case)
export const entityDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  is_active: z.boolean(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  created_at: z.string(),
});
export type EntityDto = z.infer<typeof entityDtoSchema>;

// 2. Domain model (camelCase, clean for UI use)
export interface Entity {
  id: string;
  name: string;
  isActive: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdAt: string;
}

// 3. Explicit transform — never inline-map in hooks
export const toEntity = (dto: EntityDto): Entity => ({
  id: dto.id,
  name: dto.name,
  isActive: dto.is_active,
  status: dto.status,
  createdAt: dto.created_at,
});

// 4. Param types
export interface EntityListParams {
  search?: string;
  status?: Entity['status'];
  page?: number;
  pageSize?: number;
}

export interface CreateEntityPayload { name: string }
export interface UpdateEntityPayload { name?: string; status?: Entity['status'] }

// 5. Normalization — strips falsy, trims strings
export function normalizeEntityListParams(p?: EntityListParams) {
  if (!p) return undefined;
  return Object.fromEntries(
    Object.entries(p)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]),
  );
}
```

## services/api.ts

Two patterns exist in the codebase. Use the one that matches your feature's needs.

### Pattern A — Zod-parsed (used by products, aspirational)

```typescript
import { axiosClient } from '@/shared/lib/http/axios-client';
import { entityDtoSchema, toEntity, normalizeEntityListParams } from '@/features/{name}/types';
import type { Entity, EntityListParams, CreateEntityPayload, UpdateEntityPayload } from '@/features/{name}/types';

// Helper — parse + map in one step
const parseEntity = (input: unknown): Entity => toEntity(entityDtoSchema.parse(input));
const parseEntities = (input: unknown): Entity[] => entityDtoSchema.array().parse(input).map(toEntity);

export const EntityApi = {
  async list(params?: EntityListParams): Promise<Entity[]> {
    // axiosClient interceptor returns response.data directly — do NOT destructure { data }
    const response = await axiosClient.get('/entities', { params: normalizeEntityListParams(params) });
    return parseEntities(response);
  },
  async getById(id: string): Promise<Entity> {
    const response = await axiosClient.get(`/entities/${id}`);
    return parseEntity(response);
  },
  async create(payload: CreateEntityPayload): Promise<Entity> {
    const response = await axiosClient.post('/entities', payload);
    return parseEntity(response);
  },
  async update(id: string, payload: UpdateEntityPayload): Promise<Entity> {
    const response = await axiosClient.patch(`/entities/${id}`, payload);
    return parseEntity(response);
  },
  async delete(id: string): Promise<void> {
    await axiosClient.delete(`/entities/${id}`);
  },
};
```

### Pattern B — TypeScript-typed (majority: folders, notes, meetings, etc.)

```typescript
import { axiosClient } from '@/shared/lib/http/axios-client';
import type { ResponseType } from '@/shared/types/api-contract.type';
import type { Entity, EntityListParams, CreateEntityPayload } from '@/features/{name}/types';

export const EntityApi = {
  async list(params?: EntityListParams) {
    // ResponseType<T> = { status, message, data: T }
    // axiosClient returns response.data directly, so this returns ResponseType<Entity[]>
    return axiosClient.get<ResponseType<Entity[]>>('/entities', {
      apiVersion: 'v2',
      params,
    });
  },
  async getById(id: string) {
    return axiosClient.get<ResponseType<Entity>>(`/entities/${id}`, { apiVersion: 'v2' });
  },
  async create(payload: CreateEntityPayload) {
    return axiosClient.post<ResponseType<Entity>>('/entities', payload, { apiVersion: 'v2' });
  },
  async delete(id: string) {
    return axiosClient.delete<ResponseType<null>>(`/entities/${id}`, { apiVersion: 'v2' });
  },
};
```

> When using Pattern B, consumers access data via `response.data` where `response` is `ResponseType<T>`.

## keys.ts

```typescript
import { createQueryKey, normalizeQueryParams } from '@/shared/query/keys';
import { normalizeEntityListParams } from './types';
import type { EntityListParams } from './types';

const entityKeyBase = createQueryKey('entity');

export const entityKeys = {
  all: () => entityKeyBase,
  detail: (id: string) => createQueryKey(...entityKeyBase, 'detail', id),
  list: (params?: EntityListParams) =>
    createQueryKey(...entityKeyBase, 'list', normalizeQueryParams(normalizeEntityListParams(params) ?? {})),
};
```

## queries.ts

```typescript
import {{ useQuery }} from '@/shared/query/useQuery';
import {{ EntityApi }} from '@/features/{name}/services/api';
import {{ entityKeys }} from '@/features/{name}/keys';
import type {{ Entity, EntityListParams }} from '@/features/{name}/types';
import type {{ ResponseType }} from '@/shared/types/api-contract.type';

const STALE = 5 * 60 * 1000;

type EntityListResponse = ResponseType<Entity[]>;
type EntityDetailResponse = ResponseType<Entity>;

export const useEntityList = (params?: EntityListParams, enabled = true) =>
  useQuery<EntityListResponse>({{
    queryKey: entityKeys.list(params),
    queryFn: () => EntityApi.list(params),
    staleTime: STALE,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled,
  }});

export const useEntityDetail = (id?: string | null, enabled = true) => {{
  return useQuery<EntityDetailResponse>({{
    queryKey: entityKeys.detail(id ?? ''),
    queryFn: () => {{
      if (!id) throw new Error('Entity id is required to fetch detail.');
      return EntityApi.getById(id);
    }},
    staleTime: STALE,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: enabled && !!id,
  }});
}};
```

## store.ts

```typescript
import { create } from 'zustand';

interface EntityUiState {
  selectedId: string | null;
  isFilterOpen: boolean;
  sort: 'name-asc' | 'name-desc' | 'created-desc';
}
interface EntityUiActions {
  setSelectedId: (id: string | null) => void;
  setFilterOpen: (v: boolean) => void;
  setSort: (s: EntityUiState['sort']) => void;
  reset: () => void;
}

const initial: EntityUiState = { selectedId: null, isFilterOpen: false, sort: 'name-asc' };

export const useEntityStore = create<EntityUiState & EntityUiActions>()((set) => ({
  ...initial,
  setSelectedId: (id) => set({ selectedId: id }),
  setFilterOpen: (v) => set({ isFilterOpen: v }),
  setSort: (s) => set({ sort: s }),
  reset: () => set(initial),
}));
```

## index.ts

```typescript
// Re-export all public APIs — consumers import only from this file
export * from './types';
export * from './keys';
export * from './queries';
export * from './mutations';
export { useEntityStore } from './store';
```
