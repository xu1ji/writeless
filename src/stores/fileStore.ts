import { create } from 'zustand'
import { FileTreeNode } from '../types/electron'

export type SortBy = 'name' | 'modifiedTime'
export type SortOrder = 'asc' | 'desc'

interface FileState {
  // 工作区
  workspacePath: string | null
  fileTree: FileTreeNode[]

  // 当前文件
  activeFilePath: string | null
  activeFileContent: string
  hasUnsavedChanges: boolean

  // 排序
  sortBy: SortBy
  sortOrder: SortOrder

  // UI 状态
  expandedFolders: Set<string>
  sidebarWidth: number
  showOutline: boolean
  isSidebarOpen: boolean

  // Actions
  setWorkspace: (path: string) => void
  setFileTree: (tree: FileTreeNode[]) => void
  setActiveFile: (path: string | null, content: string) => void
  updateContent: (content: string) => void
  markSaved: () => void
  setSortBy: (sortBy: SortBy) => void
  toggleSortOrder: () => void
  toggleFolder: (path: string) => void
  setSidebarWidth: (width: number) => void
  toggleOutline: () => void
  toggleSidebar: () => void

  // 文件操作
  addNode: (parentPath: string, node: FileTreeNode) => void
  updateNode: (path: string, updates: Partial<FileTreeNode>) => void
  removeNode: (path: string) => void
  moveNode: (sourcePath: string, targetPath: string) => void
}

export const useFileStore = create<FileState>((set, get) => ({
  // 初始状态
  workspacePath: null,
  fileTree: [],
  activeFilePath: null,
  activeFileContent: '',
  hasUnsavedChanges: false,
  sortBy: 'name',
  sortOrder: 'asc',
  expandedFolders: new Set(),
  sidebarWidth: 260,
  showOutline: false,
  isSidebarOpen: true,

  // Actions
  setWorkspace: (path) => set({ workspacePath: path, activeFilePath: null, activeFileContent: '' }),

  setFileTree: (tree) => set({ fileTree: tree }),

  setActiveFile: (path, content) => set({
    activeFilePath: path,
    activeFileContent: content,
    hasUnsavedChanges: false
  }),

  updateContent: (content) => set({
    activeFileContent: content,
    hasUnsavedChanges: true
  }),

  markSaved: () => set({ hasUnsavedChanges: false }),

  setSortBy: (sortBy) => set({ sortBy }),

  toggleSortOrder: () => set((state) => ({
    sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc'
  })),

  toggleFolder: (path) => set((state) => {
    const newExpanded = new Set(state.expandedFolders)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    return { expandedFolders: newExpanded }
  }),

  setSidebarWidth: (width) => set({ sidebarWidth: Math.max(180, Math.min(400, width)) }),

  toggleOutline: () => set((state) => ({ showOutline: !state.showOutline })),

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  // 文件树操作辅助函数
  addNode: (parentPath, node) => set((state) => {
    const addToTree = (nodes: FileTreeNode[]): FileTreeNode[] => {
      return nodes.map(n => {
        if (n.path === parentPath && n.isDirectory) {
          return { ...n, children: [...(n.children || []), node] }
        }
        if (n.children) {
          return { ...n, children: addToTree(n.children) }
        }
        return n
      })
    }
    return { fileTree: addToTree(state.fileTree) }
  }),

  updateNode: (path, updates) => set((state) => {
    const updateInTree = (nodes: FileTreeNode[]): FileTreeNode[] => {
      return nodes.map(n => {
        if (n.path === path) {
          return { ...n, ...updates }
        }
        if (n.children) {
          return { ...n, children: updateInTree(n.children) }
        }
        return n
      })
    }
    return { fileTree: updateInTree(state.fileTree) }
  }),

  removeNode: (path) => set((state) => {
    const removeFromTree = (nodes: FileTreeNode[]): FileTreeNode[] => {
      return nodes
        .filter(n => n.path !== path)
        .map(n => {
          if (n.children) {
            return { ...n, children: removeFromTree(n.children) }
          }
          return n
        })
    }
    return { fileTree: removeFromTree(state.fileTree) }
  }),

  moveNode: (sourcePath, targetPath) => {
    // 移动操作需要先删除再添加，由 IPC 完成后刷新整个树
  },
}))
