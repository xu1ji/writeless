# CodeMirror 6 Live Preview 实现指南

> 如何用 CodeMirror 6 实现 Obsidian 风格的 Live Preview 编辑器

---

## 核心概念

### 什么是 Live Preview？

```
传统 Markdown 编辑器：
┌──────────────┐ ┌──────────────┐
│   编辑区     │ │   预览区     │
│ # 标题       │ │   标题       │
│ **粗体**     │ │   粗体       │
└──────────────┘ └──────────────┘

Obsidian Live Preview：
┌────────────────────────────────┐
│   标题                         │  ← 渲染显示
│   粗体文字|                    │  ← 光标在时显示 **粗体文字**
│   ☐ 待办事项                   │  ← 复选框可点击
└────────────────────────────────┘
```

### 关键特性
1. **单一编辑区**：不需要分屏
2. **原地渲染**：Markdown 在非编辑状态显示为渲染结果
3. **语法隐藏**：光标进入时才显示 Markdown 语法
4. **块级编辑**：每个段落/标题是独立的可编辑块

---

## CodeMirror 6 架构

### 核心模块

```typescript
import {
  EditorView,        // 编辑器视图
  EditorState,       // 编辑器状态
  basicSetup,        // 基础配置
} from "codemirror"

import {
  markdown,          // Markdown 语言支持
  markdownLanguage,
} from "@codemirror/lang-markdown"

import {
  syntaxHighlighting,
  defaultHighlightStyle,
} from "@codemirror/language"

import {
  Decoration,        // 装饰器（核心）
  ViewPlugin,        // 视图插件
  WidgetType,        // 自定义组件
} from "@codemirror/view"
```

### 初始化编辑器

```typescript
import { EditorView, basicSetup } from "codemirror"
import { markdown, markdownLanguage } from "@codemirror/lang-markdown"
import { syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language"

const view = new EditorView({
  doc: "# Hello\n\n**World**",
  extensions: [
    basicSetup,
    markdown({ base: markdownLanguage }),
    syntaxHighlighting(defaultHighlightStyle),
    // Live Preview 关键扩展 ↓
    livePreviewExtension(),
  ],
  parent: document.getElementById("editor")!,
})
```

---

## 实现语法隐藏（核心）

### 原理

CodeMirror 通过 **Decoration（装饰器）** 来改变文本的显示方式，而不改变实际内容。

```
实际内容：  **粗体文字**
装饰后：    粗体文字         （隐藏 ** 符号）
```

### 步骤 1：定义装饰器

```typescript
import { Decoration, MatchDecorator, ViewPlugin } from "@codemirror/view"

// 隐藏装饰
const hideMark = Decoration.mark({ class: "cm-hidden-mark" })

// 加粗装饰
const boldMark = Decoration.mark({ class: "cm-bold" })

// 斜体装饰
const italicMark = Decoration.mark({ class: "cm-italic" })
```

### 步骤 2：匹配 Markdown 语法

```typescript
// 匹配 **粗体**
const boldDecorator = new MatchDecorator({
  regexp: /\*\*([^*]+)\*\*/g,
  decoration: (match) => Decoration.mark({
    class: "cm-bold-text",
    // 用 decoration 包裹整个匹配，再用 tagName 包裹要隐藏的部分
  }),
})
```

### 步骤 3：创建视图插件

```typescript
import { ViewPlugin, Decoration, DecorationSet } from "@codemirror/view"

const markdownDecorations = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view)
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      const builder: Range<Decoration>[] = []
      const doc = view.state.doc

      // 遍历文档，匹配 Markdown 语法
      for (const { from, to } of view.visibleRanges) {
        const text = doc.sliceString(from, to)

        // 匹配 **粗体**
        let match
        const boldRegex = /\*\*([^*]+)\*\*/g
        while ((match = boldRegex.exec(text)) !== null) {
          const start = from + match.index
          const end = start + match[0].length

          // 隐藏前导 **
          builder.push(hideMark.range(start, start + 2))
          // 隐藏后缀 **
          builder.push(hideMark.range(end - 2, end))
          // 加粗中间文字
          builder.push(boldMark.range(start + 2, end - 2))
        }

        // 类似处理：*斜体*、# 标题、`代码` 等
      }

      return Decoration.set(builder)
    }
  },
  { decorations: (v) => v.decorations }
)
```

### 步骤 4：CSS 样式

```css
/* 隐藏 Markdown 语法 */
.cm-hidden-mark {
  font-size: 0;
  width: 0;
  display: inline-block;
  overflow: hidden;
}

/* 加粗文字 */
.cm-bold-text {
  font-weight: 700;
}

/* 斜体文字 */
.cm-italic-text {
  font-style: italic;
}

/* 行内代码 */
.cm-inline-code {
  background: rgba(135, 131, 120, 0.15);
  color: #eb5757;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: "SF Mono", monospace;
}
```

---

## 光标感知（关键）

### 原理

只有光标不在的行才隐藏语法，光标所在的行显示原始语法。

