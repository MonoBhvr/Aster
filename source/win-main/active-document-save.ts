export interface ActiveDocumentPane {
  id: string
  activeFile: { path: string }|null
}

export interface ActiveDocumentSaveTarget {
  leafId: string
  filePath: string
}

/**
 * Dispatches Save to the document selected by the document tree's active leaf.
 * Focus may belong to a sidebar or form control when a menu command arrives.
 */
export function dispatchActiveDocumentSave (
  panes: ActiveDocumentPane[],
  activeLeafId: string|undefined,
  dispatch: (target: ActiveDocumentSaveTarget) => void
): boolean {
  if (activeLeafId === undefined) {
    return false
  }

  const pane = panes.find(pane => pane.id === activeLeafId)
  if (pane === undefined) {
    return false
  }

  const filePath = pane.activeFile?.path
  if (typeof filePath !== 'string' || filePath === '') {
    return false
  }

  dispatch({ leafId: pane.id, filePath })
  return true
}
