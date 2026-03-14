import { useEffect, useCallback, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { Editor } from './components/Editor'
import { Outline } from './components/Outline'
import { SettingsModal } from './components/SettingsModal'
import { useFileStore } from './stores/fileStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { motion, AnimatePresence } from 'motion/react'
import { Menu, X, Settings, FileText, ChevronRight, Command } from 'lucide-react'

export default function App() {
  const {
    workspacePath,
    activeFilePath,
    activeFileContent,
    hasUnsavedChanges,
    showOutline,
    isSidebarOpen,
    sidebarWidth,
    setWorkspace,
    setFileTree,
    setActiveFile,
    updateContent,
    markSaved,
    toggleSidebar,
    toggleOutline,
  } = useFileStore()

  const [showSettings, setShowSettings] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // 初始化快捷键
  useKeyboardShortcuts()

  // 打开文件夹
  const handleOpenFolder = useCallback(async () => {
    if (!window.electronAPI) {
      alert('请使用桌面应用版本')
      return
    }

    setIsLoading(true)
    const path = await window.electronAPI.openFolder()
    if (path) {
      setWorkspace(path)
      const tree = await window.electronAPI.readDirectory(path)
      setFileTree(tree)
    }
    setIsLoading(false)
  }, [setWorkspace, setFileTree])

  // 打开文件
  const handleOpenFile = useCallback(
    async (path: string) => {
      if (!window.electronAPI) return

      // 如果有未保存的更改，先保存
      if (hasUnsavedChanges && activeFilePath) {
        await handleSave()
      }

      const result = await window.electronAPI.readFile(path)
      if (result.success) {
        setActiveFile(path, result.data || '')
      }
    },
    [hasUnsavedChanges, activeFilePath, setActiveFile]
  )

  // 保存文件
  const handleSave = useCallback(async () => {
    if (!window.electronAPI || !activeFilePath || !hasUnsavedChanges) return

    const result = await window.electronAPI.saveFile(
      activeFilePath,
      activeFileContent
    )
    if (result.success) {
      markSaved()
    }
  }, [activeFilePath, activeFileContent, hasUnsavedChanges, markSaved])

  // 监听文件变化
  useEffect(() => {
    if (!window.electronAPI || !workspacePath) return

    const unsubscribe = window.electronAPI.onFileChange(() => {
      window.electronAPI.readDirectory(workspacePath).then(setFileTree)
    })

    return unsubscribe
  }, [workspacePath, setFileTree])

  // 自动保存
  useEffect(() => {
    if (!hasUnsavedChanges || !activeFilePath) return

    const timer = setTimeout(() => {
      handleSave()
    }, 1000)

    return () => clearTimeout(timer)
  }, [hasUnsavedChanges, activeFilePath, handleSave])

  // 监听自定义事件
  useEffect(() => {
    const handleOpenSettings = () => setShowSettings(true)
    const handleToggleSidebar = () => toggleSidebar()

    window.addEventListener('openSettings', handleOpenSettings)
    window.addEventListener('toggleSidebar', handleToggleSidebar)

    return () => {
      window.removeEventListener('openSettings', handleOpenSettings)
      window.removeEventListener('toggleSidebar', handleToggleSidebar)
    }
  }, [toggleSidebar])

  // 快捷键面板
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        setShowShortcuts((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="flex h-screen w-full bg-white text-[#37352f] overflow-hidden font-sans select-none">
      {/* 侧边栏 */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: sidebarWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="h-full flex-shrink-0"
          >
            <Sidebar
              onOpenFolder={handleOpenFolder}
              onSelectFile={handleOpenFile}
              isLoading={isLoading}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* 顶部工具栏 */}
        <header className="h-11 flex items-center justify-between px-4 border-b border-[#e9e9e7] bg-white/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleSidebar()}
              className="p-1.5 hover:bg-[#f1f1ef] rounded transition-colors"
              title="切换侧边栏 (Cmd+B)"
            >
              {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            {activeFilePath && (
              <div className="flex items-center gap-1 text-sm text-[#787774]">
                <FileText size={14} />
                <span className="truncate max-w-[200px]">
                  {activeFilePath.split('/').pop()}
                </span>
                {hasUnsavedChanges && (
                  <span className="text-[#eb5757] text-lg">•</span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {activeFilePath && (
              <button
                onClick={() => toggleOutline()}
                className={`p-1.5 rounded transition-colors ${
                  showOutline ? 'bg-[#e9e9e7]' : 'hover:bg-[#f1f1ef]'
                }`}
                title="文档大纲 (Cmd+Shift+O)"
              >
                <ChevronRight size={18} />
              </button>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 hover:bg-[#f1f1ef] rounded transition-colors"
              title="设置 (Cmd+,)"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={() => setShowShortcuts(true)}
              className="p-1.5 hover:bg-[#f1f1ef] rounded transition-colors"
              title="快捷键 (Cmd+/)"
            >
              <Command size={18} />
            </button>
          </div>
        </header>

        {/* 编辑器区域 */}
        <div className="flex-1 flex overflow-hidden">
          {activeFilePath ? (
            <>
              <Editor content={activeFileContent} onChange={updateContent} />
              <AnimatePresence>
                {showOutline && <Outline content={activeFileContent} />}
              </AnimatePresence>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-[#fafafa]">
              <div className="text-center max-w-md px-8">
                <div className="w-16 h-16 mx-auto mb-6 bg-[#f1f1ef] rounded-2xl flex items-center justify-center">
                  <FileText size={32} className="text-[#787774]" />
                </div>
                <h2 className="text-2xl font-semibold text-[#37352f] mb-3">
                  WriteLess
                </h2>
                <p className="text-[#787774] mb-6">
                  {workspacePath
                    ? '选择一个文件开始编辑'
                    : '打开一个文件夹开始使用'}
                </p>
                {!workspacePath && (
                  <button
                    onClick={handleOpenFolder}
                    className="px-4 py-2 bg-[#2383e2] text-white rounded-lg hover:bg-[#1a6ec9] transition-colors"
                    disabled={isLoading}
                  >
                    {isLoading ? '加载中...' : '打开文件夹'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 设置弹窗 */}
      <AnimatePresence>
        {showSettings && (
          <SettingsModal onClose={() => setShowSettings(false)} />
        )}
      </AnimatePresence>

      {/* 快捷键弹窗 */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
            onClick={() => setShowShortcuts(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#eceae5]">
                <h2 className="text-lg font-semibold text-[#37352f]">
                  快捷键
                </h2>
                <button
                  onClick={() => setShowShortcuts(false)}
                  className="p-1 hover:bg-[#f1f1ef] rounded transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-3">
                {[
                  { keys: ['⌘', 'S'], desc: '保存文件' },
                  { keys: ['⌘', 'N'], desc: '新建文件' },
                  { keys: ['⌘', 'B'], desc: '切换侧边栏' },
                  { keys: ['⌘', '⇧', 'O'], desc: '切换大纲' },
                  { keys: ['⌘', ','], desc: '打开设置' },
                  { keys: ['⌘', '/'], desc: '显示快捷键' },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b border-[#eceae5] last:border-0"
                  >
                    <span className="text-sm text-[#787774]">{item.desc}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, j) => (
                        <span key={j} className="flex items-center">
                          <kbd className="px-2 py-0.5 text-xs bg-[#f1f1ef] rounded border border-[#eceae5]">
                            {key}
                          </kbd>
                          {j < item.keys.length - 1 && (
                            <span className="mx-1 text-[#787774]">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