```typescript
const cursorAwareDecorations = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    cursorPos: number = -1

    constructor(view: EditorView) {
      this.cursorPos = view.state.selection.main.head
      this.decorations = this.buildDecorations(view)
    }

    update(update: ViewUpdate) {
      // 光标位置变化时重新计算
      if (update.selectionSet) {
        this.cursorPos = update.state.selection.main.head
      }
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = this.buildDecorations(update.view)
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      const builder: Range<Decoration>[] = []
      const doc = view.state.doc
      const cursorLine = doc.lineAt(this.cursorPos).number

      for (const { from, to } of view.visibleRanges) {
        for (let pos = from; pos <= to;) {
          const line = doc.lineAt(pos)
          const lineText = line.text

          // 如果光标在这一行，不应用装饰（显示原始语法）
          if (line.number === cursorLine) {
            pos = line.to + 1
            continue
          }

          // 光标不在这一行，应用装饰
          this.decorateLine(builder, line, lineText)
          pos = line.to + 1
        }
      }

      return Decoration.set(builder)
    }

    decorateLine(builder: Range<Decoration>[], line: Line, text: string) {
      // 匹配并装饰各种 Markdown 语法
      // ...
    }
  },
  { decorations: (v) => v.decorations }
)
```

---

## 待办事项组件

### Widget 实现

```typescript
import { WidgetType } from "@codemirror/view"

// 自定义复选框组件
class CheckboxWidget extends WidgetType {
  constructor(readonly checked: boolean, readonly pos: number) {
    super()
  }

  toDOM(view: EditorView): HTMLElement {
    const span = document.createElement("span")
    span.className = "cm-checkbox"
    span.textContent = this.checked ? "☑" : "☐"
    span.contentEditable = "false"  // 重要：不可编辑

    span.onclick = () => {
      // 切换状态
      const doc = view.state.doc
      const line = doc.lineAt(this.pos)
      const newText = line.text.replace(
        /- \[([ x])\]/,
        this.checked ? "- [ ]" : "- [x]"
      )
      view.dispatch({
        changes: { from: line.from, to: line.to, insert: newText }
      })
    }

    return span
  }
}

// 匹配待办事项
const todoDecorator = ViewPlugin.fromClass(
  class {
    // ...
    buildDecorations(view: EditorView) {
      // 匹配 - [ ] 和 - [x]
      const todoRegex = /^(\s*)- \[([ x])\]\s/gm
      // ...替换为 Widget
    }
  }
)
```

### CSS

```css
.cm-checkbox {
  cursor: pointer;
  margin-right: 6px;
  font-size: 16px;
  user-select: none;
}

.cm-checkbox:hover {
  opacity: 0.8;
}

/* 已完成的待办项 */
.cm-task-done {
  text-decoration: line-through;
  color: #787774;
}
```

---

## 完整扩展配置

```typescript
import { EditorView } from "@codemirror/view"
import { markdown, markdownLanguage } from "@codemirror/lang-markdown"
import { syntaxHighlighting, HighlightStyle } from "@codemirror/language"
import { tags } from "@lezer/highlight"

// 自定义高亮样式
const highlightStyle = HighlightStyle.define([
  { tag: tags.heading1, fontSize: "30px", fontWeight: "700" },
  { tag: tags.heading2, fontSize: "24px", fontWeight: "700" },
  { tag: tags.heading3, fontSize: "20px", fontWeight: "600" },
  { tag: tags.strong, fontWeight: "700" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.monospace, fontFamily: "monospace", background: "#f7f6f3" },
])

// 编辑器主题
const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "16px",
  },
  ".cm-content": {
    fontFamily: `-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif`,
    padding: "0",
  },
  ".cm-line": {
    padding: "0",
  },
  ".cm-cursor": {
    borderLeftColor: "#37352f",
  },
})

// 完整配置
export function createEditor(parent: HTMLElement, initialContent: string) {
  return new EditorView({
    doc: initialContent,
    extensions: [
      markdown({ base: markdownLanguage }),
      syntaxHighlighting(highlightStyle),
      editorTheme,
      cursorAwareDecorations,  // Live Preview 核心
      todoDecorator,           // 待办事项
    ],
    parent,
  })
}
```

---

## 注意事项

### 1. 性能优化
- 只处理可见区域（visibleRanges）
- 使用 debounce 防抖频繁更新
- 避免在 buildDecorations 中做复杂计算

### 2. 边界情况
- 光标在行首/行尾
- 多行选择
- 中文输入法（composition）
- 撤销/重做

### 3. 已知问题
- 嵌套语法（如 `**_粗斜体_**`）需要特殊处理
- 代码块内的 Markdown 不应被装饰
- 表格语法较复杂

---

## 参考资源

- [CodeMirror 6 官方文档](https://codemirror.net/docs/)
- [CodeMirror 6 装饰器指南](https://codemirror.net/examples/decoration/)
- [Obsidian CodeMirror 扩展源码](https://github.com/nothingislost/obsidian-codemirror-options)
- [MDX 编辑器实现参考](https://github.com/mdx-editor/editor)

---

*版本: v1.0*
*用途: CodeMirror 6 Live Preview 实现参考*
