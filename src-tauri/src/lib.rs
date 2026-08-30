use arboard::Clipboard;
use notify::{
    Config as NotifyConfig, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher,
};
use rfd::FileDialog;
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct DialogFilter {
    name: String,
    extensions: Vec<String>,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct OpenDialogOptions {
    title: Option<String>,
    default_path: Option<String>,
    filters: Option<Vec<DialogFilter>>,
    multiple: Option<bool>,
    directory: Option<bool>,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SaveDialogOptions {
    title: Option<String>,
    default_path: Option<String>,
    filters: Option<Vec<DialogFilter>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DirectoryEntry {
    path: String,
    name: String,
    is_directory: bool,
    is_file: bool,
}

fn error(context: &str, err: impl std::fmt::Display) -> String {
    format!("{context}: {err}")
}

fn configured_dialog(
    mut dialog: FileDialog,
    title: &Option<String>,
    default_path: &Option<String>,
    filters: &Option<Vec<DialogFilter>>,
    default_is_file: bool,
) -> FileDialog {
    if let Some(title) = title {
        dialog = dialog.set_title(title);
    }
    if let Some(default_path) = default_path {
        if default_is_file {
            let path = Path::new(default_path);
            if let Some(parent) = path.parent() {
                dialog = dialog.set_directory(parent);
            }
            if let Some(file_name) = path.file_name() {
                dialog = dialog.set_file_name(file_name.to_string_lossy().into_owned());
            }
        } else {
            dialog = dialog.set_directory(default_path);
        }
    }
    if let Some(filters) = filters {
        for filter in filters {
            let extensions: Vec<&str> = filter
                .extensions
                .iter()
                .map(|extension| {
                    extension
                        .trim()
                        .trim_start_matches("*.")
                        .trim_start_matches('.')
                })
                .filter(|extension| !extension.is_empty() && *extension != "*")
                .collect();
            if !extensions.is_empty() {
                dialog = dialog.add_filter(&filter.name, &extensions);
            }
        }
    }
    dialog
}

fn refuse_root(path: &Path) -> Result<(), String> {
    if path.parent().is_none() {
        return Err("refusing to remove a filesystem root".to_string());
    }
    Ok(())
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|err| error("Could not read text file", err))
}

#[tauri::command]
fn write_text_file(
    state: tauri::State<'_, SharedFsalWatchState>,
    path: String,
    contents: String,
) -> Result<(), String> {
    register_self_write(state.inner(), Path::new(&path));
    fs::write(&path, contents).map_err(|err| error("Could not write text file", err))
}

#[tauri::command]
fn read_directory(path: String) -> Result<Vec<DirectoryEntry>, String> {
    fs::read_dir(PathBuf::from(&path))
        .map_err(|err| error("Could not read directory", err))?
        .map(|entry| {
            let entry = entry.map_err(|err| error("Could not read directory entry", err))?;
            let file_type = entry
                .file_type()
                .map_err(|err| error("Could not inspect directory entry", err))?;
            Ok(DirectoryEntry {
                path: entry.path().to_string_lossy().into_owned(),
                name: entry.file_name().to_string_lossy().into_owned(),
                is_directory: file_type.is_dir(),
                is_file: file_type.is_file(),
            })
        })
        .collect()
}

#[tauri::command]
fn create_directory(path: String, recursive: bool) -> Result<(), String> {
    let result = if recursive {
        fs::create_dir_all(path)
    } else {
        fs::create_dir(path)
    };
    result.map_err(|err| error("Could not create directory", err))
}

#[tauri::command]
fn rename_path(source: String, destination: String) -> Result<(), String> {
    fs::rename(source, destination).map_err(|err| error("Could not rename path", err))
}

#[tauri::command]
fn remove_path(path: String, recursive: bool) -> Result<(), String> {
    let target = PathBuf::from(path);
    refuse_root(&target)?;
    let metadata = fs::symlink_metadata(&target)
        .map_err(|err| error("Could not inspect path for removal", err))?;
    let result = if metadata.file_type().is_dir() && !metadata.file_type().is_symlink() {
        if recursive {
            fs::remove_dir_all(target)
        } else {
            fs::remove_dir(target)
        }
    } else {
        fs::remove_file(target)
    };
    result.map_err(|err| error("Could not remove path", err))
}

#[tauri::command]
fn open_dialog(options: OpenDialogOptions) -> Result<Vec<String>, String> {
    let dialog = configured_dialog(
        FileDialog::new(),
        &options.title,
        &options.default_path,
        &options.filters,
        options.directory != Some(true),
    );
    let selected = if options.directory.unwrap_or(false) {
        if options.multiple.unwrap_or(false) {
            dialog.pick_folders()
        } else {
            dialog.pick_folder().map(|path| vec![path])
        }
    } else if options.multiple.unwrap_or(false) {
        dialog.pick_files()
    } else {
        dialog.pick_file().map(|path| vec![path])
    };
    Ok(selected
        .unwrap_or_default()
        .into_iter()
        .map(|path| path.to_string_lossy().into_owned())
        .collect())
}

#[tauri::command]
fn save_dialog(options: SaveDialogOptions) -> Result<Option<String>, String> {
    let dialog = configured_dialog(
        FileDialog::new(),
        &options.title,
        &options.default_path,
        &options.filters,
        true,
    );
    Ok(dialog
        .save_file()
        .map(|path| path.to_string_lossy().into_owned()))
}

#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    let parsed = url::Url::parse(&url).map_err(|err| error("Invalid external URL", err))?;
    if !matches!(parsed.scheme(), "http" | "https" | "mailto") {
        return Err(format!(
            "Unsupported external URL protocol: {}",
            parsed.scheme()
        ));
    }
    webbrowser::open(parsed.as_str())
        .map(|_| ())
        .map_err(|err| error("Could not open external URL", err))
}

#[tauri::command]
fn read_clipboard_text() -> Result<String, String> {
    let mut clipboard = Clipboard::new().map_err(|err| error("Could not access clipboard", err))?;
    clipboard
        .get_text()
        .map_err(|err| error("Could not read clipboard text", err))
}

#[tauri::command]
fn write_clipboard_text(text: String) -> Result<(), String> {
    let mut clipboard = Clipboard::new().map_err(|err| error("Could not access clipboard", err))?;
    clipboard
        .set_text(text)
        .map_err(|err| error("Could not write clipboard text", err))
}

fn config_path() -> PathBuf {
    let base = if cfg!(target_os = "windows") {
        std::env::var_os("APPDATA").map(PathBuf::from)
    } else if cfg!(target_os = "macos") {
        std::env::var_os("HOME").map(|home| PathBuf::from(home).join("Library/Application Support"))
    } else {
        std::env::var_os("XDG_CONFIG_HOME")
            .map(PathBuf::from)
            .or_else(|| std::env::var_os("HOME").map(|home| PathBuf::from(home).join(".config")))
    };
    base.unwrap_or_else(|| PathBuf::from("."))
        .join("Zettlr")
        .join("config.json")
}

fn load_config_overrides() -> Map<String, Value> {
    fs::read_to_string(config_path())
        .ok()
        .and_then(|text| serde_json::from_str(&text).ok())
        .unwrap_or_default()
}

fn set_nested(object: &mut Map<String, Value>, key: &str, value: Value) {
    let parts: Vec<&str> = key.split('.').collect();
    if parts.len() == 1 {
        object.insert(key.to_string(), value);
        return;
    }
    let head = parts[0].to_string();
    let mut child = match object.remove(&head) {
        Some(Value::Object(map)) => map,
        _ => Map::new(),
    };
    set_nested(&mut child, &parts[1..].join("."), value);
    object.insert(head, Value::Object(child));
}

fn persist_roots(app: &AppHandle, paths: &[String]) -> Result<(), String> {
    let mut config = load_config_overrides();
    let mut files = config
        .get("app")
        .and_then(|value| value.get("openFiles"))
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    let mut workspaces = config
        .get("app")
        .and_then(|value| value.get("openWorkspaces"))
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    for path in paths {
        let target = Path::new(path);
        let destination = if target.is_dir() {
            &mut workspaces
        } else {
            &mut files
        };
        let value = Value::String(path.clone());
        if !destination.contains(&value) {
            destination.push(value);
        }
    }
    set_nested(&mut config, "app.openFiles", Value::Array(files));
    set_nested(&mut config, "app.openWorkspaces", Value::Array(workspaces));
    let path = config_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|err| error("Could not create config directory", err))?;
    }
    fs::write(
        path,
        serde_json::to_vec_pretty(&config)
            .map_err(|err| error("Could not encode configuration", err))?,
    )
    .map_err(|err| error("Could not persist configuration", err))?;
    let _ = app.emit("config-provider", json!({"command":"update"}));
    Ok(())
}

