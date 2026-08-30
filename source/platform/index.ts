import type { DesktopAdapter } from './desktop'
import { tauriDesktopAdapter } from './tauri-desktop-adapter'
export { installPlatformRuntime, platformRuntime } from './renderer-api'
export type { PlatformRuntime, PlatformIpc, PlatformConfig } from './renderer-api'

export type { DesktopAdapter, DirectoryEntry, DialogFilter, OpenDialogOptions, SaveDialogOptions } from './desktop'

/** The single desktop implementation used by the Tauri renderer. */
export const desktop: DesktopAdapter = tauriDesktopAdapter
