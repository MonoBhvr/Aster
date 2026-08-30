/** Returns the platform-neutral accent colours used by the renderer. */
export function getSystemColors (): { accent: string, contrast: string } {
  // Tauri supplies the native colour through the appearance command. The
  // renderer fallback remains deterministic for first paint and Linux.
  return { accent: '1cb27e', contrast: 'ffffff' }
}
