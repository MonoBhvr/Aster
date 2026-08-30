import { type Candidate } from './find-lang-candidates'

export interface DictFileMetadata { path: string }

/** Dictionary enumeration is delegated to the platform backend in Tauri. */
export default function enumDictFiles (_paths: string[] = []): Array<Candidate & DictFileMetadata> {
  return []
}
