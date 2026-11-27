import { convertFileSrc, invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { getConfigTemplate, type ConfigOptions } from 'source/platform/config-template'
import type { GenericPlatformEvent, PlatformEventMap } from 'source/platform/contracts'
import { pathDirname, isWin32Path } from 'source/common/util/renderer-path-polyfill'
import { shortcutFromMenuResponse } from './menu-shortcut-bridge'
import { getUiShortcutCommandForTarget } from './ui-shortcut-bridge'

/** A serialisable request understood by the Tauri provider gateway. */
export interface PlatformRequest {
  channel: string
  message?: unknown
}

type EventListener<T> = { listen(event: undefined, payload: T): void }['listen']

export interface PlatformIpc {
  invoke<T = never>(channel: string, message?: unknown): Promise<T>
  send(channel: string, message?: unknown): void
  sendSync<T = never>(channel: string, message?: unknown): T
  on<K extends string>(channel: K, listener: EventListener<K extends keyof PlatformEventMap ? PlatformEventMap[K] : GenericPlatformEvent>): () => void
}

export interface PlatformConfig {
  get<T = unknown>(property?: string): T
  set(property: string, value: unknown): void
}

export interface PlatformRuntime {
  ipc: PlatformIpc
  config: PlatformConfig
  /** Normalised OS name used by portable UI logic. */
  os: 'darwin' | 'win32' | 'linux'
  getCitationCallback(database: string): (citations: CiteItem[], composite: boolean) => string | undefined
  toAssetUrl(path: string): string
  getPathForFile(file: File): string | undefined
}

let cachedConfig: ConfigOptions = getConfigTemplate()
const listeners = new Map<string, Set<(event: undefined, payload: unknown) => void>>()
const tauriListeners = new Map<string, Promise<UnlistenFn>>()
const documentState = {
  type: 'leaf' as const,
  id: 'main',
  openFiles: [] as Array<{ path: string, pinned: boolean }>,
  activeFile: null as { path: string, pinned: boolean } | null
}

function readConfigProperty<T> (property?: string): T {
  if (property === undefined || property === '') {return cachedConfig as unknown as T}
  let current: unknown = cachedConfig
  for (const key of property.split('.')) {
    if (typeof current !== 'object' || current === null || !(key in current)) {return undefined as T}
    current = (current as Record<string, unknown>)[key]
  }
  return current as T
}

function dispatch (channel: string, payload: unknown): void {
  if (channel === 'config-provider' && typeof payload === 'object' && payload !== null &&
    'command' in payload && payload.command === 'update') {
    void refreshConfigFromBackend()
  }
  const channelListeners = listeners.get(channel)
  if (channelListeners === undefined) {return}
  for (const listener of channelListeners) {listener(undefined, payload)}
}

async function invokeProvider<T> (channel: string, message?: unknown): Promise<T> {
  // Tab state is renderer state. Keeping it here lets the existing Aster
  // components continue to use their document-provider contract while the
  // filesystem and document bytes live in Rust.
  if (channel === 'documents-provider' && typeof message === 'object' && message !== null) {
    const request = message as { command?: string, payload?: Record<string, unknown> }
    if (request.command === 'retrieve-tab-config') {return structuredClone(documentState) as T}
    if (request.command === 'get-file-modification-status') {return [] as T}
    if (request.command === 'open-file' && typeof request.payload?.path === 'string') {
      const path = request.payload.path
      const existing = documentState.openFiles.find(file => file.path === path)
      const file = existing ?? { path, pinned: false }
      if (existing === undefined) {documentState.openFiles.push(file)}
      documentState.activeFile = file
      const context = {
        leafId: typeof request.payload.leafId === 'string' ? request.payload.leafId : 'main',
        windowId: typeof request.payload.windowId === 'string' ? request.payload.windowId : 'main',
        filePath: path
      }
      dispatch('documents-update', { event: 'file-opened', context })
      dispatch('documents-update', { event: 'active-file-changed', context })
      return true as T
    }
    if (request.command === 'close-file' || request.command === 'close-file-everywhere') {
      const path = typeof request.payload?.path === 'string' ? request.payload.path : undefined
      if (path !== undefined) {
        documentState.openFiles = documentState.openFiles.filter(file => file.path !== path)
        dispatch('documents-update', {
          event: 'file-closed',
          context: {
            filePath: path,
            windowId: typeof request.payload?.windowId === 'string' ? request.payload.windowId : 'main',
            leafId: typeof request.payload?.leafId === 'string' ? request.payload.leafId : 'main'
          }
        })
      }
      if (documentState.activeFile?.path === path) {
        documentState.activeFile = documentState.openFiles[0] ?? null
        dispatch('documents-update', {
          event: 'active-file-changed',
          context: {
            filePath: documentState.activeFile?.path,
            windowId: typeof request.payload?.windowId === 'string' ? request.payload.windowId : 'main',
            leafId: typeof request.payload?.leafId === 'string' ? request.payload.leafId : 'main'
          }
        })
      }
      return true as T
    }
  }
  const result = await invoke<T>('provider_request', { channel, message })
  if (channel === 'application' && typeof message === 'object' && message !== null) {
    const request = message as { command?: string, payload?: Record<string, unknown> }
    if ((request.command === 'file-rename' || request.command === 'dir-rename') &&
      typeof request.payload?.path === 'string' && typeof request.payload.name === 'string') {
      const oldPath = request.payload.path
      const separator = isWin32Path(oldPath) ? '\\' : '/'
      const parent = pathDirname(oldPath)
      const newPath = `${parent}${parent.endsWith(separator) ? '' : separator}${request.payload.name}`
      documentState.openFiles = documentState.openFiles.map(file => {
        if (file.path === oldPath || (request.command === 'dir-rename' && file.path.startsWith(`${oldPath}${separator}`))) {
          return { ...file, path: newPath + file.path.substring(oldPath.length) }
        }
        return file
      })
      const activePath = documentState.activeFile?.path
      if (activePath !== undefined &&
        (activePath === oldPath || (request.command === 'dir-rename' && activePath.startsWith(`${oldPath}${separator}`)))) {
        const updatedActivePath = newPath + activePath.substring(oldPath.length)
        documentState.activeFile = documentState.openFiles.find(file => file.path === updatedActivePath) ?? null
      }
      dispatch('documents-update', {
        event: 'files-sorted',
        context: { windowId: 'main', leafId: 'main', filePath: newPath }
      })
    }
  }
  return result
}

const ipc: PlatformIpc = {
  invoke: invokeProvider,
  send: (channel, message) => {
    void invokeProvider(channel, message)
      .then(result => {
        // The original renderer receives menu-provider responses as events.
        // Tauri returns command results, so bridge this response back through
        // the same typed event channel.
        if (channel === 'menu-provider' && typeof result === 'object' && result !== null) {
          const shortcut = shortcutFromMenuResponse(result)
          if (shortcut !== undefined) {
            dispatch('shortcut', shortcut)
          } else {
            dispatch(channel, result)
          }
        }
      })
      .catch(error => console.error(`[Platform] ${channel}`, error))
  },
  // Tauri commands are asynchronous. This synchronous compatibility-shaped
  // method is intentionally limited to the local configuration cache; all
  // other platform operations must use invoke().
  sendSync: <T>(channel: string, message?: unknown): T => {
    if (channel === 'config-provider') {
      const request = message as { command?: string, payload?: { key?: string, val?: unknown } } | undefined
      if (request?.command === 'set-config-single' && request.payload?.key !== undefined) {
        setConfigValue(request.payload.key, request.payload.val)
        return true as T
      }
      return cachedConfig as unknown as T
    }
    throw new Error(`Synchronous platform request is not supported: ${channel}`)
  },
  on: (channel, listener) => {
    let channelListeners = listeners.get(channel)
    if (channelListeners === undefined) {
      channelListeners = new Set()
      listeners.set(channel, channelListeners)
      tauriListeners.set(channel, listen<unknown>(channel, event => dispatch(channel, event.payload)))
    }
    channelListeners.add(listener as unknown as (event: undefined, payload: unknown) => void)
    return () => {
      channelListeners?.delete(listener as unknown as (event: undefined, payload: unknown) => void)
      if (channelListeners?.size === 0) {listeners.delete(channel)}
    }
  }
}

function setConfigValue (property: string, value: unknown): void {
  const keys = property.split('.')
  let target: Record<string, unknown> = cachedConfig as unknown as Record<string, unknown>
  for (const key of keys.slice(0, -1)) {
    const next = target[key]
    if (typeof next !== 'object' || next === null) {target[key] = {}}
    target = target[key] as Record<string, unknown>
  }
  target[keys[keys.length - 1]] = value
  void invokeProvider('config-provider', {
    command: 'set-config-single',
    payload: { key: property, val: value }
  }).catch(error => console.error('[Platform] Could not persist configuration', error))
}

const config: PlatformConfig = {
  get: readConfigProperty,
  set: setConfigValue
}

const detectedOs: PlatformRuntime['os'] = /Macintosh|Mac OS X/i.test(navigator.userAgent)
  ? 'darwin'
  : /Windows/i.test(navigator.userAgent) ? 'win32' : 'linux'

export const platformRuntime: PlatformRuntime = {
  ipc,
  config,
  os: detectedOs,
  getCitationCallback: () => () => undefined,
  toAssetUrl: (path) => convertFileSrc(path),
  getPathForFile: (file) => {
    // Tauri does not expose a native path for a browser File. Dropped files
    // are handled by the Tauri drag/drop event and the backend, while this
    // fallback keeps ordinary browser-originated drops safe.
    return file.name !== '' ? undefined : undefined
  }
}

function mergeConfig (base: ConfigOptions, overrides: unknown): ConfigOptions {
  if (typeof overrides !== 'object' || overrides === null) {return base}
  const merge = (target: Record<string, unknown>, source: Record<string, unknown>): void => {
    for (const [ key, value ] of Object.entries(source)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const child = typeof target[key] === 'object' && target[key] !== null && !Array.isArray(target[key])
          ? target[key] as Record<string, unknown>
          : {}
        merge(child, value as Record<string, unknown>)
        target[key] = child
      } else {target[key] = value}
    }
  }
  const result = structuredClone(base) as unknown as Record<string, unknown>
  merge(result, overrides as Record<string, unknown>)
  return result as unknown as ConfigOptions
}

