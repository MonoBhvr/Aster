import { strictEqual } from 'assert'
import { shortcutFromMenuResponse } from 'source/platform/menu-shortcut-bridge'
import { getUiShortcutCommand, getUiShortcutCommandForTarget, isNativeEditableTarget } from 'source/platform/ui-shortcut-bridge'
import { dispatchActiveDocumentSave } from 'source/win-main/active-document-save'

describe('Platform menu and UI shortcut bridge', function () {
  it('forwards only explicit menu shortcut responses', function () {
    strictEqual(shortcutFromMenuResponse({ command: 'shortcut', payload: 'save-file' }), 'save-file')
    strictEqual(shortcutFromMenuResponse({ command: 'application-menu', payload: [] }), undefined)
    strictEqual(shortcutFromMenuResponse({ command: 'shortcut', payload: null }), undefined)
  })

  it('matches configured UI shortcuts with the correct platform modifier', function () {
    const shortcuts = {
      'previous-tab': 'Mod-Shift-ArrowLeft',
      'next-tab': 'Mod-ArrowRight',
      'filter-files': ''
    }

    strictEqual(getUiShortcutCommand({
      key: 'ArrowRight', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false
    }, shortcuts, 'win32'), 'next-tab')
    strictEqual(getUiShortcutCommand({
      key: 'ArrowRight', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false
    }, shortcuts, 'darwin'), undefined)
    strictEqual(getUiShortcutCommand({
      key: 'ArrowLeft', ctrlKey: false, metaKey: true, altKey: false, shiftKey: true
    }, shortcuts, 'darwin'), 'previous-tab')
  })

  it('uses legacy defaults when the configured binding is empty', function () {
    const shortcuts = { 'previous-tab': '', 'next-tab': '', 'filter-files': '' }
    strictEqual(getUiShortcutCommand({
      key: 'Tab', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false
    }, shortcuts, 'win32'), 'next-tab')
  })

  it('routes UI shortcuts only from CodeMirror editable roots', function () {
    document.body.innerHTML = `
      <input id="filter">
      <textarea id="notes"></textarea>
      <select id="view"><option>List</option></select>
      <button id="toolbar-button"></button>
      <div id="rich" contenteditable="true"></div>
      <div class="cm-editor"><div class="cm-scroller"><div class="cm-content" contenteditable="true">
        <span id="cm-text"></span>
        <input id="cm-checkbox" type="checkbox">
        <figure><figcaption id="cm-caption" contenteditable="true"><span id="cm-caption-text"></span></figcaption></figure>
        <div class="cm-table-editor-widget-wrapper"><table><tbody><tr><td><div class="content"><div class="cm-editor"><div class="cm-scroller"><div id="table-cm-text" class="cm-content" contenteditable="true"><span>Cell</span></div></div></div></div></td></tr></tbody></table></div>
      </div></div></div>
    `

    const event = {
      key: 'Tab', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false
    }
    const shortcuts = { 'previous-tab': '', 'next-tab': '', 'filter-files': '' }

    for (const selector of ['#filter', '#notes', '#view', '#cm-checkbox', '#rich', '#cm-caption-text']) {
      strictEqual(isNativeEditableTarget(document.querySelector(selector)), true, selector)
      strictEqual(getUiShortcutCommandForTarget(event, document.querySelector(selector), shortcuts, 'win32'), undefined, selector)
    }

    for (const selector of ['#toolbar-button', '#cm-text', '#table-cm-text']) {
      strictEqual(isNativeEditableTarget(document.querySelector(selector)), false, selector)
      strictEqual(getUiShortcutCommandForTarget(event, document.querySelector(selector), shortcuts, 'win32'), 'next-tab', selector)
    }
  })

  it('dispatches Save once to the active document even when a form control has focus', function () {
    document.body.innerHTML = '<input id="filter">'
    const filter = document.querySelector('#filter') as HTMLInputElement
    filter.focus()
    const dispatched: Array<{ leafId: string, filePath: string }> = []

    const wasDispatched = dispatchActiveDocumentSave([
      { id: 'inactive', activeFile: { path: '/inactive.md' } },
      { id: 'active', activeFile: { path: '/active.md' } }
    ], 'active', target => dispatched.push(target))

    strictEqual(wasDispatched, true)
    strictEqual(dispatched.length, 1)
    strictEqual(dispatched[0].leafId, 'active')
    strictEqual(dispatched[0].filePath, '/active.md')
  })

  it('does not dispatch Save when the active pane has no document', function () {
    let dispatchCount = 0

    const wasDispatched = dispatchActiveDocumentSave([
      { id: 'active', activeFile: null }
    ], 'active', () => { dispatchCount++ })

    strictEqual(wasDispatched, false)
    strictEqual(dispatchCount, 0)
  })
})
