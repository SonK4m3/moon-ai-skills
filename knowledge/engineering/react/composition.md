# React Component Composition

Component composition is the pattern of combining small, focused components to build complex user interfaces. It is React's primary reuse model, favored over inheritance or mixins.

## Benefits

- **Separation of Concerns**: Keep components decoupled and focused on one responsibility.
- **Reducing Prop Drilling**: Avoid passing down props through components that do not need them.
- **Enhanced Reusability**: Smaller, atomic components are easier to test and reuse.

## Composition Techniques

### 1. The `children` Prop

Allows components to serve as generic wrappers for any content passed between their opening and closing tags.

```tsx
// Generic Card Wrapper
function Card({ children }: { children: React.ReactNode }) {
  return <div className="card-styling">{children}</div>;
}

// Usage
<Card>
  <h2>Title</h2>
  <p>Some content</p>
</Card>
```

### 2. Component Slots

When a component needs placeholders in multiple places, use explicit React Node props instead of just `children`.

```tsx
interface SplitLayoutProps {
  left: React.ReactNode;
  right: React.ReactNode;
}

function SplitLayout({ left, right }: SplitLayoutProps) {
  return (
    <div style={{ display: 'flex' }}>
      <div className="sidebar">{left}</div>
      <div className="main-content">{right}</div>
    </div>
  );
}

// Usage
<SplitLayout
  left={<SidebarNavigation />}
  right={<MainDashboardView />}
/>
```

### 3. Compound Components

A pattern where a group of components work together to manage shared state implicitly (usually via React Context).

```tsx
// Example: Accordion, AccordionItem, AccordionHeader, AccordionPanel
// Accordion manages the expanded item ID; child components interact with it.
```
