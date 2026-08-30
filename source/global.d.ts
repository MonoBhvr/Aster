declare module '*.png' { const filePath: string; export default filePath }
declare module '*.svg' { const filePath: string; export default filePath }
declare module '*.mp3' { const filePath: string; export default filePath }
declare module '*.wav' { const filePath: string; export default filePath }
declare module '*.glsl' { const content: string; export default content }
declare module '*.css' { const filePath: string; export default filePath }
declare module '@joplin/turndown'
declare module 'joplin-turndown-plugin-gfm'
declare module '@replit/codemirror-emacs'
declare module '@replit/codemirror-lang-nix'
declare module '@codemirror/legacy-modes/*'

declare const __GIT_COMMIT_HASH__: string
declare const __BUILD_DATE__: string
declare const __UPDATES_DISABLED__: '1'|'0'
