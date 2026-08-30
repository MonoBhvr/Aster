# Tauri 2 architecture

## Runtime

Zettlr has one application path: `source/tauri/index.ts` installs the typed
renderer platform runtime and loads the existing `source/win-main` Vue
renderer. Webpack produces `dist-tauri`; `src-tauri` is the only native host.
There is no second editor frontend, preload bridge, or desktop runtime.

## Platform boundary

Renderer code uses `source/platform` and does not invoke Tauri commands
throughout components. `renderer-api.ts` owns Tauri invoke/event wiring and
configuration hydration. `desktop.ts` and `tauri-desktop-adapter.ts` expose
filesystem, native dialogs, clipboard, external URLs, and path mutation.

## Rust responsibilities

`src-tauri/src/lib.rs` provides:

- UTF-8 file read/write and CodeMirror document authority persistence
- directory enumeration, recursive workspace scanning, metadata descriptors,
  create/rename/delete operations
- open/save dialogs, clipboard, and validated external URL launching
- configuration override persistence under the OS application configuration
  directory
- recursive `notify` filesystem watching rooted at active workspaces, with
  normalized/coalesced events and self-write suppression
- workspace-wide filename/content search events
- Tauri event delivery for configuration, filesystem, remote-document, and
  document-save notifications

Markdown metadata and CodeMirror state remain in portable TypeScript. Pandoc,
updater, print, and other subprocess/export ports remain intentionally out of
scope; they must be added in Rust rather than reintroducing Node filesystem or
process APIs.

## Removed boundary

The old Electron main/provider graph, preload globals, custom file URI, and
Electron packaging configuration are not part of the source tree or package
manifest. Historical release notes may still mention former implementation
details.

## Validation

```bash
corepack yarn install --immutable
corepack yarn lint:types
corepack yarn lint:code
corepack yarn tauri:build:frontend
corepack yarn tauri:check
corepack yarn tauri:fmt
corepack yarn tauri:test
corepack yarn tauri:build
```

Android SAF, custom markup, synchronization, and large UI redesign remain
outside this migration slice.
