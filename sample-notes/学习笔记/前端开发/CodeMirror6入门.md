# CodeMirror 6 入门指南

## 核心概念

CodeMirror 6 是一个完全重写的版本，采用模块化架构：

### 1. EditorState

编辑器的**不可变状态**，包含：
- 文档内容（Doc）
- 选区（Selection）
- 扩展配置（Extensions）

```typescript
import { EditorState } from "@codemirror/state"

const state = EditorState.create({
  doc: "Hello World",
  extensions: [/* ... */]
})
```

### 2. EditorView

编辑器的**视图层**，负责：
- 渲染 DOM
- 处理用户输入
- 更新状态

```typescript
import { EditorView } from "@codemirror/view"

const view = new EditorView({
  state,
  parent: document.getElementById("editor")
})
```

### 3. Extension

扩展系统是 CodeMirror 6 的核心，包括：
- 语言支持（@codemirror/lang-markdown）
- 主题样式（EditorView.theme）
- 键位映射（keymap）
- 装饰器（Decoration）

## 装饰器（Decoration）

装饰器用于**改变文本的显示方式**，不改变实际内容。

### 类型

| 类型 | 用途 |
|------|------|
| `Decoration.mark` | 标记装饰（加粗、斜体） |
| `Decoration.widget` | 插入组件（复选框） |
| `Decoration.replace` | 替换/隐藏文本 |
| `Decoration.line` | 整行装饰 |

### 示例：隐藏 Markdown 语法

```typescript
import { Decoration, ViewPlugin } from "@codemirror/view"

const hideMark = Decoration.replace({})

const plugin = ViewPlugin.fromClass(class {
  decorations

  constructor(view) {
    this.decorations = this.build(view)
  }

  build(view) {
    const widgets = []
    // 匹配 **粗体**
    const regex = /\*\*(.+?)\*\*/g
    let match
    while ((match = regex.exec(view.state.doc.toString()))) {
      const start = match.index
      const end = start + match[0].length
      // 隐藏前导 **
      widgets.push(hideMark.range(start, start + 2))
      // 隐藏后缀 **
      widgets.push(hideMark.range(end - 2, end))
    }
    return Decoration.set(widgets)
  }

  update(update) {
    if (update.docChanged) {
      this.decorations = this.build(update.view)
    }
  }
}, {
  decorations: v => v.decorations
})
```

## 光标感知

实现 Live Preview 的关键：只在光标不在时隐藏语法。

```typescript
const selection = view.state.selection.main
const isCursorInRange = selection.from >= start && selection.to <= end

if (!isCursorInRange) {
  // 应用隐藏装饰
}
```

## 最佳实践

1. **性能**：只处理可见区域（visibleRanges）
2. **缓存**：避免频繁重建装饰器
3. **边界**：处理光标在边界的情况

## 参考资源

- [CodeMirror 6 官方文档](https://codemirror.net/docs/)
- [装饰器示例](https://codemirror.net/examples/decoration/)
- [Markdown 语言支持](https://github.com/codemirror/lang-markdown)
