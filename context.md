# Scout Handoff — D: Restoration Reconnaissance (read-only, nothing modified)

Repo: `D:/Aster` = Zettlr 4.7.0 (`package.json` name `zettlr`) with an **Electron → Tauri migration** in flight.
Branch `develop` @ `76250038d` ("chore: Upgrade dependencies, fix type issue"), up to date with origin/develop.
**Worktree is dirty: 317 uncommitted changes** — mass deletion of the Electron main process (`source/app/**`, `forge.config.js`, `win-about`, `win-assets`, `source/app/service-providers/commands|menu|search/**`), plus modifications to citeproc utils, editor context-menus, `application-menu-helper.ts`, legacy window Vue files, and new files `source/win-main/shell/*`, `source/platform/*`, `src-tauri/*`.

No dev server running at scan time (no `zettlr-tauri.exe` process, no `.cargo-build-lock`). `dist-tauri/index.html` built 2026-08-29 16:25; `src-tauri/target` 2026-08-28. Prior context.md here was a PDFViewer/CSP scout report — now replaced by this handoff.

---

## Files Retrieved

### Shell (new custom UI — the polish target baseline)
1. `source/win-main/App.vue` (1–229, whole file read) — root component. Wires `AppShell` with FileManager/GlobalSearch (left slot), EditorPane/EditorBranch (main), ToCTab/RelatedFilesTab (right sidebar). `runCommand()` handles palette/shortcut commands; `platformIpc.on('shortcut', …)` handler at bottom is **dead code** (see Concerns).
2. `source/win-main/shell/AppShell.vue` (1–78) — CSS-grid shell: activity rail | left sidebar | workspace | right sidebar. Document-level `keydown` handles Ctrl+P (palette), Ctrl+O, Ctrl+Shift+F, Ctrl+S, Ctrl+`\`, Ctrl+Alt+`\`.
3. `source/win-main/shell/ActivityBar.vue` (1–21) — 3 buttons using text glyphs `▤ ⌕ ⚙` (no icon library).
4. `source/win-main/shell/LeftSidebar.vue` (1–18) / `RightSidebar.vue` (1–37) — right has Outline/Related tabs, persists `window.currentSidebarTab` via config store.
5. `source/win-main/shell/StatusBar.vue` (1–10), `WorkspaceHeader.vue` (1–28), `SettingsPanel.vue` (1–40: darkMode, editor fontSize, showStatusbar), `CommandPalette.vue` (1–37: 5 hardcoded commands).
6. `source/win-main/shell/shell.css` (1–83) — **dark-first design tokens** `--shell-*` (bg `#1e1e1e`, panel `#262626`, control `#363636`, text `#dadada`, accent `#6c9bd2`; light variant under `body:not(.dark)`); breakpoints 1050/720px; overrides for `#file-manager`, `#global-search-pane`, editor backgrounds.

### Feature components (legacy Zettlr components re-hosted in the shell)
7. `source/win-main/DocumentTabs.vue` (1221 lines; template 1–89, script 90–902, LESS styles 903–1221 + small css block 1207–1221) — legacy **light-only** tab bar (`rgb(215,215,215)`), `* ` prefix modified marker, close `×`, edge scrollers, drag support, per-tab context menu (line 40→`handleContextMenu`, tabbar context line 21→`displayTabbarContext`, `showPopupMenu` at 590). Only 3 `.dark` refs.
8. `source/win-main/tabs-context.ts` (1–26ish) — `displayTabbarContext`: single item "Close leaf".
9. `source/win-main/GlobalSearch.vue` (676; styles 570–676) — `#global-search-pane`, grid-based result rows, per-result context menu (line 505). Hardcoded light colors (`rgb(180,180,180)` borders/hovers) with 2 `body.dark` patches only.
10. `source/win-main/file-manager/FileManager.vue` (489; template 1–366, LESS 367–489) — `#file-manager` region, quick-filter input, arrow-button combined-mode toggle, keyboard nav.
11. `source/win-main/file-manager/FileTree.vue` (750; styles 599–750) — file-root contextmenu (line 22→`fileRootContextMenu`, menu at 351) and workspace-root (line 67→`workspaceRootContextMenu`, menu at 427) via `showPopupMenu`.
12. `source/win-main/file-manager/TreeItem.vue` (924; styles 744–924) — item contextmenu (line 21) → `useItemComposable().handleContextMenu` (`file-manager/util/item-composable.ts` line 216+) → `displayDirContext`/`displayFileContext` with callbacks (rename → inline editing, new file/dir, delete, properties popover, close workspace, project export).
13. `source/win-main/file-manager/FileList.vue` (500; LESS 450–500) — `RecycleScroller` virtual list (item-size 60 with meta / 30 without, `page-mode`), renders `FileItem.vue`.
14. `source/win-main/file-manager/FileItem.vue` — row component used by FileList (has its own `v-on:contextmenu="handleContextMenu"` at line 26).

