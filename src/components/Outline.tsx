import React, { useMemo } from 'react'
import { motion } from 'motion/react'
import { X } from 'lucide-react'
import { useFileStore } from '../stores/fileStore'

interface OutlineItem {
  level: number
  text: string
  line: number
}

interface OutlineProps {
  content: string
}

export const Outline: React.FC<OutlineProps> = ({ content }) => {
  const { toggleOutline } = useFileStore()

  // 解析标题生成大纲
  const outlineItems = useMemo(() => {
    const lines = content.split('\n')
    const items: OutlineItem[] = []

    lines.forEach((line, index) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/)
      if (match) {
        items.push({
          level: match[1].length,
          text: match[2].trim(),
          line: index + 1,
        })
      }
    })

    return items
  }, [content])

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 260, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="h-full bg-[#fafafa] border-l border-[#eceae5] overflow-hidden flex-shrink-0"
    >
      <div className="h-full flex flex-col">
        {/* 标题 */}
        <div className="h-11 flex items-center justify-between px-4 border-b border-[#eceae5]">
          <span className="text-sm font-medium text-[#37352f]">大纲</span>
          <button
            onClick={toggleOutline}
            className="p-1 hover:bg-[#eceae5] rounded transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* 大纲列表 */}
        <div className="flex-1 overflow-y-auto py-2">
          {outlineItems.length === 0 ? (
            <div className="text-center text-[#787774] text-sm py-8">
              没有找到标题
            </div>
          ) : (
            outlineItems.map((item, index) => (
              <button
                key={`${item.line}-${index}`}
                onClick={() => {
                  // TODO: 滚动到对应行
                }}
                className="w-full text-left px-4 py-1 hover:bg-[#f1f1ef] transition-colors"
                style={{ paddingLeft: `${(item.level - 1) * 12 + 16}px` }}
              >
                <span
                  className={`text-sm ${
                    item.level === 1
                      ? 'font-semibold text-[#37352f]'
                      : item.level === 2
                      ? 'font-medium text-[#37352f]'
                      : 'text-[#787774]'
                  }`}
                >
                  {item.text}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </motion.aside>
  )
}
