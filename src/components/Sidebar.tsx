import React, { useState } from 'react';
import { Folder, FileText, ChevronRight, ChevronDown, FolderOpen } from 'lucide-react';
import { FileNode } from '../types';

interface SidebarProps {
  files: FileNode[];
  activeFile: FileNode | null;
  onFileSelect: (file: FileNode) => void;
}

const FileNodeItem: React.FC<{
  node: FileNode;
  level: number;
  activeFile: FileNode | null;
  onFileSelect: (file: FileNode) => void;
}> = ({ node, level, activeFile, onFileSelect }) => {
  const [isOpen, setIsOpen] = useState(true);
  const isActive = activeFile?.path === node.path;

  const handleClick = () => {
    if (node.isDirectory) {
      setIsOpen(!isOpen);
    } else {
      onFileSelect(node);
    }
  };

  return (
    <div>
      <div
        className={`flex items-center h-7 px-3 cursor-pointer text-sm transition-colors duration-150 group
          ${isActive ? 'bg-[#eceae5] border-l-2 border-[#2383e2]' : 'hover:bg-[#eceae5] border-l-2 border-transparent'}
        `}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        onClick={handleClick}
      >
        <span className="mr-1.5 text-[#37352f]/50">
          {node.isDirectory ? (
            isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : (
            <FileText size={14} />
          )}
        </span>
        <span className="truncate text-[#37352f]">{node.name}</span>
      </div>
      {node.isDirectory && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileNodeItem
              key={child.path}
              node={child}
              level={level + 1}
              activeFile={activeFile}
              onFileSelect={onFileSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ files, activeFile, onFileSelect }) => {
  return (
    <aside className="w-60 h-full bg-[#f7f6f3] flex flex-col border-r border-[#eceae5] select-none">
      <div className="p-3">
        <button className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-[#37352f] bg-white border border-[#eceae5] rounded hover:bg-[#f1f1ef] transition-colors">
          <FolderOpen size={16} />
          <span>打开文件夹</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto pt-2">
        {files.map((file) => (
          <FileNodeItem
            key={file.path}
            node={file}
            level={0}
            activeFile={activeFile}
            onFileSelect={onFileSelect}
          />
        ))}
      </div>
    </aside>
  );
};
