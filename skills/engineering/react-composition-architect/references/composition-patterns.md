# React Composition Patterns Guide

This guide details implementation patterns and code examples for each level of the Progressive Composition Ladder.

---

## Level 1: Plain Props

Use plain props for components with a clear, single responsibility and a stable API layout.

### Recommended Usage
* Component has one main visual representation.
* Small, predictable prop interface.
* Caller does not need to rearrange or customize internal DOM nodes.

```tsx
type NoteCardProps = {
  note: NoteSummary;
  onOpen: (noteId: string) => void;
};

export function NoteCard({ note, onOpen }: NoteCardProps) {
  return (
    <button onClick={() => onOpen(note.id)} className="note-card">
      <h3>{note.title}</h3>
      <p>{note.preview}</p>
    </button>
  );
}
```

---

## Level 2: Compound Components & Slots

Use compound components when the caller needs layout flexibility, optional regions, or sub-component rearrangement.

### Slot Pattern (Named Slots)

```tsx
export interface CardProps {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Card({ header, footer, children, className }: CardProps) {
  return (
    <div className={`card ${className ?? ''}`}>
      {header && <header className="card-header">{header}</header>}
      <main className="card-body">{children}</main>
      {footer && <footer className="card-footer">{footer}</footer>}
    </div>
  );
}
```

### Compound Component Pattern (Context Coordination)

```tsx
import React, { createContext, useContext, useState } from 'react';

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs sub-components must be rendered inside a <Tabs> parent.');
  }
  return context;
}

export function Tabs({ defaultValue, children }: { defaultValue: string; children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState(defaultValue);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

export function TabList({ children }: { children: React.ReactNode }) {
  return <div role="tablist" className="tabs-list">{children}</div>;
}

export function TabTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === value;
  return (
    <button
      role="tab"
      aria-selected={isActive}
      onClick={() => setActiveTab(value)}
      className={`tab-trigger ${isActive ? 'active' : ''}`}
    >
      {children}
    </button>
  );
}

export function TabContent({ value, children }: { value: string; children: React.ReactNode }) {
  const { activeTab } = useTabsContext();
  if (activeTab !== value) return null;
  return <div role="tabpanel" className="tab-content">{children}</div>;
}

Tabs.List = TabList;
Tabs.Trigger = TabTrigger;
Tabs.Content = TabContent;
```

---

## Level 3A: Container + Composer Props (Preferred Default)

When a UI component must support multiple data sources (e.g. API, Cache, Fixtures) but is consumed in a localized subtree, pass data via props through Container components instead of introducing React Context.

### Feature Contract (Interface)

```tsx
export type NotesListComposerProps = {
  notes: NoteSummary[];
  isPending: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  onLoadNextPage?: () => void;
  onOpenNote?: (id: string) => void;
};
```

### Pure Composer Component

```tsx
export function NotesListComposer({
  notes,
  isPending,
  isFetchingNextPage,
  hasNextPage,
  onLoadNextPage,
  onOpenNote,
}: NotesListComposerProps) {
  if (isPending) return <NotesListSkeleton />;
  if (notes.length === 0) return <EmptyState>No notes found</EmptyState>;

  return (
    <div className="notes-list">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} onOpen={onOpenNote} />
      ))}
      {hasNextPage && onLoadNextPage && (
        <button onClick={onLoadNextPage} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

### Swappable Containers

```tsx
// Remote Container (TanStack Query)
export function RemoteNotesContainer({ params }: { params: NotesParams }) {
  const query = useNotesQuery(params);
  return (
    <NotesListComposer
      notes={query.data?.items ?? []}
      isPending={query.isPending}
      isFetchingNextPage={query.isFetchingNextPage}
      hasNextPage={query.hasNextPage}
      onLoadNextPage={query.fetchNextPage}
    />
  );
}

// Fixture Usage (Storybook / Tests)
export function FixtureNotesExample() {
  return (
    <NotesListComposer
      notes={mockNotes}
      isPending={false}
      isFetchingNextPage={false}
      hasNextPage={false}
    />
  );
}
```

---

## Level 3B: Composer + Providers

Use Provider contracts only when multiple distant branches across the component tree need access to the same contract.

```tsx
type NotesListContract = {
  state: {
    notes: NoteSummary[];
    isLoading: boolean;
  };
  actions: {
    openNote: (id: string) => void;
  };
};

const NotesListContext = createContext<NotesListContract | null>(null);

export function RemoteNotesProvider({ children, params }: { children: React.ReactNode; params: NotesParams }) {
  const query = useNotesQuery(params);
  const value = useMemo(() => ({
    state: { notes: query.data?.items ?? [], isLoading: query.isPending },
    actions: { openNote: (id: string) => { /* ... */ } }
  }), [query.data, query.isPending]);

  return <NotesListContext.Provider value={value}>{children}</NotesListContext.Provider>;
}
```

---

## Level 4: Shared Feature State

Use when state and actions cross multiple component boundaries (e.g. selection mode shared between header toolbar, list items, and bulk action bar).

```tsx
type NotesFeatureContract = {
  state: {
    selectMode: boolean;
    selectedNoteIds: Set<string>;
  };
  actions: {
    toggleSelectMode: () => void;
    toggleNote: (id: string) => void;
  };
};
```

---

## Code Smells & Anti-Patterns

| Anti-Pattern | Description | Fix |
| :--- | :--- | :--- |
| **Inner Component Definition** | Declaring `const Child = () => ...` inside parent component body. | Move component outside parent scope. |
| **Boolean Flag Explosion** | Component accepts dozens of flags (`isSmall`, `hasHeader`, `iconLeft`, etc.). | Replace flags with Slots or Compound Components. |
| **Context as Default DI** | Wrapping every single component in its own Provider. | Use Container + Composer props (Level 3A). |
| **Exposing Library Internals** | Putting raw `UseQueryResult` or Axios responses into Context. | Map domain-specific contracts (`notes`, `isLoading`). |
