# Next.js Server Actions

Server Actions are asynchronous functions that run on the server. They can be defined in Server Components or imported from separate files using the `'use server'` directive. They enable seamless client-server communications without manual API endpoints.

## Core Usage

### Form Submission

Server Actions integrate natively with HTML `<form>` elements to enable progressive enhancement (working even before JavaScript loads).

```tsx
// actions.ts
'use server';

import { redirect } from 'next/navigation';

export async function createPost(formData: FormData) {
  const title = formData.get('title');
  const content = formData.get('content');

  // 1. Validate inputs
  // 2. Perform DB operations
  // 3. Revalidate path/tag
  
  redirect('/posts');
}
```

## State and Hooks

### `useActionState` (formerly `useFormState`)

Used to manage action pending state and retrieve the returned value or error from a Server Action.

```tsx
'use client';

import { useActionState } from 'react';
import { createPost } from './actions';

export default function PostForm() {
  const [state, formAction, isPending] = useActionState(createPost, null);

  return (
    <form action={formAction}>
      <input name="title" required />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : 'Submit'}
      </button>
      {state?.error && <p className="error">{state.error}</p>}
    </form>
  );
}
```

## Best Practices & Security

1. **Input Validation**: Never trust client inputs. Always validate `FormData` or JSON inputs using validation libraries like `zod` inside the Server Action.
2. **Authentication & Authorization**: Always verify user authentication and check permissions *inside* the Server Action body, even if the UI page itself is guarded.
3. **Error Handling**: Do not throw raw database or systems errors to the client. Catch them internally and return user-friendly, sanitised error structures.
