# React Performance Optimization

React is fast by default, but complex applications can hit bottlenecks due to unnecessary re-renders, expensive calculations, or massive bundle sizes.

## Core Optimization Strategies

### 1. State Colocation

Keep state as close to where it is used as possible. Moving state down the component tree prevents unrelated parent/sibling components from re-rendering.

### 2. Memoization APIs

#### `React.memo`

Prevents a component from re-rendering if its props have not changed (performs a shallow comparison).

```tsx
const ExpensiveComponent = React.memo(({ data }) => {
  return <div>{/* Render intensive structure */}</div>;
});
```

#### `useMemo`

Caches the result of an expensive calculation between renders.

```tsx
const formattedData = useMemo(() => expensiveSort(rawData), [rawData]);
```

#### `useCallback`

Caches the function definition itself between renders. Prevents breaking `React.memo` on child components that receive callbacks as props.

```tsx
const handleClick = useCallback(() => {
  console.log(id);
}, [id]);
```

### 3. Transition API (`useTransition`)

Allows marking state updates as non-blocking transitions. This keeps the UI responsive (e.g., input typing remains smooth while a large search list filters in the background).

```tsx
const [isPending, startTransition] = useTransition();

const handleChange = (e) => {
  setInputValue(e.target.value); // High priority
  
  startTransition(() => {
    setSearchQuery(e.target.value); // Low priority (deferred)
  });
};
```

### 4. Windowing / Virtualization

For rendering extremely long lists of items, render only the elements currently visible in the viewport using virtualization libraries like `react-window` or `react-virtualized`.
