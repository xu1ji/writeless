import { useEffect, useCallback } from 'react'
import { useFileStore } from '../stores/fileStore'

interface Shortcut {
  key: string
  metaKey?: boolean
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  action: () => void
  description: string
}

export function useKeyboardShortcuts() {
  const {
    activeFilePath,
    hasUnsavedChanges,
    toggleOutline,
    toggleFolder,
    workspacePath,
  } = useFileStore()

  const saveFile = useCallback(async () => {
    if (!window.electronAPI || !activeFilePath || !hasUnsavedChanges) return

    const content = useFileStore.getState().activeFileContent
    const result = await window.electronAPI.saveFile(activeFilePath, content)
    if (result.success) {
      useFileStore.getState().markSaved()
    }
  }, [activeFilePath, hasUnsavedChanges])

  const shortcuts: Shortcut[] = [
    // Cmd/Ctrl + S: 保存
    {
      key: 's',
      metaKey: true,
      action: saveFile,
      description: '保存文件',
    },
    // Cmd/Ctrl + B: 切换侧边栏
    {
      key: 'b',
      metaKey: true,
      action: () => {
        const event = new CustomEvent('toggleSidebar')
        window.dispatchEvent(event)
      },
      description: '切换侧边栏',
    },
    // Cmd/Ctrl + Shift + O: 切换大纲
    {
      key: 'o',
      metaKey: true,
      shiftKey: true,
      action: toggleOutline,
      description: '切换大纲',
    },
    // Cmd/Ctrl + N: 新建文件
    {
      key: 'n',
      metaKey: true,
      action: async () => {
        if (!window.electronAPI || !workspacePath) return
        const fileName = `新文件-${Date.now()}.md`
        const result = await window.electronAPI.createFile(
          `${workspacePath}/${fileName}`,
          '# 新文件\n\n'
        )
        if (result.success) {
          const tree = await window.electronAPI.readDirectory(workspacePath)
          useFileStore.getState().setFileTree(tree)
        }
      },
      description: '新建文件',
    },
    // Cmd/Ctrl + ,: 打开设置
    {
      key: ',',
      metaKey: true,
      action: () => {
        const event = new CustomEvent('openSettings')
        window.dispatchEvent(event)
      },
      description: '打开设置',
    },
  ]

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase()
        const metaMatch = shortcut.metaKey
          ? e.metaKey || e.ctrlKey
          : !e.metaKey && !e.ctrlKey
        const shiftMatch = shortcut.shiftKey ? e.shiftKey : !e.shiftKey
        const altMatch = shortcut.altKey ? e.altKey : !e.altKey

        if (keyMatch && metaMatch && shiftMatch && altMatch) {
          e.preventDefault()
          shortcut.action()
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])

  return { shortcuts }
}

// 快捷键面板组件
export function KeyboardShortcutsPanel() {
  const shortcuts = [
    { keys: ['⌘', 'S'], description: '保存文件' },
    { keys: ['⌘', 'N'], description: '新建文件' },
    { keys: ['⌘', 'B'], description: '切换侧边栏' },
    { keys: ['⌘', '⇧', 'O'], description: '切换大纲' },
    { keys: ['⌘', ','], description: '打开设置' },
    { keys: ['⌘', '/'], description: '显示快捷键' },
  ]

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">快捷键</h3>
      <div className="space-y-2">
        {shortcuts.map((shortcut, index) => (
          <div
            key={index}
            className="flex items-center justify-between py-2 border-b border-[#eceae5] last:border-0"
          >
            <span className="text-sm text-[#787774]">{shortcut.description}</span>
            <div className="flex items-center gap-1">
              {shortcut.keys.map((key, i) => (
                <React.Fragment key={i}>
                  <kbd className="px-2 py-0.5 text-xs bg-[#f1f1ef] rounded border border-[#eceae5]">
                    {key}
                  </kbd>
                  {i < shortcut.keys.length - 1 && (
                    <span className="text-[#787774]">+</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