fn remove_root(path: &str) -> Result<(), String> {
    let mut config = load_config_overrides();
    for key in ["app.openFiles", "app.openWorkspaces"] {
        let mut entries = config
            .get("app")
            .and_then(|value| value.get(key.split('.').nth(1).unwrap_or_default()))
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default();
        entries.retain(|entry| entry.as_str() != Some(path));
        set_nested(&mut config, key, Value::Array(entries));
    }
    let path = config_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|err| error("Could not create config directory", err))?;
    }
    fs::write(
        path,
        serde_json::to_vec_pretty(&config)
            .map_err(|err| error("Could not encode configuration", err))?,
    )
    .map_err(|err| error("Could not persist configuration", err))
}

fn sibling_path(payload: &Value, default_name: &str) -> Result<PathBuf, String> {
    let parent = PathBuf::from(
        payload
            .get("path")
            .and_then(Value::as_str)
            .ok_or("parent path missing")?,
    );
    let name = payload
        .get("name")
        .and_then(Value::as_str)
        .unwrap_or(default_name);
    if name.is_empty() || Path::new(name).components().count() != 1 {
        return Err("invalid file name".to_string());
    }
    Ok(parent.join(name))
}

fn load_config_command() -> Result<Value, String> {
    Ok(Value::Object(load_config_overrides()))
}

