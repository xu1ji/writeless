import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Folder,
  FileText,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  FolderPlus,
  FilePlus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
} from 'lucide-react'
import { useFileStore, SortBy } from '../stores/fileStore'
import { FileTreeNode } from '../types/electron'
import { motion, AnimatePresence } from 'motion/react'

interface SidebarProps {
  onOpenFolder: () => void
  onSelectFile: (path: string) => void
  isLoading: boolean
}

// 可排序的文件节点
interface SortableNodeProps {
  node: FileTreeNode
  level: number
  onSelectFile: (path: string) => void
  onContextMenu: (e: React.MouseEvent, node: FileTreeNode) => void
}

const SortableNode: React.FC<SortableNodeProps> = ({
  node,
  level,
  onSelectFile,
  onContextMenu,
}) => {
  const {
    activeFilePath,
    expandedFolders,
    toggleFolder,
  } = useFileStore()

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.path })

  const isActive = activeFilePath === node.path
  const isExpanded = expandedFolders.has(node.path)
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleClick = () => {
    if (node.isDirectory) {
      toggleFolder(node.path)
    } else {
      onSelectFile(node.path)
    }
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={`flex items-center h-7 px-3 cursor-pointer text-sm transition-colors duration-150 group
          ${isActive ? 'bg-[#eceae5] border-l-2 border-[#2383e2]' : 'hover:bg-[#eceae5] border-l-2 border-transparent'}
        `}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu(e, node)}
        {...attributes}
        {...listeners}
      >
        <span className="mr-1.5 text-[#37352f]/50 flex-shrink-0">
          {node.isDirectory ? (
            isExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )
          ) : (
            <FileText size={14} />
          )}
        </span>
        <span className="truncate text-[#37352f] flex-1">{node.name}</span>
        <button
          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#d9d9d6] rounded transition-opacity"
          onClick={(e) => {
            e.stopPropagation()
            onContextMenu(e, node)
          }}
        >
          <MoreHorizontal size={14} className="text-[#787774]" />
        </button>
      </div>

      {/* 子节点 */}
      {node.isDirectory && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <SortableNode
              key={child.path}
              node={child}
              level={level + 1}
              onSelectFile={onSelectFile}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenFolder,
  onSelectFile,
  isLoading,
}) => {
  const {
    workspacePath,
    fileTree,
    sortBy,
    sortOrder,
    setSortBy,
    toggleSortOrder,
    sidebarWidth,
  } = useFileStore()

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    node: FileTreeNode | null
  } | null>(null)

  const [draggedNode, setDraggedNode] = useState<FileTreeNode | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 关闭右键菜单
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  // 拖拽开始
  const handleDragStart = (event: DragStartEvent) => {
    const path = event.active.id as string
    const findNode = (nodes: FileTreeNode[]): FileTreeNode | null => {
      for (const node of nodes) {
        if (node.path === path) return node
        if (node.children) {
          const found = findNode(node.children)
          if (found) return found
        }
      }
      return null
    }
    setDraggedNode(findNode(fileTree))
  }

  // 拖拽结束
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setDraggedNode(null)

    if (!over || active.id === over.id) return

    const sourcePath = active.id as string
    const targetPath = over.id as string

    // 移动文件/文件夹
    if (window.electronAPI) {
      const result = await window.electronAPI.move(sourcePath, targetPath)
      if (result.success) {
        // 刷新文件树
        if (workspacePath) {
          const tree = await window.electronAPI.readDirectory(workspacePath)
          useFileStore.getState().setFileTree(tree)
        }
      }
    }
  }

  // 右键菜单
  const handleContextMenu = (e: React.MouseEvent, node: FileTreeNode) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      node,
    })
  }

  // 创建新文件
  const handleNewFile = async (parentPath: string) => {
    if (!window.electronAPI) return

    const fileName = `新文件.md`
    const filePath = `${parentPath}/${fileName}`
    const result = await window.electronAPI.createFile(filePath, '# 新文件\n\n')

    if (result.success && workspacePath) {
      const tree = await window.electronAPI.readDirectory(workspacePath)
      useFileStore.getState().setFileTree(tree)
      onSelectFile(result.data!)
    }
  }

  // 创建新文件夹
  const handleNewFolder = async (parentPath: string) => {
    if (!window.electronAPI) return

    const folderName = `新文件夹`
    const folderPath = `${parentPath}/${folderName}`
    const result = await window.electronAPI.createFolder(folderPath)

    if (result.success && workspacePath) {
      const tree = await window.electronAPI.readDirectory(workspacePath)
      useFileStore.getState().setFileTree(tree)
    }
  }

  // 重命名
  const handleRename = async (node: FileTreeNode) => {
    const newName = prompt('输入新名称:', node.name)
    if (!newName || newName === node.name) return

    if (window.electronAPI) {
      const result = await window.electronAPI.rename(node.path, newName)
      if (result.success && workspacePath) {
        const tree = await window.electronAPI.readDirectory(workspacePath)
        useFileStore.getState().setFileTree(tree)
      }
    }
  }

  // 删除
  const handleDelete = async (node: FileTreeNode) => {
    if (!confirm(`确定要删除 "${node.name}" 吗？`)) return

    if (window.electronAPI) {
      const result = await window.electronAPI.delete(node.path)
      if (result.success && workspacePath) {
        const tree = await window.electronAPI.readDirectory(workspacePath)
        useFileStore.getState().setFileTree(tree)
      }
    }
  }

  // 排序文件树
  const sortedTree = [...fileTree].sort((a, b) => {
    // 文件夹优先
    if (a.isDirectory && !b.isDirectory) return -1
    if (!a.isDirectory && b.isDirectory) return 1

    let comparison = 0
    if (sortBy === 'name') {
      comparison = a.name.localeCompare(b.name, 'zh-CN')
    } else if (sortBy === 'modifiedTime') {
      comparison = (a.modifiedTime || '').localeCompare(b.modifiedTime || '')
    }

    return sortOrder === 'asc' ? comparison : -comparison
  })

  return (
    <aside
      className="h-full bg-[#f7f6f3] flex flex-col border-r border-[#eceae5]"
      style={{ width: sidebarWidth }}
    >
      {/* 顶部操作栏 */}
      <div className="p-3 space-y-2">
        <button
          onClick={onOpenFolder}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-[#37352f] bg-white border border-[#eceae5] rounded hover:bg-[#f1f1ef] transition-colors"
          disabled={isLoading}
        >
          <FolderOpen size={16} />
          <span>{workspacePath ? '切换文件夹' : '打开文件夹'}</span>
        </button>

        {workspacePath && (
          <div className="flex gap-1">
            <button
              onClick={() => handleNewFile(workspacePath)}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs text-[#787774] hover:bg-[#eceae5] rounded transition-colors"
              title="新建文件"
            >
              <FilePlus size={14} />
              <span>文件</span>
            </button>
            <button
              onClick={() => handleNewFolder(workspacePath)}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs text-[#787774] hover:bg-[#eceae5] rounded transition-colors"
              title="新建文件夹"
            >
              <FolderPlus size={14} />
              <span>文件夹</span>
            </button>
          </div>
        )}
      </div>

      {/* 排序控制 */}
      {workspacePath && (
        <div className="px-3 py-2 border-b border-[#eceae5] flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="text-xs bg-transparent border-none outline-none text-[#787774]"
          >
            <option value="name">按名称</option>
            <option value="modifiedTime">按时间</option>
          </select>
          <button
            onClick={toggleSortOrder}
            className="text-xs text-[#787774] hover:text-[#37352f]"
          >
            {sortOrder === 'asc' ? '↑ 升序' : '↓ 降序'}
          </button>
        </div>
      )}

      {/* 文件树 */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-y-auto pt-2">
          {workspacePath ? (
            <SortableContext
              items={fileTree.map((n) => n.path)}
              strategy={verticalListSortingStrategy}
            >
              {sortedTree.map((node) => (
                <SortableNode
                  key={node.path}
                  node={node}
                  level={0}
                  onSelectFile={onSelectFile}
                  onContextMenu={handleContextMenu}
                />
              ))}
            </SortableContext>
          ) : (
            <div className="text-center text-[#787774] text-sm mt-8 px-4">
              <Folder size={32} className="mx-auto mb-2 opacity-50" />
              <p>打开一个文件夹开始</p>
            </div>
          )}
        </div>

        <DragOverlay>
          {draggedNode && (
            <div className="flex items-center gap-2 px-3 py-1 bg-white shadow-lg rounded border border-[#eceae5]">
              {draggedNode.isDirectory ? (
                <Folder size={14} />
              ) : (
                <FileText size={14} />
              )}
              <span className="text-sm">{draggedNode.name}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* 右键菜单 */}
      <AnimatePresence>
        {contextMenu && contextMenu.node && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-50 bg-white rounded-lg shadow-lg border border-[#eceae5] py-1 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {contextMenu.node.isDirectory && (
              <>
                <button
                  onClick={() => {
                    handleNewFile(contextMenu.node!.path)
                    setContextMenu(null)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-[#f1f1ef] transition-colors"
                >
                  <FilePlus size={14} />
                  新建文件
                </button>
                <button
                  onClick={() => {
                    handleNewFolder(contextMenu.node!.path)
                    setContextMenu(null)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-[#f1f1ef] transition-colors"
                >
                  <FolderPlus size={14} />
                  新建文件夹
                </button>
                <div className="h-px bg-[#eceae5] my-1" />
              </>
            )}
            <button
              onClick={() => {
                handleRename(contextMenu.node!)
                setContextMenu(null)
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-[#f1f1ef] transition-colors"
            >
              <Pencil size={14} />
              重命名
            </button>
            <button
              onClick={() => {
                handleDelete(contextMenu.node!)
                setContextMenu(null)
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-[#eb5757] hover:bg-[#fef2f2] transition-colors"
            >
              <Trash2 size={14} />
              删除
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  )
}
