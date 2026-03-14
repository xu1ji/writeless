import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from 'electron'
import * as path from 'path'
import * as fs from 'fs/promises'
import * as fsp from 'fs'
import { watch } from 'chokidar'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let mainWindow: BrowserWindow | null = null
let currentWorkspace: string | null = null
let watcher: ReturnType<typeof watch> | null = null

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#ffffff',
    show: false,
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  if (isDev) {
    await mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // macOS 特有：点击 dock 图标时重新显示窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      mainWindow?.show()
    }
  })
}

// ============================================
// IPC Handlers - 文件系统操作
// ============================================

// 打开文件夹对话框
ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory', 'createDirectory'],
    title: '选择笔记文件夹',
  })

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  const folderPath = result.filePaths[0]
  currentWorkspace = folderPath

  // 设置 watcher 监听文件变化
  setupFileWatcher(folderPath)

  return folderPath
})

// 读取目录结构
ipcMain.handle('fs:readDirectory', async (_, dirPath: string) => {
  return readDirectoryRecursive(dirPath)
})

// 读取文件内容
ipcMain.handle('fs:readFile', async (_, filePath: string) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return { success: true, content }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// 保存文件内容
ipcMain.handle('fs:saveFile', async (_, filePath: string, content: string) => {
  try {
    await fs.writeFile(filePath, content, 'utf-8')
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// 创建文件
ipcMain.handle('fs:createFile', async (_, filePath: string, content: string = '') => {
  try {
    // 确保父目录存在
    const parentDir = path.dirname(filePath)
    await fs.mkdir(parentDir, { recursive: true })
    await fs.writeFile(filePath, content, 'utf-8')
    return { success: true, path: filePath }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// 创建文件夹
ipcMain.handle('fs:createFolder', async (_, folderPath: string) => {
  try {
    await fs.mkdir(folderPath, { recursive: true })
    return { success: true, path: folderPath }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// 重命名文件/文件夹
ipcMain.handle('fs:rename', async (_, oldPath: string, newName: string) => {
  try {
    const parentDir = path.dirname(oldPath)
    const newPath = path.join(parentDir, newName)

    // 检查新名称是否已存在
    try {
      await fs.access(newPath)
      return { success: false, error: '名称已存在' }
    } catch {
      // 不存在，可以重命名
    }

    await fs.rename(oldPath, newPath)
    return { success: true, newPath }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// 删除文件/文件夹
ipcMain.handle('fs:delete', async (_, targetPath: string) => {
  try {
    const stats = await fs.stat(targetPath)
    if (stats.isDirectory()) {
      await fs.rm(targetPath, { recursive: true })
    } else {
      await fs.unlink(targetPath)
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// 移动文件/文件夹（用于拖拽）
ipcMain.handle('fs:move', async (_, sourcePath: string, targetPath: string) => {
  try {
    // 获取源文件/文件夹名称
    const name = path.basename(sourcePath)
    const destPath = path.join(targetPath, name)

    // 检查目标是否已存在
    try {
      await fs.access(destPath)
      return { success: false, error: '目标位置已存在同名文件' }
    } catch {
      // 不存在，可以移动
    }

    await fs.rename(sourcePath, destPath)
    return { success: true, newPath: destPath }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// 获取文件信息
ipcMain.handle('fs:getStats', async (_, filePath: string) => {
  try {
    const stats = await fs.stat(filePath)
    return {
      success: true,
      stats: {
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        size: stats.size,
        createdTime: stats.birthtime.toISOString(),
        modifiedTime: stats.mtime.toISOString(),
      }
    }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// 获取当前工作区路径
ipcMain.handle('workspace:getCurrent', () => {
  return currentWorkspace
})

// ============================================
// Helper Functions
// ============================================

interface FileTreeNode {
  name: string
  path: string
  isDirectory: boolean
  children?: FileTreeNode[]
  modifiedTime?: string
}

async function readDirectoryRecursive(dirPath: string, depth: number = 0): Promise<FileTreeNode[]> {
  if (depth > 10) return [] // 防止无限递归

  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const nodes: FileTreeNode[] = []

  // 排序：文件夹优先，然后按名称排序
  const sortedEntries = entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1
    if (!a.isDirectory() && b.isDirectory()) return 1
    return a.name.localeCompare(b.name, 'zh-CN')
  })

  for (const entry of sortedEntries) {
    // 跳过隐藏文件和系统文件
    if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue

    const fullPath = path.join(dirPath, entry.name)
    const node: FileTreeNode = {
      name: entry.name,
      path: fullPath,
      isDirectory: entry.isDirectory(),
    }

    if (entry.isDirectory()) {
      try {
        node.children = await readDirectoryRecursive(fullPath, depth + 1)
      } catch {
        // 权限问题等，跳过
        continue
      }
    } else {
      // 只显示 Markdown 文件
      if (!entry.name.endsWith('.md')) continue

      try {
        const stats = await fs.stat(fullPath)
        node.modifiedTime = stats.mtime.toISOString()
      } catch {
        // 忽略错误
      }
    }

    nodes.push(node)
  }

  return nodes
}

function setupFileWatcher(workspacePath: string) {
  // 清理旧的 watcher
  if (watcher) {
    watcher.close()
  }

  watcher = watch(workspacePath, {
    ignored: /(^|[\/\\])\..|node_modules/,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
  })

  watcher.on('add', (filePath) => {
    if (filePath.endsWith('.md')) {
      mainWindow?.webContents.send('fs:change', { type: 'add', path: filePath })
    }
  })

  watcher.on('change', (filePath) => {
    mainWindow?.webContents.send('fs:change', { type: 'change', path: filePath })
  })

  watcher.on('unlink', (filePath) => {
    mainWindow?.webContents.send('fs:change', { type: 'delete', path: filePath })
  })

  watcher.on('addDir', (filePath) => {
    mainWindow?.webContents.send('fs:change', { type: 'addDir', path: filePath })
  })

  watcher.on('unlinkDir', (filePath) => {
    mainWindow?.webContents.send('fs:change', { type: 'deleteDir', path: filePath })
  })
}

// ============================================
// App Lifecycle
// ============================================

app.whenReady().then(async () => {
  await createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  if (watcher) {
    watcher.close()
  }
})
