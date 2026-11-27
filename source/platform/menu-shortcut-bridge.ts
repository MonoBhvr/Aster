export function shortcutFromMenuResponse (response: unknown): string|undefined {
  if (typeof response !== 'object' || response === null) {
    return undefined
  }

  const message = response as { command?: unknown, payload?: unknown }
  return message.command === 'shortcut' && typeof message.payload === 'string'
    ? message.payload
    : undefined
}