async function refreshConfigFromBackend (): Promise<void> {
  const value = await invoke<unknown>('get_config')
  cachedConfig = mergeConfig(cachedConfig, value)
  const channelListeners = listeners.get('config-provider')
  if (channelListeners !== undefined) {
    for (const listener of channelListeners) {listener(undefined, { command: 'update' })}
  }
}

// Hydrate persisted settings after the synchronous renderer bootstrap. This
// preserves the existing store contract without making every config read await.
void refreshConfigFromBackend().catch(() => {})

export function installPlatformRuntime (): void {
  window.platform = platformRuntime

  window.addEventListener('keydown', event => {
    if (event.defaultPrevented) {
      return
    }

    const command = getUiShortcutCommandForTarget(event, event.target, cachedConfig.shortcuts.ui, detectedOs)
    if (command !== undefined) {
      event.preventDefault()
      dispatch('shortcut', command)
    }
  })

  // Event registration is best-effort. A renderer must still mount if the
  // Tauri event bridge is not ready at the exact moment the page loads.
  try {
    ipc.on('fsal-event', (_event, payload) => {
      if (typeof payload !== 'object' || payload === null) { return }
      const event = payload as { event?: string, path?: string, descriptor?: { path?: string } }
      const filePath = event.path ?? event.descriptor?.path
      if (filePath === undefined) { return }
      const openFile = documentState.openFiles.some(file => file.path === filePath)
      if (!openFile) { return }
      if (event.event === 'change') {
        dispatch('documents-update', {
          event: 'file-remotely-changed',
          context: { filePath, windowId: 'main', leafId: 'main' }
        })
      } else if (event.event === 'unlink') {
        documentState.openFiles = documentState.openFiles.filter(file => file.path !== filePath)
        if (documentState.activeFile?.path === filePath) {
          documentState.activeFile = documentState.openFiles[0] ?? null
        }
        dispatch('documents-update', {
          event: 'file-closed',
          context: { filePath, windowId: 'main', leafId: 'main' }
        })
      }
    })
  } catch (error) {
    console.error('[Platform] Could not register filesystem events', error)
  }

  // Native file-drop paths are supplied by Tauri; browser File objects do not
  // contain absolute paths in a secure webview.
  try {
    void getCurrentWebview().onDragDropEvent(event => {
      if (event.payload.type === 'drop') {
        void invokeProvider('application', { command: 'roots-add', payload: event.payload.paths })
          .catch(error => console.error('[Platform] Could not open dropped paths', error))
      }
    }).catch(error => console.error('[Platform] Could not register file-drop handler', error))
  } catch (error) {
    console.error('[Platform] Could not initialize file-drop bridge', error)
  }
}
