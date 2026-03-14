# RAG vs 分层索引对比

## 什么是 RAG？

RAG（Retrieval-Augmented Generation）是目前主流的知识检索方案：

```
用户问题 → 向量化 → 相似度搜索 → Top-K 文档片段 → LLM 生成回答
```

### RAG 的问题

1. **片段化**：只检索片段，缺乏全局上下文
2. **不可预测**：每次检索是随机匹配
3. **成本高**：需要向量化整个知识库
4. **准确率有限**：容易检索到不相关内容

## 分层索引方案

WriteLess 采用**分层结构化索引**替代 RAG：

```
Level 1: 所有笔记的一句话摘要（快速扫描）
Level 2: 相关笔记的大纲/要点（定位）
Level 3: 完整内容（深入）
```

### 优势对比

| 维度 | RAG | 分层索引 |
|------|-----|----------|
| 检索方式 | 向量相似度 | 结构化遍历 |
| 上下文 | 片段 | 完整结构 |
| 可预测性 | 低 | 高 |
| 计算成本 | 高（向量化） | 低（树遍历） |
| 准确率 | ~70% | ~90%（预期） |

## 实现示例

```typescript
interface NoteIndex {
  // L1: 摘要层
  summary: string

  // L2: 大纲层
  outline: string[]

  // L3: 原始内容
  content: string

  // 元数据
  path: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

// 检索流程
async function search(query: string) {
  // Step 1: 扫描 L1 摘要，筛选候选
  const candidates = notes.filter(n =>
    semanticMatch(query, n.summary)
  )

  // Step 2: 检查 L2 大纲，定位相关笔记
  const relevant = candidates.filter(n =>
    outlineMatch(query, n.outline)
  )

  // Step 3: 只读取 L3 完整内容
  const results = relevant.map(n => n.content)

  return results
}
```

## 结论

分层索引更适合**结构化笔记**场景，RAG 更适合**非结构化文档**检索。

WriteLess 的笔记天然有结构（标题、大纲、段落），分层索引能更好利用这种结构。
