import type { Update } from '@codemirror/collab'
import type { AnyDescriptor } from 'source/types/common/fsal'
import type { DP_EVENTS } from 'source/types/common/documents'

/** Typed provider envelopes shared by the Tauri renderer and Rust command gateway. */
export interface ProviderRequest {
  command?: string
  payload?: unknown
  [key: string]: unknown
}

export type DocumentManagerIPCAPI = ProviderRequest
export type DocumentAuthorityIPCAPI = ProviderRequest
export type CiteprocProviderIPCAPI = ProviderRequest
export type WindowControlsIPCAPI = ProviderRequest
export type CloseAllIPCAPI = ProviderRequest
export type AssetsProviderIPCAPI = ProviderRequest
export type CustomExportIPCAPI = ProviderRequest
export type ExportIPCAPI = ProviderRequest
export type DirSettingsCommandAPI = ProviderRequest
export type ForceOpenAPI = ProviderRequest
export type SaveImageFromClipboardAPI = ProviderRequest
export type LanguageToolLinterRequest = ProviderRequest

export interface DatabaseRecord {
  path: string
  type: 'csl' | 'bibtex' | 'biblatex'
  cslData: Record<string, CSLItem>
  bibtexAttachments: Record<string, string[] | false>
}

export interface DocumentsUpdateContext {
  windowId?: string
  leafId?: string
  filePath?: string
  status?: 'modification' | 'saved' | 'pinned'
}

export interface DocumentUpdateEvent {
  event: DP_EVENTS
  context: DocumentsUpdateContext
}

export type FSALEventPayload =
  | { event: 'unlink' | 'unlinkDir'; path: string }
  | { event: 'change' | 'add' | 'addDir'; descriptor: AnyDescriptor }

export type FSALEventPayloadChange = Extract<FSALEventPayload, { descriptor: AnyDescriptor }>

export interface FileContentSearchResult {
  type: 'content'
  line: number
  excerpt: string
  ranges: Array<{ from: number, to: number }>
  weight: number
}

export interface MetadataSearchResult {
  type: 'metadata'
  weight: number
}

export type SearchResult = Array<FileContentSearchResult | MetadataSearchResult>
export type SearchProviderIPCAPI = ProviderRequest
export interface SearchProviderEvent {
  type: 'search-end' | 'search-result'
  progress?: number
  file?: string
  result?: SearchResult
}

export interface ColoredTag { name: string, color: string }
export interface TagRecord { name: string, desc: string, color: string, idf: number, files: string[] }
export interface WritingTarget { path: string, mode: 'words' | 'chars', count: number }
export interface Stats {
  wordCount: Record<string, number>
  charCount: Record<string, number>
  pomodoros: Record<string, number>
}
export interface UpdateState { updateAvailable: boolean, version?: string }

export interface LRT_JSON {
  id: string
  title: string
  type: string
  status: number
  abortable: boolean
  interactable: boolean
  info?: string
  error?: { name: string, message: string }
  currentTaskPercentage?: number
  startTime: string
  endTime?: string
}
export type LRTIPCAsyncMessage = ProviderRequest
export type LRTIPCSyncMessage =
  | { command: 'update-task' | 'new-task', payload: { task: LRT_JSON } }
  | { command: 'delete-task', payload: { id: string } }
  | { command: 'abort-task' | 'interact-task', payload: { id: string } }

export type OnboardingIPCMessage = ProviderRequest
export type OnboardingIPCSetAppLangMessage = ProviderRequest
export interface PandocProfileMetadata { name: string, description?: string, reader: string, writer: string }
export interface FindFileAndReturnMetadataResult {
  filePath: string
  previewMarkdown: string
  wordCount: number
  modtime: number
  title?: string
  image?: string
  summary?: string
}
export interface LogProvider { info: (message: string) => void, error: (message: string, ...details: unknown[]) => void, warn: (message: string, ...details: unknown[]) => void }

export type LanguageToolLinterResponse = [
  {
    language: { detectedLanguage: { code: string } }
    matches: Array<{
      message: string
      offset: number
      length: number
      replacements: Array<{ value: string }>
      rule: { issueType: string, description: string, id: string, category: { id: string, name: string } }
    }>
  },
  string[]
] | string | undefined

export interface GenericPlatformEvent {
  command?: string
  payload?: unknown
  [key: string]: unknown
}

export interface PlatformEventMap {
  'shortcut': string
  'update-provider': { command: string, payload?: UpdateState }
  'fsal-event': FSALEventPayload
  'documents-update': DocumentUpdateEvent
  'search-provider': SearchProviderEvent
  'config-provider': { command: string, payload?: string }
  'citeproc-database-updated': string
  'tag-provider': [string, TagRecord[] | ColoredTag[]]
  'targets-provider': string
  'lrt-provider': LRTIPCSyncMessage
  'stats-updated': Stats
  'assets-provider': string
}

export type DocumentAuthorityUpdate = Update
