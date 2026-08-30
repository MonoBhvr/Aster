import { installPlatformRuntime } from 'source/platform/renderer-api'
import './styles.css'

// Install the platform boundary before loading the existing Zettlr renderer.
// The renderer is deliberately loaded dynamically because its stores register
// against the platform during module evaluation.
installPlatformRuntime()
void import('../win-main/index').catch(error => {
  console.error('[Tauri] Could not start Zettlr renderer', error)
  const root = document.getElementById('app')
  if (root !== null) {
    root.textContent = 'Zettlr renderer failed to load. Check the developer log for details.'
  }
})
