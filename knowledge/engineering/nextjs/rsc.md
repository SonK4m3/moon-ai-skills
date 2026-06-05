# React Server Components (RSC)

React Server Components represent a paradigm shift in how we build React applications, splitting rendering work between the server and the client to optimize performance and developer experience.

## Core Concepts

* **Server Components**: Rendered exclusively on the server. Their dependencies (libraries, data-fetching helpers) are not sent to the client bundle. By default, all components in the Next.js App Router are Server Components.
* **Client Components**: Pre-rendered on the server (SSR) and hydrated on the client. They have access to client-side state (`useState`, `useEffect`), browser APIs, and event listeners. Enabled using the `'use client'` directive at the top of the file.

## Choosing Between Server & Client Components

| Feature / Capability | Server Component | Client Component |
| :--- | :---: | :---: |
| Retrieve data from source (DB, API) directly | ✅ | ❌ |
| Keep sensitive keys/tokens secure on the server | ✅ | ❌ |
| Reduce client-side bundle size | ✅ | ❌ |
| Use interactivity and event listeners (`onClick`, etc.) | ❌ | ✅ |
| Use state and lifecycle hooks (`useState`, `useEffect`) | ❌ | ✅ |
| Use browser-only APIs (localStorage, geolocation) | ❌ | ✅ |

## Design Patterns

### 1. Leaf Component Pattern

Keep Client Components at the leaves of your component tree. For example, a static article page should be a Server Component, but the interactive "Like Button" inside it should be a Client Component.

### 2. Passing Server Components to Client Components as Props

Since Server Components cannot be imported directly into Client Components, pass them as `children` or standard component props to nest them.

```tsx
// Correct Composition Pattern
// ClientComponent.tsx
'use client';
export default function ClientComponent({ children }: { children: React.ReactNode }) {
  return <div className="interactive-wrapper">{children}</div>;
}

// Page.tsx (Server Component)
import ClientComponent from './ClientComponent';
import ServerComponent from './ServerComponent';

export default function Page() {
  return (
    <ClientComponent>
      <ServerComponent />
    </ClientComponent>
  );
}
```