### Context menu helper & styles
15. `source/common/modules/window-register/application-menu-helper.ts` (491, **modified in worktree**) — `showPopupMenu(point, items, callback)` renders custom `.application-menu` DOM; item types `NormalItem | CheckboxRadioItem | SeparatorItem | SubmenuItem` (`AnyMenuItem`); macOS path forwards to `menu-provider` `display-native-context-menu` — **channel does not exist in the Tauri backend** (only matters on macOS; Windows uses the custom DOM menu).
16. `source/common/modules/window-register/assets/application-menu.css` (85) — legacy light menu (`rgb(230,230,230)`) + `body.dark` variant (`#333`). Loaded via `register-themes.ts` → `assets/main.css` (imports katex, tippy, fonts, `geometry.css`, `application-menu.css`).
17. `source/common/modules/window-register/register-themes.ts` (1–60) — imports main.css; listens `config-provider` update with payload `'darkMode'` to toggle `body.dark`; lib.rs:739 emits exactly that on `set-config-single` → theme switching works.

### Platform bridge / config
18. `source/platform/renderer-api.ts` (284, whole) — `window.platform` runtime. `invoke` → Tauri `provider_request`/`get_config`; **documents-provider tab state lives renderer-side with a single hardcoded leaf `id: 'main'`**; handles open/close/rename of open files; `on()` wraps Tauri `listen()`; `toAssetUrl = convertFileSrc`; drag-drop → `application roots-add`.
19. `source/platform/contracts.ts` (line 140: `'shortcut': string` in `PlatformEventMap`) — declared but **never emitted**.
20. `source/platform/config-template.ts` (577) — full config defaults incl. `darkMode` (328), `shortcuts` sections (259, 548).
21. `source/pinia/config.ts` + `document-tree-store.ts`, `workspace-store.ts`, `window-state-store.ts` — stores consumed by shell/components.

### Tauri backend (save/shortcut/config paths)
22. `src-tauri/src/lib.rs` (1153) — key regions:
    - `config_path()` 242–256: `%APPDATA%\Zettlr\config.json` (win) / `~/Library/Application Support` (mac) / XDG (linux).
    - `load_config_overrides()` 257–262; `config-provider` gateway 715–745 (`get-config`, `set-config-single` persists + re-emits `config-provider` update with key payload 739).
    - `documents-provider` 802–807: `save-file` is a **stub `Ok(json!(true))` — writes nothing**.
    - `documents-authority` 810–855: `get-document` (reads file), `push-updates` (applies CodeMirror changesets → `fs::write` → emits `documents-update {"event":"file-saved"}`) — this is the real save path; `pull-updates` stub.
    - `save_dialog` 197–208 (rfd), `write_text_file` 77–84, fsal watch with self-write suppression (`register_self_write`).
    - Emitted events, complete list: `config-provider`, `fsal-event`, `documents-update`, `search-provider`. Stub channels: `appearance/css/assets/targets/tag/stats/update-provider` (1026–1032).
23. `src-tauri/tauri.conf.json` — window 1100×750, min 800×600, `assetProtocol` enabled scope `**`, capabilities `main-capability`, frontendDist `../dist-tauri`.
24. `source/win-main/index.ts` (1–~70) — entry: `windowRegister()` → pinia → mounts App; document-level drop handler → `roots-add`.