fn file_time(metadata: &fs::Metadata, creation: bool) -> u64 {
    let time = if creation {
        metadata.created()
    } else {
        metadata.modified()
    };
    time.ok()
        .and_then(|value| value.duration_since(UNIX_EPOCH).ok())
        .map(|value| value.as_millis() as u64)
        .unwrap_or(0)
}

fn descriptor(path: &Path) -> Result<Value, String> {
    let metadata = fs::metadata(path).map_err(|err| error("Could not inspect path", err))?;
    let path_string = path_string(path);
    let name = path
        .file_name()
        .map(|v| v.to_string_lossy().into_owned())
        .unwrap_or_else(|| path_string.clone());
    let dir = path
        .parent()
        .map(|parent| normalized_path(parent).to_string_lossy().into_owned())
        .unwrap_or_default();
    let base = json!({"path": path_string, "name": name, "dir": dir, "size": metadata.len(), "modtime": file_time(&metadata, false), "creationtime": file_time(&metadata, true)});
    if metadata.is_dir() {
        let mut value = base;
        value["type"] = json!("directory");
        value["settings"] = json!({"sorting":"name-up","icon":null,"project":null,"color":null});
        value["isGitRepository"] = json!(path.join(".git").is_dir());
        return Ok(value);
    }
    let extension = path
        .extension()
        .map(|v| format!(".{}", v.to_string_lossy()))
        .unwrap_or_default();
    if extension.eq_ignore_ascii_case(".md") || extension.eq_ignore_ascii_case(".markdown") {
        let content = fs::read_to_string(path).unwrap_or_default();
        let tags: Vec<String> = content
            .split_whitespace()
            .filter(|word| word.starts_with('#') && word.len() > 1)
            .map(|word| {
                word.trim_matches(|c: char| {
                    !c.is_alphanumeric() && c != '#' && c != '-' && c != '_'
                })
                .to_string()
            })
            .collect();
        let first_heading = content
            .lines()
            .find(|line| line.starts_with("# "))
            .map(|line| line[2..].trim().to_string());
        let mut value = base;
        value["type"] = json!("file");
        value["ext"] = json!(extension);
        value["id"] = json!("");
        value["tags"] = json!(tags);
        value["links"] = json!([]);
        value["citekeys"] = json!([]);
        value["bom"] = json!("");
        value["wordCount"] = json!(content.split_whitespace().count());
        value["charCount"] = json!(content.chars().count());
        value["firstHeading"] = json!(first_heading);
        value["frontmatter"] = Value::Null;
        value["linefeed"] = json!(if content.contains("\r\n") {
            "\r\n"
        } else {
            "\n"
        });
        return Ok(value);
    }
    let is_code = matches!(
        extension.to_ascii_lowercase().as_str(),
        ".tex" | ".yml" | ".yaml" | ".json" | ".qmd"
    );
    let mut value = base;
    value["type"] = json!(if is_code { "code" } else { "other" });
    value["ext"] = json!(extension);
    if is_code {
        value["bom"] = json!("");
        value["linefeed"] = json!("\n");
    }
    Ok(value)
}

#[derive(Default)]
struct FsalWatchState {
    watcher: Option<RecommendedWatcher>,
    roots: HashSet<PathBuf>,
    recent_writes: HashMap<PathBuf, Instant>,
    recent_events: HashMap<(PathBuf, String), Instant>,
}

type SharedFsalWatchState = Arc<Mutex<FsalWatchState>>;

fn normalized_path(path: &Path) -> PathBuf {
    let normalized = path.canonicalize().unwrap_or_else(|_| {
        if path.is_absolute() {
            path.to_path_buf()
        } else {
            std::env::current_dir()
                .unwrap_or_else(|_| PathBuf::from("."))
                .join(path)
        }
    });

    #[cfg(windows)]
    {
        let value = normalized.to_string_lossy();
        if let Some(stripped) = value.strip_prefix("\\\\?\\") {
            return PathBuf::from(stripped);
        }
    }

    normalized
}

fn path_string(path: &Path) -> String {
    normalized_path(path).to_string_lossy().into_owned()
}

fn register_self_write(state: &SharedFsalWatchState, path: &Path) {
    if let Ok(mut state) = state.lock() {
        state
            .recent_writes
            .insert(normalized_path(path), Instant::now());
    }
}

fn is_self_write(state: &SharedFsalWatchState, path: &Path) -> bool {
    let Ok(mut state) = state.lock() else {
        return false;
    };
    state
        .recent_writes
        .retain(|_, time| time.elapsed() < Duration::from_secs(2));
    state.recent_writes.contains_key(&normalized_path(path))
}

