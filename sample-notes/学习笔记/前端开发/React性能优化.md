# React 性能优化技巧

## 1. 使用 memo 避免不必要的渲染

```tsx
import { memo } from 'react'

const ExpensiveComponent = memo(({ data }) => {
  // 复杂计算
  return <div>{/* ... */}</div>
})
```

## 2. 使用 useMemo 缓存计算结果

```tsx
import { useMemo } from 'react'

function TodoList({ items, filter }) {
  const filteredItems = useMemo(() => {
    return items.filter(item => item.completed === filter)
  }, [items, filter])

  return <ul>{/* ... */}</ul>
}
```

## 3. 使用 useCallback 缓存函数

```tsx
import { useCallback } from 'react'

function Parent() {
  const handleClick = useCallback((id) => {
    console.log('Clicked:', id)
  }, [])

  return <Child onClick={handleClick} />
}
```

## 4. 虚拟列表

对于长列表，使用虚拟滚动：

```tsx
import { FixedSizeList } from 'react-window'

function FileList({ files }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={files.length}
      itemSize={35}
    >
      {({ index, style }) => (
        <div style={style}>{files[index].name}</div>
      )}
    </FixedSizeList>
  )
}
```

## 5. 代码分割

```tsx
import { lazy, Suspense } from 'react'

const HeavyComponent = lazy(() => import('./HeavyComponent'))

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <HeavyComponent />
    </Suspense>
  )
}
```

## 6. 避免内联对象和函数

```tsx
// ❌ 不好：每次渲染创建新对象
<Button style={{ color: 'red' }} />

// ✅ 好：使用常量
const buttonStyle = { color: 'red' }
<Button style={buttonStyle} />
```

## 性能检测工具

- React DevTools Profiler
- Chrome Performance Tab
- why-did-you-render 库