### External references
25. `D:/Obsidian_UI` — dependency-free HTML/CSS/JS reference of **Obsidian v1.12.7** UI, derived from the live install: `styles.css` (268 lines of Obsidian tokens: `--bg #1c1c1c`, `--panel #282828`, `--panel-hover #353535`, `--border #333`, accent `hsl(258 88% 66%)`, radii 4/8/12, shadow tokens), `app.js`/`app.ts` (tabs, search, command palette, settings, theme switch, right-sidebar toggle), `ui-features.md` (137), `element-audit.md` (168, exact tokens/selectors/DOM mapping), `README.md`, previous `context.md` (200).
26. `C:/Program Files/Obsidian` — **accessible**: `Obsidian.exe`, `resources`, locales, etc. present (Electron install).

---

## Architecture (how it connects)

- Renderer (`Vue 3 + pinia`) ↔ `window.platform` (`source/platform/renderer-api.ts`) ↔ single Tauri command `provider_request` in `src-tauri/src/lib.rs` dispatching on channel names (`config-provider`, `fsal`, `documents-provider`, `documents-authority`, `application`, …). Backend pushes via Tauri events with the same channel names.
- The new `shell/` chrome (AppShell + shell.css) hosts the legacy Zettlr feature components (FileManager, GlobalSearch, DocumentTabs, editor). Shell is dark-first with its own `--shell-*` tokens; legacy components still carry Zettlr's light-only LESS with sparse `body.dark` patches → the main polish gap is **consistent dark-mode styling + token unification** of these legacy components with the shell/Obsidian references.
- Saves: editor pushes changesets via `documents-authority push-updates` (Rust writes file). The `documents-provider save-file` route that Ctrl+S triggers is a no-op stub; dirty tracking lives in `document-tree-store.modifiedDocuments` (rendered by StatusBar).
- Context menus: all Windows-side menus are custom DOM via `showPopupMenu` styled by `application-menu.css` (legacy light styling).
- Config: single JSON at `%APPDATA%\Zettlr\config.json`, cached renderer-side, persisted per-key.

## Environmental concerns / risks

1. **No `shortcut` event emitter exists.** `contracts.ts:140` declares it, `App.vue` listens, but nothing in `src-tauri` or the adapter emits it. All app-level shortcuts rely solely on AppShell's hardcoded keydown; the configurable `shortcuts` config section is currently inert. If polish adds shortcut-driven behavior, it must go through AppShell keydown or add a backend emitter.
2. **Ctrl+S "save" is cosmetic**: `documents-provider save-file` stub returns true; real persistence only happens via editor `push-updates`. A save button/palette command should route to the editor's push path or the stub must be implemented.
3. Dirty worktree (317 changes, unstaged) — no commit boundary; treat existing uncommitted state as the baseline, don't assume HEAD.
4. `menu-provider` channel absent from the Tauri backend → `showPopupMenu`'s native-macOS branch and any `menu-provider` invokes will fail (Windows custom-menu path unaffected).
5. Editor context menus (`source/common/modules/markdown-editor/context-menu/*.ts`, table-editor) are modified in the worktree — verify they still route through `application-menu-helper` before restyling.
6. Legacy components use `cds-icon` (@cds/core) glyphs while the shell uses unicode text glyphs — icon strategy is inconsistent by design currently.
7. `C:/Program Files/Obsidian` and `D:/Obsidian_UI` are both readable, so Obsidian-token-based polish work can proceed without extraction from the live app (v1.12.7 tokens already audited in `element-audit.md`).

## Start Here

Open `source/win-main/shell/shell.css` (83 lines) — it defines the entire current design-token surface (`--shell-*`) and all shell chrome styling; every polish decision should extend or align with it, using `D:/Obsidian_UI/styles.css` as the Obsidian-token reference and `element-audit.md` for exact mappings. Then `AppShell.vue` for structure and the legacy components (DocumentTabs → GlobalSearch → FileManager/TreeItem/FileList) for the dark-mode gaps.
