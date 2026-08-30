/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        useWritingTargetsStore
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This model manages the writing targets
 *
 * END HEADER
 */

import { defineStore } from 'pinia'
import type { WritingTarget } from 'source/platform/contracts'
import { ref } from 'vue'

const platformIpc = window.platform.ipc

export const useWritingTargetsStore = defineStore('writing-targets', () => {
  const targets = ref<WritingTarget[]>([])

  // Listen to subsequent changes
  platformIpc.on('targets-provider', (event, command) => {
    if (command === 'writing-targets-updated') {
      platformIpc.invoke('targets-provider', { command: 'get-targets' })
        .then((t: WritingTarget[]) => {
          targets.value = t
        })
        .catch(err => console.error(err))
    }
  })

  platformIpc.invoke('targets-provider', { command: 'get-targets' })
    .then((t: WritingTarget[]) => {
      targets.value = t
    })
    .catch(err => console.error(err))

  return { targets }
})
