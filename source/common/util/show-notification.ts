/** Portable notification helper used by the Tauri webview. */
export function showNativeNotification (message: string, title: string = 'Aster', callback?: () => void): boolean {
  if (typeof Notification === 'undefined' || Notification.permission === 'denied') {
    return false
  }

  const show = (): void => {
    const notification = new Notification(title, { body: message, silent: true })
    if (callback !== undefined) {
      notification.onclick = callback
    }
  }

  if (Notification.permission === 'granted') {
    show()
  } else {
    void Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        show()
      }
    })
  }
  return true
}
