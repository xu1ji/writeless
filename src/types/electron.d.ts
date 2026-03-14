// Electron API 类型声明

export interface FileTreeNode {
  name: string
  path: string
  isDirectory: boolean
  children?: FileTreeNode[]
  modifiedTime?: string
}

export interface FileStats {
  isDirectory: boolean
  isFile: boolean
  size: number
  createdTime: string
  modifiedTime: string
}

export interface FSResult<T = void> {
  success: boolean
  error?: string
  data?: T
}

export interface FileChangeEvent {
  type: 'add' | 'change' | 'delete' | 'addDir' | 'deleteDir'
  path: string
}

export interface ElectronAPI {
  // 对话框
  openFolder: () => Promise<string | null>

  // 目录操作
  readDirectory: (dirPath: string) => Promise<FileTreeNode[]>

  // 文件操作
  readFile: (filePath: string) => Promise<FSResult<string>>
  saveFile: (filePath: string, content: string) => Promise<FSResult>
  createFile: (filePath: string, content?: string) => Promise<FSResult<string>>
  createFolder: (folderPath: string) => Promise<FSResult<string>>

  // 文件管理
  rename: (oldPath: string, newName: string) => Promise<FSResult<string>>
  delete: (targetPath: string) => Promise<FSResult>
  move: (sourcePath: string, targetPath: string) => Promise<FSResult<string>>

  // 文件信息
  getStats: (filePath: string) => Promise<FSResult<FileStats>>

  // 工作区
  getCurrentWorkspace: () => Promise<string | null>

  // 文件变化监听
  onFileChange: (callback: (event: FileChangeEvent) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
