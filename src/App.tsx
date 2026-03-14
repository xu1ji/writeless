import { useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { FileNode } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X } from 'lucide-react';

const sampleFiles: FileNode[] = [
  {
    name: "笔记",
    path: "/笔记",
    isDirectory: true,
    children: [
      {
        name: "每日记录",
        path: "/笔记/每日记录",
        isDirectory: true,
        children: [
          {
            name: "2024-03-14.md",
            path: "/笔记/每日记录/2024-03-14.md",
            isDirectory: false,
            content: "# 今日待办\n\n- [ ] 写文档\n- [x] 开会\n- [ ] 代码审查\n\n## 学习计划\n\n今天学习 **CodeMirror 6** 的装饰器系统。这是一个*非常强大*的工具。\n\n> 保持简单，保持专注。\n\n`const code = 'WriteLess';`"
          }
        ]
      },
      {
        name: "想法.md",
        path: "/笔记/想法.md",
        isDirectory: false,
        content: "## 关于项目的一些想法\n\n这是一个**粗体**测试。\n\n这是一个*斜体*测试。\n\n> 引用块测试\n\n- 列表项 1\n- 列表项 2\n  - 子列表项"
      }
    ]
  }
];

export default function App() {
  const [files, setFiles] = useState<FileNode[]>(sampleFiles);
  const [activeFile, setActiveFile] = useState<FileNode | null>(sampleFiles[0].children![1]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleFileSelect = (file: FileNode) => {
    setActiveFile(file);
  };

  const handleContentChange = useCallback((newContent: string) => {
    if (!activeFile) return;
    
    // In a real app, we would update the file system state
    // For this demo, we just update the active file's content
    setActiveFile(prev => prev ? { ...prev, content: newContent } : null);
    
    // Update in the main files tree (recursive update)
    const updateFiles = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.path === activeFile.path) {
          return { ...node, content: newContent };
        }
        if (node.children) {
          return { ...node, children: updateFiles(node.children) };
        }
        return node;
      });
    };
    
    setFiles(prev => updateFiles(prev));
  }, [activeFile]);

  return (
    <div className="flex h-screen w-full bg-white text-[#37352f] overflow-hidden font-sans">
      {/* Mobile Sidebar Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed bottom-6 right-6 z-50 p-3 bg-[#2383e2] text-white rounded-full shadow-lg lg:hidden"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.div
            initial={{ x: -240 }}
            animate={{ x: 0 }}
            exit={{ x: -240 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="z-40"
          >
            <Sidebar 
              files={files} 
              activeFile={activeFile} 
              onFileSelect={handleFileSelect} 
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        {activeFile ? (
          <Editor 
            content={activeFile.content || ''} 
            onChange={handleContentChange} 
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#37352f]/40">
            <div className="text-center">
              <h2 className="text-2xl font-medium mb-2">WriteLess</h2>
              <p>选择一个文件开始编辑</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
