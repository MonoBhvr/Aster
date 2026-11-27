import { defaultKeybindings, type MenuShortcutName } from 'source/common/modules/markdown-editor/keymaps/menu-shortcuts'
import type { ConfigOptions } from './config-template'

type Platform = 'darwin'|'win32'|'linux'

interface KeyboardShortcutEvent {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  shiftKey: boolean
}

/**
 * CodeMirror owns its editable surface but UI shortcuts still need to bubble
 * out of it. Native controls and ordinary contenteditable elements retain
 * their normal keyboard handling.
 */
export function isNativeEditableTarget (target: EventTarget|null): boolean {
  if (target === null || typeof target !== 'object' || !('closest' in target) ||
    typeof target.closest !== 'function') {
    return false
  }

  const element = target as Element
  if (element.closest('input, textarea, select') !== null) {
    return true
  }

  const editableRoot = element.closest('[contenteditable]:not([contenteditable="false"])')
  return editableRoot !== null && !editableRoot.matches('.cm-content')
}

function defaultShortcutForPlatform (name: MenuShortcutName, platform: Platform): string|undefined {
  const binding = defaultKeybindings[name]
  if (platform === 'darwin') {
    return binding.mac ?? binding.key
  }
  if (platform === 'win32') {
    return binding.win ?? binding.key
  }
  return binding.linux ?? binding.key
}

function effectiveShortcut (name: MenuShortcutName, shortcuts: ConfigOptions['shortcuts']['ui'], platform: Platform): string|undefined {
  const configured = shortcuts[name]?.trim()
  return configured === '' || configured === undefined
    ? defaultShortcutForPlatform(name, platform)
    : configured
}

function matchesShortcut (event: KeyboardShortcutEvent, shortcut: string, platform: Platform): boolean {
  const keys = shortcut.split('-').map(key => key.trim()).filter(key => key !== '')
  const key = keys.pop()
  if (key === undefined) {
    return false
  }

  const modifiers = new Set(keys.map(key => key.toLowerCase()))
  const expectsControl = modifiers.has('ctrl') || modifiers.has('control') ||
    (modifiers.has('mod') && platform !== 'darwin')
  const expectsMeta = modifiers.has('cmd') || modifiers.has('command') || modifiers.has('meta') ||
    (modifiers.has('mod') && platform === 'darwin')

  return event.ctrlKey === expectsControl &&
    event.metaKey === expectsMeta &&
    event.altKey === modifiers.has('alt') &&
    event.shiftKey === modifiers.has('shift') &&
    event.key.toLowerCase() === key.toLowerCase()
}

/**
 * Returns the configured UI command matched by a browser keyboard event.
 * The caller remains responsible for dispatching the command through the
 * existing platform shortcut channel.
 */
export function getUiShortcutCommand (
  event: KeyboardShortcutEvent,
  shortcuts: ConfigOptions['shortcuts']['ui'],
  platform: Platform
): MenuShortcutName|undefined {
  for (const name of Object.keys(defaultKeybindings) as MenuShortcutName[]) {
    const shortcut = effectiveShortcut(name, shortcuts, platform)
    if (shortcut !== undefined && matchesShortcut(event, shortcut, platform)) {
      return name
    }
  }
  return undefined
}

/** Resolves a UI shortcut only when the event target is safe for UI routing. */
export function getUiShortcutCommandForTarget (
  event: KeyboardShortcutEvent,
  target: EventTarget|null,
  shortcuts: ConfigOptions['shortcuts']['ui'],
  platform: Platform
): MenuShortcutName|undefined {
  if (isNativeEditableTarget(target)) {
    return undefined
  }

  return getUiShortcutCommand(event, shortcuts, platform)
}
