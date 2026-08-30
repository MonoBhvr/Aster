import { invoke } from '@tauri-apps/api/core'
import type { DesktopAdapter, DirectoryEntry, OpenDialogOptions, SaveDialogOptions } from './desktop'

/** Tauri command implementation of the portable renderer desktop API. */
export const tauriDesktopAdapter: DesktopAdapter = {
  readTextFile: async (path) => await invoke<string>('read_text_file', { path }),
  writeTextFile: async (path, contents) => { await invoke('write_text_file', { path, contents }) },
  readDirectory: async (path) => await invoke<DirectoryEntry[]>('read_directory', { path }),
  createDirectory: async (path, recursive = true) => { await invoke('create_directory', { path, recursive }) },
  renamePath: async (source, destination) => { await invoke('rename_path', { source, destination }) },
  removePath: async (path, recursive = false) => { await invoke('remove_path', { path, recursive }) },
  openDialog: async (options: OpenDialogOptions = {}) => await invoke<string[]>('open_dialog', { options }),
  saveDialog: async (options: SaveDialogOptions = {}) => await invoke<string | null>('save_dialog', { options }),
  openExternalUrl: async (url) => { await invoke('open_external_url', { url }) },
  readClipboardText: async () => await invoke<string>('read_clipboard_text'),
  writeClipboardText: async (text) => { await invoke('write_clipboard_text', { text }) }
}
