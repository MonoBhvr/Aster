import { installPlatformRuntime } from 'source/platform/renderer-api'
import './styles.css'

// Install the platform boundary before loading the Aster renderer.
// The renderer is deliberately loaded dynamically because its stores register
// against the platform during module evaluation.
installPlatformRuntime()
void import('../win-main/index').catch(error => {
  console.error('[Tauri] Could not start Aster renderer', error)
  const root = document.getElementById('app')
  if (root !== null) {
    root.textContent = 'Aster renderer failed to load. Check the developer log for details.'
  }
})
