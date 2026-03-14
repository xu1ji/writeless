export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
  content?: string;
}

export interface AppState {
  files: FileNode[];
  activeFile: FileNode | null;
  isSidebarOpen: boolean;
}
