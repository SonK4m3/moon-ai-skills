# React Composition Architecture Case Studies

This guide provides end-to-end architectural examples and directory structures for feature composition.

---

## Case Study 1: Notes List Feature

### Feature Requirements
* Supports remote TanStack Query fetching, cached local storage, and mock fixture testing.
* Interactive selection mode across list items, toolbar, and bulk actions.
* Responsive layouts with optimal client-server boundaries.

### Recommended File Structure

```text
notes/
├── components/
│   ├── note-item/
│   │   ├── note-item.tsx
│   │   ├── note-item-context.ts
│   │   └── index.ts
│   ├── notes-list-composer.tsx
│   ├── notes-toolbar-composer.tsx
│   ├── notes-tabs-composer.tsx
│   └── notes-bulk-actions-composer.tsx
│
├── containers/
│   ├── remote-notes-container.tsx
│   ├── cached-notes-container.tsx
│   └── fixture-notes-container.tsx
│
├── stores/
│   └── use-notes-selection-store.ts
│
├── contracts/
│   └── notes-list-contract.ts
│
└── types/
    └── note-summary.ts
```

### Server & Client Boundary Architecture

```text
NotesPage (Server Component)
├── NotesPageHeader (Server Component)
└── NotesInteractiveFeature (Client Boundary)
    ├── NotesTabs (URL Search Params)
    ├── NotesToolbar (Selection Selectors)
    ├── RemoteNotesContainer (TanStack Query Container)
    │   └── NotesListComposer (Pure Composer UI)
    │       └── MemoNoteItem (Level 2 Compound Item)
    └── NotesBulkActions (Selection Store Actions)
```

---

## Case Study 2: Note Detail Feature

### Feature Requirements
* Modular detail view with side panels (Chat, Version History, Metadata).
* Independent state management per panel.

### Recommended Ownership

| Concern | Recommended Owner |
| :--- | :--- |
| **Fetch Note Detail** | Server Component or domain query hook |
| **Cached Preview** | IndexedDB / Data layer |
| **Generating Status** | Query / WebSockets subscription |
| **Chat Panel State** | Isolated Chat Feature Provider |
| **Version History Panel** | Isolated Version Feature Provider |
| **Panel Open/Close** | Local Layout state or URL search params |

Avoid creating a monolithic `NoteDetailContext` that aggregates all panels. Prefer smaller, independent feature contracts.

---

## Naming Conventions Summary

| Abstraction | Recommended Naming |
| :--- | :--- |
| **Plain Component** | `NoteItem` |
| **Compound Component Sub-node** | `NoteItem.Title`, `NoteItem.Actions` |
| **Pure UI Composer** | `NotesListComposer` |
| **Data Container (Level 3A)** | `RemoteNotesContainer`, `CachedNotesContainer` |
| **Provider (Level 3B / 4)** | `NotesListProvider`, `NotesFeatureProvider` |
| **Selector Hook** | `useNotesSelection` |
