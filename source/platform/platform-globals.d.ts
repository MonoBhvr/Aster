import type { PlatformRuntime } from './renderer-api'

declare global {
  interface Window {
    platform: PlatformRuntime
  }
}

export {}
