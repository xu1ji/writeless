import React from 'react'
import { motion } from 'motion/react'
import { X, Moon, Sun, Type, Monitor } from 'lucide-react'
import { useFileStore } from '../stores/fileStore'
import { KeyboardShortcutsPanel } from '../hooks/useKeyboardShortcuts'

interface SettingsModalProps {
  onClose: () => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { sidebarWidth, setSidebarWidth } = useFileStore()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#eceae5]">
          <h2 className="text-lg font-semibold text-[#37352f]">设置</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#f1f1ef] rounded transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(80vh-60px)]">
          {/* 外观设置 */}
          <div className="p-6 border-b border-[#eceae5]">
            <h3 className="text-sm font-medium text-[#37352f] mb-4 flex items-center gap-2">
              <Monitor size={16} />
              外观
            </h3>

            <div className="space-y-4">
              {/* 侧边栏宽度 */}
              <div>
                <label className="text-sm text-[#787774] mb-2 block">
                  侧边栏宽度: {sidebarWidth}px
                </label>
                <input
                  type="range"
                  min={180}
                  max={400}
                  value={sidebarWidth}
                  onChange={(e) => setSidebarWidth(Number(e.target.value))}
                  className="w-full h-1 bg-[#eceae5] rounded-lg appearance-none cursor-pointer accent-[#2383e2]"
                />
              </div>

              {/* 编辑器宽度 */}
              <div>
                <label className="text-sm text-[#787774] mb-2 block">
                  编辑器字号
                </label>
                <select className="w-full px-3 py-2 bg-[#fafafa] border border-[#eceae5] rounded-lg text-sm">
                  <option value="14">14px</option>
                  <option value="16" selected>16px (默认)</option>
                  <option value="18">18px</option>
                  <option value="20">20px</option>
                </select>
              </div>
            </div>
          </div>

          {/* 快捷键 */}
          <div className="p-6">
            <KeyboardShortcutsPanel />
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
