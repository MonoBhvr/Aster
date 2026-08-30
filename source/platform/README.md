# Renderer platform boundary

`source/platform` is the only renderer-to-native boundary. Vue, Pinia, and
CodeMirror use its typed API; only this boundary imports the Tauri JavaScript
API. Filesystem, dialogs, clipboard, shell, configuration, and native events
are implemented by commands in `src-tauri`.

`source/tauri/index.ts` installs the platform runtime and then loads the
existing `source/win-main` renderer. There is one frontend and one native host;
no second editor or compatibility runtime is maintained.
