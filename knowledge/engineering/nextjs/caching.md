# Next.js Caching

Next.js implements aggressive caching to maximize performance and reduce origin server load. Understanding these layers is key to avoiding stale state and build-time issues.

## Caching Mechanisms

| Cache | What | Where | Lifetime | Purpose |
| :--- | :--- | :---: | :---: | :--- |
| **Request Memoization** | Deduplicates `fetch` calls with matching URLs/options. | Server | Single request | Share data across the component tree. |
| **Data Cache** | Stores response data across user requests and deployments. | Server | Persistent (configurable) | Reduce origin API/DB load. |
| **Full Route Cache** | HTML and RSC payload generated at build time. | Server | Persistent (invalidated on revalidation) | Serve static pages instantly. |
| **Router Cache** | Client-side cache of visited/prefetched pages. | Client | Session (cleared on refresh) | Instant navigation transitions. |

## Data Invalidation (Revalidation)

### 1. Time-based Revalidation

Automatically invalidates cached data after a specific duration.

```typescript
fetch('https://api.example.com/data', { next: { revalidate: 3600 } }); // 1 hour
```

### 2. On-Demand Revalidation

Manually trigger revalidation based on specific events (e.g., webhook or Server Action).

* **`revalidatePath(path)`**: Invalidates cached data and routes matching the given path.
* **`revalidateTag(tag)`**: Invalidates fetch cache entries tagged with the matching key.

```typescript
// Tagged fetch
fetch('https://api.example.com/posts', { next: { tags: ['posts'] } });

// Revalidation Action
'use server';
import { revalidateTag } from 'next/cache';

export async function clearPostsCache() {
  revalidateTag('posts');
}
```

## Opting Out of Caching

To ensure data is always fresh (Dynamic Rendering):

* Use `const dynamic = 'force-dynamic'` or `revalidate = 0` configuration options.
* Use dynamic functions like `headers()`, `cookies()`, or read search parameters.
* Set cache options on fetch to `'no-store'`.
