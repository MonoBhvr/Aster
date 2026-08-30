import { emit } from '@tauri-apps/api/event'

/** Broadcast a typed platform event to the current Tauri application. */
export default function broadcastPlatformMessage (channel: string, ...args: unknown[]): void {
  void emit(channel, args.length === 1 ? args[0] : args).catch(error => {
    console.error(`[Platform] Could not emit ${channel}`, error)
  })
}
