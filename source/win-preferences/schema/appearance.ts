/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Appearance Preferences Schema
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Exports the appearance tab schema.
 *
 * END HEADER
 */

import { trans } from '@common/i18n-renderer'
import { type PreferencesFieldset } from '../App.vue'
import { PreferencesGroups } from './_preferences-groups'
import { ProgrammaticallyOpenableWindows } from 'source/platform/open-aux-window'
import type { ConfigOptions } from 'source/platform/config-template'

const ipcRenderer = window.platform.ipc

export function getAppearanceFields (config: ConfigOptions): PreferencesFieldset[] {
  return [
    {
      title: trans('Dark mode'),
      group: PreferencesGroups.Appearance,
      titleField: {
        type: 'switch',
        model: 'darkMode'
      },
      help: undefined, // TODO,
      fields: [
        { type: 'separator' },
        {
          type: 'radio',
          label: trans('Schedule dark mode automatically'),
          model: 'autoDarkMode',
          inline: true,
          options: {
            off: trans('Do not automatically switch'),
            system: trans('Follow operating system'),
            schedule: trans('Follow custom schedule')
          }
        },
        {
          type: 'style-group',
          style: 'columns',
          fields: [
            {
              type: 'time',
              label: trans('Start dark mode at'),
              model: 'autoDarkModeStart',
              inline: true,
              disabled: config.autoDarkMode !== 'schedule'
            },
            {
              type: 'time',
              label: trans('End dark mode at'),
              model: 'autoDarkModeEnd',
              inline: true,
              disabled: config.autoDarkMode !== 'schedule'
            }
          ]
        }
      ]
    },
    {
      title: trans('Editor color mode'),
      infoString: trans('Choose whether the editor follows the application or uses a fixed light or dark mode.'),
      group: PreferencesGroups.Appearance,
      titleField: {
        type: 'select',
        model: 'darkModeEditor',
        inline: true,
        options: {
          match: trans('Follow App'),
          light: trans('Light mode'),
          dark: trans('Dark mode')
        }
      },
      help: undefined, // TODO
      fields: [
        { type: 'separator' },
        {
          type: 'theme',
          model: 'display.theme',
          options: {
            berlin: {
              textColor: 'white', backgroundColor: '#1cb27e', name: 'Berlin', fontFamily: 'inherit',
              description: 'A modern green theme with a sans-serif font.'
            },
            frankfurt: {
              textColor: 'white', backgroundColor: '#1d75b3', name: 'Frankfurt', fontFamily: 'Crimson, serif',
              description: 'A royal-blue theme with a serif writing font.'
            },
            bielefeld: {
              textColor: 'black', backgroundColor: '#ffffdc', name: 'Bielefeld', fontFamily: 'Liberation Mono, monospace',
              description: 'A mellow theme with a monospaced font.'
            },
            'karl-marx-stadt': {
              textColor: 'white', backgroundColor: '#dc2d2d', name: 'Karl-Marx-Stadt', fontFamily: 'inherit',
              description: 'A red theme with a sans-serif font.'
            },
            bordeaux: {
              textColor: '#dc2d2d', backgroundColor: '#fffff8', name: 'Bordeaux', fontFamily: 'Inconsolata, monospace',
              description: 'A light theme with a monospaced font.'
            }
          }
        }
      ]
    },
    {
      title: trans('Toolbar buttons'),
      infoString: trans('Select which buttons should be shown on the toolbar. Some buttons cannot be hidden.'),
      group: PreferencesGroups.Appearance,
      help: undefined, // TODO
      fields: [
        { type: 'separator' },
        {
          type: 'form-text',
          display: 'sub-heading',
          contents: trans('Left section')
        },
        {
          type: 'checkbox',
          label: trans('Display "Open settings" button'),
          model: 'displayToolbarButtons.showOpenPreferencesButton'
        },
        {
          type: 'checkbox',
          label: trans('Display "New file" button'),
          model: 'displayToolbarButtons.showNewFileButton'
        },
        {
          type: 'checkbox',
          label: trans('Display "Previous file" button'),
          model: 'displayToolbarButtons.showPreviousFileButton'
        },
        {
          type: 'checkbox',
          label: trans('Display "Next file" button'),
          model: 'displayToolbarButtons.showNextFileButton'
        },
        { type: 'separator' },
        {
          type: 'form-text',
          display: 'sub-heading',
          contents: trans('Center section')
        },
        {
          type: 'checkbox',
          label: trans('Display "Insert comment" button'),
          model: 'displayToolbarButtons.showMarkdownCommentButton'
        },
        {
          type: 'checkbox',
          label: trans('Display "Insert link" button'),
          model: 'displayToolbarButtons.showMarkdownLinkButton'
        },
        {
          type: 'checkbox',
          label: trans('Display "Insert image" button'),
          model: 'displayToolbarButtons.showMarkdownImageButton'
        },
        {
          type: 'checkbox',
          label: trans('Display "Insert task list" button'),
          model: 'displayToolbarButtons.showMarkdownMakeTaskListButton'
        },
        {
          type: 'checkbox',
          label: trans('Display "Insert table" button'),
          model: 'displayToolbarButtons.showInsertTableButton'
        },
        {
          type: 'checkbox',
          label: trans('Display "Insert footnote" button'),
          model: 'displayToolbarButtons.showInsertFootnoteButton'
        },
        { type: 'separator' },
        {
          type: 'form-text',
          display: 'sub-heading',
          contents: trans('Right section')
        },
        {
          type: 'checkbox',
          label: trans('Display word/character counter'),
          model: 'displayToolbarButtons.showDocumentInfoText'
        },
        {
          type: 'checkbox',
          label: trans('Display Pomodoro timer'),
          model: 'displayToolbarButtons.showPomodoroButton'
        }
      ]
    },
    {
      title: trans('Custom CSS'),
      group: PreferencesGroups.Appearance,
      fields: [
        {
          type: 'button',
          label: trans('Open CSS editor'),
          onClick: () => {
            ipcRenderer.invoke('application', {
              command: 'open-aux-window',
              payload: {
                window: ProgrammaticallyOpenableWindows.AssetsWindow,
                hash: 'tab-custom-css-control'
              }
            })
              .catch(err => console.error(err))
          }
        }
      ]
    }
  ]
}