fn emit_fsal_change(app: &AppHandle, state: &SharedFsalWatchState, path: &Path, event: &str) {
    if is_self_write(state, path) {
        return;
    }
    let event_key = (normalized_path(path), event.to_string());
    if let Ok(mut state) = state.lock() {
        state
            .recent_events
            .retain(|_, time| time.elapsed() < Duration::from_millis(100));
        if state
            .recent_events
            .insert(event_key, Instant::now())
            .is_some()
        {
            return;
        }
    }
    let payload = match event {
        "unlink" | "unlinkDir" => json!({"event": event, "path": path_string(path)}),
        _ => match descriptor(path) {
            Ok(descriptor) => json!({"event": event, "descriptor": descriptor}),
            Err(_) => return,
        },
    };
    let _ = app.emit("fsal-event", payload);
}

fn handle_watch_event(app: &AppHandle, state: &SharedFsalWatchState, event: Event) {
    let mut paths = event.paths;
    paths.sort();
    paths.dedup();
    match event.kind {
        EventKind::Create(_) => {
            for path in paths {
                let event = if path.is_dir() { "addDir" } else { "add" };
                emit_fsal_change(app, state, &path, event);
            }
        }
        EventKind::Remove(kind) => {
            let is_directory = matches!(kind, notify::event::RemoveKind::Folder);
            for path in paths {
                emit_fsal_change(
                    app,
                    state,
                    &path,
                    if is_directory { "unlinkDir" } else { "unlink" },
                );
            }
        }
        EventKind::Modify(notify::event::ModifyKind::Name(_)) if paths.len() >= 2 => {
            emit_fsal_change(app, state, &paths[0], "unlink");
            for path in paths.into_iter().skip(1) {
                let event = if path.is_dir() { "addDir" } else { "add" };
                emit_fsal_change(app, state, &path, event);
            }
        }
        EventKind::Modify(_) => {
            for path in paths {
                emit_fsal_change(app, state, &path, "change");
            }
        }
        _ => {}
    }
}

fn sync_fsal_roots(
    app: &AppHandle,
    state: &SharedFsalWatchState,
    roots: Vec<String>,
) -> Result<Vec<String>, String> {
    let roots: HashSet<PathBuf> = roots
        .into_iter()
        .map(PathBuf::from)
        .filter(|path| path.exists() && path.is_dir())
        .map(|path| normalized_path(&path))
        .collect();
    let callback_app = app.clone();
    let callback_state = Arc::clone(state);
    let mut watcher = RecommendedWatcher::new(
        move |result: Result<Event, notify::Error>| {
            if let Ok(event) = result {
                handle_watch_event(&callback_app, &callback_state, event);
            }
        },
        NotifyConfig::default(),
    )
    .map_err(|err| error("Could not create workspace watcher", err))?;
    for root in &roots {
        watcher
            .watch(root, RecursiveMode::Recursive)
            .map_err(|err| error("Could not watch workspace root", err))?;
    }
    let root_strings = roots
        .iter()
        .map(|root| root.to_string_lossy().into_owned())
        .collect();
    let mut state = state
        .lock()
        .map_err(|_| "workspace watcher lock poisoned".to_string())?;
    state.watcher = Some(watcher);
    state.roots = roots;
    Ok(root_strings)
}

#[tauri::command]
fn fsal_watch_roots(
    app: AppHandle,
    state: tauri::State<'_, SharedFsalWatchState>,
    action: String,
    roots: Vec<String>,
) -> Result<Vec<String>, String> {
    match action.as_str() {
        "start" | "sync" => sync_fsal_roots(&app, state.inner(), roots),
        "stop" => {
            let mut watcher = state
                .inner()
                .lock()
                .map_err(|_| "workspace watcher lock poisoned".to_string())?;
            watcher.watcher = None;
            watcher.roots.clear();
            Ok(Vec::new())
        }
        _ => Err("invalid workspace watcher action".to_string()),
    }
}

fn recursive_paths(path: &Path, result: &mut Vec<String>) -> Result<(), String> {
    let metadata =
        fs::metadata(path).map_err(|err| error("Could not inspect workspace path", err))?;
    result.push(path_string(path));
    if metadata.is_dir() {
        for entry in fs::read_dir(path).map_err(|err| error("Could not scan workspace", err))? {
            recursive_paths(
                &entry
                    .map_err(|err| error("Could not scan workspace entry", err))?
                    .path(),
                result,
            )?;
        }
    }
    Ok(())
}

fn message_parts(message: &Value) -> (&str, &Value) {
    let command = message.get("command").and_then(Value::as_str).unwrap_or("");
    let payload = message.get("payload").unwrap_or(&Value::Null);
    (command, payload)
}

fn initial_tree() -> Value {
    json!({"type":"leaf","id":"main","openFiles":[],"activeFile":null})
}

