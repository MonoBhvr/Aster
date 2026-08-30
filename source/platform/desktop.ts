/**
 * Cross-runtime desktop capabilities used by renderer code.
 *
 * This API deliberately contains only operations that can be represented by
 * both Electron and Tauri.  Electron's provider IPC remains behind the
 * legacy boundary while it is migrated incrementally.
 */
export interface DirectoryEntry {
  path: string
  name: string
  isDirectory: boolean
  isFile: boolean
}

export interface DialogFilter {
  name: string
  extensions: string[]
}

/** File-picker filter shared by forms and the native dialog adapter. */
export type FileFilter = DialogFilter

export interface OpenDialogOptions {
  title?: string
  defaultPath?: string
  filters?: DialogFilter[]
  multiple?: boolean
  directory?: boolean
}

export interface SaveDialogOptions {
  title?: string
  defaultPath?: string
  filters?: DialogFilter[]
}

export interface DesktopAdapter {
  readTextFile: (path: string) => Promise<string>
  writeTextFile: (path: string, contents: string) => Promise<void>
  readDirectory: (path: string) => Promise<DirectoryEntry[]>
  createDirectory: (path: string, recursive?: boolean) => Promise<void>
  renamePath: (source: string, destination: string) => Promise<void>
  removePath: (path: string, recursive?: boolean) => Promise<void>
  openDialog: (options?: OpenDialogOptions) => Promise<string[]>
  saveDialog: (options?: SaveDialogOptions) => Promise<string | null>
  openExternalUrl: (url: string) => Promise<void>
  readClipboardText: () => Promise<string>
  writeClipboardText: (text: string) => Promise<void>
}
