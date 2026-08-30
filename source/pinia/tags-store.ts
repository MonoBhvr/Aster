/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        useTagsStore
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This model manages tags
 *
 * END HEADER
 */

import { defineStore } from 'pinia'
import type { ColoredTag, TagRecord } from 'source/platform/contracts'
import { ref } from 'vue'

const platformIpc = window.platform.ipc

export const useTagsStore = defineStore('tags', () => {
  const coloredTags = ref<ColoredTag[]>([])
  const tags = ref<TagRecord[]>([])

  platformIpc.invoke('tag-provider', { command: 'get-colored-tags' })
    .then((t: ColoredTag[]) => {
      coloredTags.value = t
    })
    .catch(err => console.error(err))

  platformIpc.invoke('tag-provider', { command: 'get-all-tags' })
    .then((t: TagRecord[]) => {
      tags.value = t
    })
    .catch(err => console.error(err))

  return { coloredTags, tags }
})