fn apply_change_set(content: &str, changes: &Value) -> Result<String, String> {
    let sections = changes.as_array().ok_or("invalid CodeMirror change set")?;
    let source: Vec<char> = content.chars().collect();
    let mut cursor = 0usize;
    let mut output = Vec::with_capacity(source.len());
    for section in sections {
        match section {
            Value::Number(length) => {
                let length = length.as_u64().ok_or("invalid retained change length")? as usize;
                let end = cursor
                    .checked_add(length)
                    .ok_or("change position overflow")?;
                if end > source.len() {
                    return Err("change exceeds document length".to_string());
                }
                output.extend_from_slice(&source[cursor..end]);
                cursor = end;
            }
            Value::Array(values) => {
                let length = values
                    .first()
                    .and_then(Value::as_u64)
                    .ok_or("invalid changed range")? as usize;
                let end = cursor
                    .checked_add(length)
                    .ok_or("change position overflow")?;
                if end > source.len() {
                    return Err("change exceeds document length".to_string());
                }
                cursor = end;
                if values.len() > 1 {
                    let lines = values[1..]
                        .iter()
                        .map(|line| line.as_str().ok_or("invalid inserted text"))
                        .collect::<Result<Vec<_>, _>>()?;
                    output.extend(lines.join("\n").chars());
                }
            }
            _ => return Err("invalid CodeMirror change section".to_string()),
        }
    }
    output.extend_from_slice(&source[cursor..]);
    Ok(output.into_iter().collect())
}

fn menu_item(id: &str, label: &str) -> Value {
    json!({"id": id, "label": label, "type": "normal"})
}

fn menu_root() -> Value {
    json!([
        {"id":"file-menu","label":"File","type":"submenu","submenu":[]},
        {"id":"edit-menu","label":"Edit","type":"submenu","submenu":[]},
        {"id":"view-menu","label":"View","type":"submenu","submenu":[]},
        {"id":"window-menu","label":"Window","type":"submenu","submenu":[]},
        {"id":"help-menu","label":"Help","type":"submenu","submenu":[]}
    ])
}

fn menu_submenu(id: &str) -> Value {
    match id {
        "file-menu" => json!([
            menu_item("menu.new_file", "New file"),
            menu_item("menu.new_dir", "New directory…"),
            menu_item("menu.open", "Open file…"),
            menu_item("menu.open_workspace", "Open workspace…"),
            {"type":"separator"},
            menu_item("menu.save", "Save"),
            menu_item("menu.previous_file", "Previous file"),
            menu_item("menu.next_file", "Next file"),
            {"type":"separator"},
            menu_item("menu.export", "Export…"),
            menu_item("menu.print", "Print…"),
            menu_item("menu.preferences", "Preferences…")
        ]),
        "edit-menu" => json!([
            menu_item("menu.undo", "Undo"),
            menu_item("menu.redo", "Redo"),
            {"type":"separator"},
            menu_item("menu.cut", "Cut"),
            menu_item("menu.copy", "Copy"),
            menu_item("menu.paste", "Paste"),
            menu_item("menu.select_all", "Select all")
        ]),
        "view-menu" => json!([
            menu_item("menu.toggle_file_manager", "Toggle File Manager"),
            menu_item("menu.toggle_sidebar", "Toggle Sidebar"),
            menu_item("menu.distraction_free", "Distraction Free Mode"),
            {"type":"separator"},
            menu_item("menu.zoom_in", "Zoom in"),
            menu_item("menu.zoom_out", "Zoom out"),
            menu_item("menu.zoom_reset", "Reset zoom")
        ]),
        "window-menu" => json!([
            menu_item("menu.minimize", "Minimize"),
            menu_item("menu.maximize", "Maximize"),
            menu_item("menu.close", "Close")
        ]),
        "help-menu" => json!([
            menu_item("menu.check_updates", "Check for updates"),
            menu_item("menu.about", "About Zettlr")
        ]),
        _ => json!([]),
    }
}

