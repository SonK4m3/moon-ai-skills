import os
import argparse
from pathlib import Path
import re

def to_camel_case(snake_str):
    components = snake_str.split('-')
    return components[0] + ''.join(x.title() for x in components[1:])

def to_pascal_case(snake_str):
    return ''.join(x.title() for x in snake_str.split('-'))

def create_file(path: Path, content: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_text(content.strip() + '\n', encoding='utf-8')
        print(f"[+] Created: {path}")
    else:
        print(f"[-] Skipped (already exists): {path}")

def scaffold_feature(name: str, level: str, base_dir: Path):
    feature_dir = base_dir / "features" / name
    
    camel_name = to_camel_case(name)
    pascal_name = to_pascal_case(name)
    
    # 1. types/index.ts
    types_content = f"""
import {{ z }} from 'zod';

export const {camel_name}DtoSchema = z.object({{
  id: z.string(),
  name: z.string(),
}});
export type {pascal_name}Dto = z.infer<typeof {camel_name}DtoSchema>;

export interface {pascal_name} {{
  id: string;
  name: string;
}}

export const to{pascal_name} = (dto: {pascal_name}Dto): {pascal_name} => ({{
  id: dto.id,
  name: dto.name,
}});

export interface {pascal_name}ListParams {{
  search?: string;
  page?: number;
  pageSize?: number;
}}

export interface Create{pascal_name}Payload {{ name: string }}
export interface Update{pascal_name}Payload {{ name?: string }}

export function normalize{pascal_name}ListParams(p?: {pascal_name}ListParams) {{
  if (!p) return undefined;
  return Object.fromEntries(
    Object.entries(p)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]),
  );
}}
"""
    create_file(feature_dir / "types" / "index.ts", types_content)

    # 2. services/api.ts (Pattern B - default for most features)
    api_content = f"""
import {{ axiosClient }} from '@/shared/lib/http/axios-client';
import type {{ ResponseType }} from '@/shared/types/api-contract.type';
import type {{ {pascal_name}, {pascal_name}ListParams, Create{pascal_name}Payload, Update{pascal_name}Payload }} from '@/features/{name}/types';

export const {pascal_name}Api = {{
  async list(params?: {pascal_name}ListParams) {{
    return axiosClient.get<ResponseType<{pascal_name}[]>>('/{name}s', {{
      apiVersion: 'v2',
      params,
    }});
  }},
  async getById(id: string) {{
    return axiosClient.get<ResponseType<{pascal_name}>>(`/{name}s/${{id}}`, {{ apiVersion: 'v2' }});
  }},
"""
    if level in ["L2", "L3"]:
        api_content += f"""  async create(payload: Create{pascal_name}Payload) {{
    return axiosClient.post<ResponseType<{pascal_name}>>('/{name}s', payload, {{ apiVersion: 'v2' }});
  }},
  async update(id: string, payload: Update{pascal_name}Payload) {{
    return axiosClient.patch<ResponseType<{pascal_name}>>(`/{name}s/${{id}}`, payload, {{ apiVersion: 'v2' }});
  }},
  async delete(id: string) {{
    return axiosClient.delete<ResponseType<null>>(`/{name}s/${{id}}`, {{ apiVersion: 'v2' }});
  }},
"""
    api_content += "};\n"
    create_file(feature_dir / "services" / "api.ts", api_content)

    # 3. keys.ts
    keys_content = f"""
import {{ createQueryKey, normalizeQueryParams }} from '@/shared/query/keys';
import {{ normalize{pascal_name}ListParams }} from '@/features/{name}/types';
import type {{ {pascal_name}ListParams }} from '@/features/{name}/types';

const {camel_name}KeyBase = createQueryKey('{name}');

export const {camel_name}Keys = {{
  all: () => {camel_name}KeyBase,
  detail: (id: string) => createQueryKey(...{camel_name}KeyBase, 'detail', id),
  list: (params?: {pascal_name}ListParams) =>
    createQueryKey(...{camel_name}KeyBase, 'list', normalizeQueryParams(normalize{pascal_name}ListParams(params) ?? {{}})),
}};
"""
    create_file(feature_dir / "keys.ts", keys_content)

    # 4. queries.ts
    queries_content = f"""
import {{ useQuery }} from '@/shared/query/useQuery';
import {{ {pascal_name}Api }} from '@/features/{name}/services/api';
import {{ {camel_name}Keys }} from '@/features/{name}/keys';
import type {{ {pascal_name}, {pascal_name}ListParams }} from '@/features/{name}/types';
import type {{ ResponseType }} from '@/shared/types/api-contract.type';

const STALE = 5 * 60 * 1000;

type {pascal_name}ListResponse = ResponseType<{pascal_name}[]>;
type {pascal_name}DetailResponse = ResponseType<{pascal_name}>;

export const use{pascal_name}List = (params?: {pascal_name}ListParams, enabled = true) =>
  useQuery<{pascal_name}ListResponse>({{
    queryKey: {camel_name}Keys.list(params),
    queryFn: () => {pascal_name}Api.list(params),
    staleTime: STALE,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled,
  }});

export const use{pascal_name}Detail = (id?: string | null, enabled = true) => {{
  return useQuery<{pascal_name}DetailResponse>({{
    queryKey: {camel_name}Keys.detail(id ?? ''),
    queryFn: () => {{
      if (!id) throw new Error('{pascal_name} id is required to fetch detail.');
      return {pascal_name}Api.getById(id);
    }},
    staleTime: STALE,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: enabled && !!id,
  }});
}};
"""
    create_file(feature_dir / "queries.ts", queries_content)

    # 5. mutations.ts (Only for L2/L3)
    if level in ["L2", "L3"]:
        mutations_content = f"""
import {{ useMutation, useQueryClient }} from '@tanstack/react-query';
import {{ {pascal_name}Api }} from '@/features/{name}/services/api';
import {{ {camel_name}Keys }} from '@/features/{name}/keys';
import type {{ Create{pascal_name}Payload, Update{pascal_name}Payload }} from '@/features/{name}/types';

export const use{pascal_name}Mutations = () => {{
  const queryClient = useQueryClient();

  const create{pascal_name} = useMutation({{
    mutationFn: (payload: Create{pascal_name}Payload) => {pascal_name}Api.create(payload),
    onSuccess: () => {{
      queryClient.invalidateQueries({{ queryKey: {camel_name}Keys.all() }});
    }},
  }});

  const update{pascal_name} = useMutation({{
    mutationFn: ({{ id, payload }}: {{ id: string; payload: Update{pascal_name}Payload }}) =>
      {pascal_name}Api.update(id, payload),
    onSuccess: (_, variables) => {{
      queryClient.invalidateQueries({{ queryKey: {camel_name}Keys.detail(variables.id) }});
      queryClient.invalidateQueries({{ queryKey: {camel_name}Keys.list() }});
    }},
  }});

  const delete{pascal_name} = useMutation({{
    mutationFn: (id: string) => {pascal_name}Api.delete(id),
    onSuccess: () => {{
      queryClient.invalidateQueries({{ queryKey: {camel_name}Keys.all() }});
    }},
  }});

  return {{
    create{pascal_name},
    update{pascal_name},
    delete{pascal_name},
  }};
}};
"""
        create_file(feature_dir / "mutations.ts", mutations_content)

    # 6. store.ts
    store_content = f"""
import {{ create }} from 'zustand';

interface {pascal_name}UiState {{
  selectedId: string | null;
  isFilterOpen: boolean;
}}
interface {pascal_name}UiActions {{
  setSelectedId: (id: string | null) => void;
  setFilterOpen: (v: boolean) => void;
  reset: () => void;
}}

const initial: {pascal_name}UiState = {{ selectedId: null, isFilterOpen: false }};

export const use{pascal_name}Store = create<{pascal_name}UiState & {pascal_name}UiActions>()((set) => ({{
  ...initial,
  setSelectedId: (id) => set({{ selectedId: id }}),
  setFilterOpen: (v) => set({{ isFilterOpen: v }}),
  reset: () => set(initial),
}}));
"""
    create_file(feature_dir / "store.ts", store_content)

    # 7. index.ts
    index_content = f"""
export * from './types';
export * from './keys';
export * from './queries';
"""
    if level in ["L2", "L3"]:
        index_content += "export * from './mutations';\n"
    index_content += f"export {{ use{pascal_name}Store }} from './store';\n"
    
    create_file(feature_dir / "index.ts", index_content)

    print(f"\n[*] Successfully scaffolded '{name}' at level {level} in {feature_dir}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scaffold a new feature module using the 5-layer pattern.")
    parser.add_argument("--name", required=True, help="Feature name (kebab-case, e.g., 'invoice-detail')")
    parser.add_argument("--level", choices=["L1", "L2", "L3"], default="L2", help="Complexity level (default: L2)")
    parser.add_argument("--dir", default=".", help="Base project directory (default: current directory)")
    
    args = parser.parse_args()
    
    # Validate kebab case
    if not re.match(r'^[a-z0-9-]+$', args.name):
        print("[!] Error: Feature name must be kebab-case (e.g., 'user-profile')")
        exit(1)
        
    scaffold_feature(args.name, args.level, Path(args.dir))
