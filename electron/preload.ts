import { contextBridge, ipcRenderer } from 'electron'

// 文件系统 API
const fsAPI = {
  // 对话框
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),

  // 目录操作
  readDirectory: (dirPath: string) => ipcRenderer.invoke('fs:readDirectory', dirPath),

  // 文件操作
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  saveFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:saveFile', filePath, content),
  createFile: (filePath: string, content?: string) => ipcRenderer.invoke('fs:createFile', filePath, content),
  createFolder: (folderPath: string) => ipcRenderer.invoke('fs:createFolder', folderPath),

  // 文件管理
  rename: (oldPath: string, newName: string) => ipcRenderer.invoke('fs:rename', oldPath, newName),
  delete: (targetPath: string) => ipcRenderer.invoke('fs:delete', targetPath),
  move: (sourcePath: string, targetPath: string) => ipcRenderer.invoke('fs:move', sourcePath, targetPath),

  // 文件信息
  getStats: (filePath: string) => ipcRenderer.invoke('fs:getStats', filePath),

  // 工作区
  getCurrentWorkspace: () => ipcRenderer.invoke('workspace:getCurrent'),

  // 文件变化监听
  onFileChange: (callback: (event: { type: string; path: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { type: string; path: string }) => {
      callback(data)
    }
    ipcRenderer.on('fs:change', handler)
    return () => ipcRenderer.removeListener('fs:change', handler)
  },
}

// 暴露给渲染进程
contextBridge.exposeInMainWorld('electronAPI', fsAPI)

// TypeScript 类型声明
export { fsAPI }
