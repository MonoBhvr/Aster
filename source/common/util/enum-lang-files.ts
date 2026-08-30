import { type Candidate } from './find-lang-candidates'

export interface LangFileMetadata { path: string }

/**
 * Language files are packaged as frontend assets in Tauri. User supplied
 * translations are discovered by the Rust backend rather than Node fs.
 */
export default function enumLangFiles (_paths: string[] = []): Array<Candidate & LangFileMetadata> {
  return []
}