#[tauri::command]
async fn provider_request(
    app: AppHandle,
    state: tauri::State<'_, SharedFsalWatchState>,
    channel: String,
    message: Option<Value>,
) -> Result<Value, String> {
    let message = message.unwrap_or(Value::Null);
    let (command, payload) = message_parts(&message);
    match channel.as_str() {
        "menu-provider" => match command {
            "get-application-menu" => {
                Ok(json!({"command":"application-menu","payload":menu_root()}))
            }
            "get-application-submenu" => {
                let id = payload.as_str().unwrap_or_default();
                Ok(
                    json!({"command":"application-submenu","payload":{"id":id,"submenu":menu_submenu(id)}}),
                )
            }
            _ => Ok(Value::Null),
        },
        "i18n" => Ok(json!({"translations":{"":{"": {"msgstr": [""]}}}})),
        "config-provider" => match command {
            "get-config" => Ok(Value::Object(load_config_overrides())),
            "set-config-single" => {
                let key = payload
                    .get("key")
                    .and_then(Value::as_str)
                    .ok_or("configuration key missing")?;
                let mut values = load_config_overrides();
                set_nested(
                    &mut values,
                    key,
                    payload.get("val").cloned().unwrap_or(Value::Null),
                );
                let path = config_path();
                if let Some(parent) = path.parent() {
                    fs::create_dir_all(parent)
                        .map_err(|err| error("Could not create config directory", err))?;
                }
                fs::write(
                    path,
                    serde_json::to_vec_pretty(&values)
                        .map_err(|err| error("Could not encode configuration", err))?,
                )
                .map_err(|err| error("Could not persist configuration", err))?;
                let _ = app.emit("config-provider", json!({"command":"update","payload":key}));
                Ok(json!(true))
            }
            _ => Ok(Value::Null),
        },
        "fsal" => match command {
            "sync-roots" => {
                let roots = payload
                    .as_array()
                    .ok_or("workspace roots missing")?
                    .iter()
                    .filter_map(Value::as_str)
                    .map(str::to_owned)
                    .collect();
                Ok(json!(sync_fsal_roots(&app, state.inner(), roots)?))
            }
            "stop-watching" => {
                let mut watcher = state
                    .inner()
                    .lock()
                    .map_err(|_| "workspace watcher lock poisoned".to_string())?;
                watcher.watcher = None;
                watcher.roots.clear();
                Ok(json!([]))
            }
            "read-path-recursively" => {
                let mut paths = Vec::new();
                recursive_paths(
                    Path::new(payload.as_str().ok_or("workspace path missing")?),
                    &mut paths,
                )?;
                Ok(json!(paths))
            }
            "read-directory" => {
                let path = Path::new(payload.as_str().ok_or("directory path missing")?);
                let mut descriptors = Vec::new();
                for entry in
                    fs::read_dir(path).map_err(|err| error("Could not read directory", err))?
                {
                    descriptors.push(descriptor(
                        &entry
                            .map_err(|err| error("Could not read directory entry", err))?
                            .path(),
                    )?);
                }
                Ok(json!(descriptors))
            }
            "get-descriptor" => {
                if let Some(paths) = payload.as_array() {
                    Ok(Value::Array(
                        paths
                            .iter()
                            .map(|path| descriptor(Path::new(path.as_str().unwrap_or_default())))
                            .collect::<Result<Vec<_>, _>>()?,
                    ))
                } else {
                    Ok(descriptor(Path::new(
                        payload.as_str().ok_or("path missing")?,
                    ))?)
                }
            }
            _ => Ok(Value::Null),
        },
        "documents-provider" => match command {
            "retrieve-tab-config" => Ok(initial_tree()),
            "get-file-modification-status" => Ok(json!([])),
            "save-file" => {
                // Editor changes normally arrive through documents-authority. A
                // deliberate Save still performs a real filesystem write so the
                // command palette and DOM shortcut share a meaningful save path.
                let path = payload
                    .get("path")
                    .and_then(Value::as_str)
                    .ok_or("document path missing")?;
                let content =
                    fs::read(path).map_err(|err| error("Could not read document for save", err))?;
                register_self_write(state.inner(), Path::new(path));
                fs::write(path, content).map_err(|err| error("Could not save document", err))?;
                let _ = app.emit(
                    "documents-update",
                    json!({"event":"file-saved","context":{"filePath":path}}),
                );
                Ok(json!(true))
            }
            _ => Ok(Value::Null),
        },
        "documents-authority" => match command {
            "get-document" => {
                let path = payload
                    .get("filePath")
                    .and_then(Value::as_str)
                    .ok_or("document path missing")?;
                let content = fs::read_to_string(path)
                    .map_err(|err| error("Could not load document", err))?;
                let document_type = match Path::new(path)
                    .extension()
                    .and_then(|v| v.to_str())
                    .unwrap_or("")
                    .to_ascii_lowercase()
                    .as_str()
                {
                    "md" | "markdown" => 1,
                    "tex" => 2,
                    "yml" | "yaml" => 3,
                    "json" => 4,
                    _ => 1,
                };
                Ok(json!({"content":content,"type":document_type,"startVersion":0}))
            }
            "push-updates" => {
                let path = payload
                    .get("filePath")
                    .and_then(Value::as_str)
                    .ok_or("document path missing")?;
                let mut content = fs::read_to_string(path)
                    .map_err(|err| error("Could not load document for save", err))?;
                if let Some(updates) = payload.get("updates").and_then(Value::as_array) {
                    for update in updates {
                        if let Some(changes) = update.get("changes") {
                            content = apply_change_set(&content, changes)?;
                        }
                    }
                }
                register_self_write(state.inner(), Path::new(path));
                fs::write(path, content).map_err(|err| error("Could not save document", err))?;
                let _ = app.emit(
                    "documents-update",
                    json!({"event":"file-saved","context":{"filePath":path}}),
                );
                Ok(json!(true))
            }
            "pull-updates" => Ok(json!([])),
            _ => Ok(Value::Null),
        },
        "application" => match command {
            "file-delete" => {
                let path = payload
                    .get("path")
                    .and_then(Value::as_str)
                    .ok_or("file path missing")?;
                register_self_write(state.inner(), Path::new(path));
                remove_path(path.to_string(), false)?;
                Ok(Value::Null)
            }
            "dir-delete" => {
                let path = payload
                    .get("path")
                    .and_then(Value::as_str)
                    .ok_or("directory path missing")?;
                register_self_write(state.inner(), Path::new(path));
                remove_path(path.to_string(), true)?;
                Ok(Value::Null)
            }
            "dir-new" => {
                let path = if payload.get("name").is_some() {
                    sibling_path(payload, "New folder")?
                } else {
                    PathBuf::from(
                        payload
                            .get("path")
                            .and_then(Value::as_str)
                            .ok_or("directory path missing")?,
                    )
                };
                register_self_write(state.inner(), &path);
                create_directory(path.to_string_lossy().into_owned(), false)?;
                Ok(json!(descriptor(&path)?))
            }
            "file-new" => {
                let path = if payload.get("path").is_some() {
                    sibling_path(payload, "Untitled.md")?
                } else if let Some(parent) = load_config_overrides()
                    .get("openDirectory")
                    .and_then(Value::as_str)
                {
                    sibling_path(&json!({"path": parent}), "Untitled.md")?
                } else {
                    return Err("file parent path missing".to_string());
                };
                if path.exists() {
                    return Err("file already exists".to_string());
                }
                register_self_write(state.inner(), &path);
                fs::write(&path, "").map_err(|err| error("Could not create file", err))?;
                Ok(json!(descriptor(&path)?))
            }
            "file-rename" | "dir-rename" => {
                let source = PathBuf::from(
                    payload
                        .get("path")
                        .and_then(Value::as_str)
                        .ok_or("path missing")?,
                );
                let destination = sibling_path(
                    &json!({"path": source.parent().map(|value| value.to_string_lossy().into_owned()).unwrap_or_default(), "name": payload.get("name").and_then(Value::as_str)}),
                    "",
                )?;
                if destination.exists() {
                    return Err("destination already exists".to_string());
                }
                register_self_write(state.inner(), &source);
                register_self_write(state.inner(), &destination);
                fs::rename(&source, &destination)
                    .map_err(|err| error("Could not rename path", err))?;
                Ok(json!(descriptor(&destination)?))
            }
            "file-duplicate" => {
                let source = PathBuf::from(
                    payload
                        .get("path")
                        .and_then(Value::as_str)
                        .ok_or("file path missing")?,
                );
                let stem = source
                    .file_stem()
                    .and_then(|value| value.to_str())
                    .unwrap_or("copy");
                let extension = source
                    .extension()
                    .and_then(|value| value.to_str())
                    .map(|value| format!(".{value}"))
                    .unwrap_or_default();
                let mut index = 1;
                let destination = loop {
                    let candidate =
                        source.with_file_name(format!("{stem} copy {index}{extension}"));
                    if !candidate.exists() {
                        break candidate;
                    }
                    index += 1;
                };
                register_self_write(state.inner(), &destination);
                fs::copy(&source, &destination)
                    .map_err(|err| error("Could not duplicate file", err))?;
                Ok(json!(descriptor(&destination)?))
            }
            "root-open-workspaces" => {
                let selected = open_dialog(OpenDialogOptions {
                    directory: Some(true),
                    multiple: Some(true),
                    ..Default::default()
                })?;
                persist_roots(&app, &selected)?;
                Ok(json!(selected))
            }
            "roots-add" => {
                let selected = payload
                    .as_array()
                    .ok_or("root paths missing")?
                    .iter()
                    .filter_map(Value::as_str)
                    .map(str::to_owned)
                    .collect::<Vec<_>>();
                persist_roots(&app, &selected)?;
                Ok(json!(selected))
            }
            "root-close" => {
                let path = payload
                    .as_str()
                    .or_else(|| payload.get("path").and_then(Value::as_str))
                    .ok_or("root path missing")?;
                remove_root(path)?;
                let _ = app.emit("config-provider", json!({"command":"update"}));
                Ok(json!(true))
            }
            "root-open-files" => {
                let selected = open_dialog(OpenDialogOptions {
                    multiple: Some(true),
                    ..Default::default()
                })?;
                persist_roots(&app, &selected)?;
                Ok(json!(selected))
            }
            "open-preferences" | "open-stats-window" | "force-open" => Ok(Value::Null),
            _ => Ok(Value::Null),
        },
        "request-files" => {
            let options =
                serde_json::from_value::<OpenDialogOptions>(payload.clone()).unwrap_or_default();
            Ok(json!(open_dialog(options)?))
        }
        "request-dir" => Ok(json!(open_dialog(OpenDialogOptions {
            directory: Some(true),
            multiple: Some(false),
            ..Default::default()
        })?)),
        "close-all" => Ok(json!(true)),
        "window-controls" => {
            if let Some(window) = app.get_webview_window("main") {
                match command {
                    "win-maximise" => {
                        let _ = window.maximize();
                    }
                    "win-minimise" => {
                        let _ = window.minimize();
                    }
                    "win-close" => {
                        let _ = window.close();
                    }
                    _ => {}
                }
            }
            Ok(Value::Null)
        }
        "appearance-provider" => Ok(json!({"accent":"4c8bf5","contrast":"ffffff"})),
        "css-provider" => Ok(Value::String(String::new())),
        "assets-provider" => Ok(json!([])),
        "targets-provider" => Ok(json!([])),
        "tag-provider" => Ok(json!([])),
        "stats-provider" => Ok(json!({})),
        "update-provider" => Ok(json!("up-to-date")),
        "link-provider" => Ok(json!({})),
        "search-provider" => match command {
            "cancel-search" => Ok(json!(true)),
            "start-full-text-search" => {
                let query = payload.get("query").and_then(Value::as_str).unwrap_or("");
                let case_insensitive = payload
                    .get("caseInsensitive")
                    .and_then(Value::as_bool)
                    .unwrap_or(true);
                let restrict = payload
                    .get("restrictToDirectory")
                    .and_then(Value::as_str)
                    .filter(|value| !value.is_empty())
                    .map(PathBuf::from);
                let roots: Vec<PathBuf> = if let Some(path) = restrict {
                    vec![path]
                } else {
                    state
                        .inner()
                        .lock()
                        .map_err(|_| "workspace watcher lock poisoned".to_string())?
                        .roots
                        .iter()
                        .cloned()
                        .collect()
                };
                let mut paths = Vec::new();
                for root in roots {
                    let _ = recursive_paths(&root, &mut paths);
                }
                let needle = if case_insensitive {
                    query.to_lowercase()
                } else {
                    query.to_string()
                };
                let total = paths.len().max(1);
                for (index, file) in paths.into_iter().enumerate() {
                    let path = PathBuf::from(&file);
                    if !path.is_file() {
                        continue;
                    }
                    let comparable_name = if case_insensitive {
                        file.to_lowercase()
                    } else {
                        file.clone()
                    };
                    let mut result = Vec::<Value>::new();
                    if !needle.is_empty() && comparable_name.contains(&needle) {
                        result.push(json!({"type":"content","line":1,"excerpt":path.file_name().and_then(|name| name.to_str()).unwrap_or(""),"ranges":[],"weight":1}));
                    }
                    if let Ok(content) = fs::read_to_string(&path) {
                        for (line_index, line) in content.lines().enumerate() {
                            let comparable = if case_insensitive {
                                line.to_lowercase()
                            } else {
                                line.to_string()
                            };
                            if !needle.is_empty() && comparable.contains(&needle) {
                                let start = comparable.find(&needle).unwrap_or(0);
                                result.push(json!({"type":"content","line":line_index + 1,"excerpt":line,"ranges":[{"from":start,"to":start + needle.len()}],"weight":1}));
                            }
                        }
                    }
                    if !result.is_empty() {
                        let _ = app.emit("search-provider", json!({"type":"search-result","progress":(index + 1) as f64 / total as f64,"file":file,"result":result}));
                    }
                }
                let _ = app.emit("search-provider", json!({"type":"search-end"}));
                Ok(json!(true))
            }
            _ => Err("unsupported search command".to_string()),
        },
        "lrt-provider" => Ok(json!([])),
        _ => Ok(Value::Null),
    }
}

#[tauri::command]
fn get_config(_app: AppHandle) -> Result<Value, String> {
    load_config_command()
}

pub fn run() {
    tauri::Builder::default()
        .manage(Arc::new(Mutex::new(FsalWatchState::default())))
        .invoke_handler(tauri::generate_handler![
            read_text_file,
            write_text_file,
            read_directory,
            create_directory,
            rename_path,
            remove_path,
            open_dialog,
            save_dialog,
            open_external_url,
            read_clipboard_text,
            write_clipboard_text,
            fsal_watch_roots,
            get_config,
            provider_request
        ])
        .run(tauri::generate_context!())
        .expect("error while running Zettlr's Tauri host");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn applies_codemirror_changes() {
        let changes = json!([1, [2, "X"], 1]);
        assert_eq!(apply_change_set("abcd", &changes).unwrap(), "aXd");
    }

    #[test]
    fn rejects_path_traversal_names() {
        let payload = json!({"path":"C:/workspace", "name":"../outside.md"});
        assert!(sibling_path(&payload, "Untitled.md").is_err());
    }
}
