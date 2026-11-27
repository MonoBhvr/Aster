<h1 align="center">
  <a href="https://github.com/Zettlr/Zettlr">
    <img src="https://raw.githubusercontent.com/Zettlr/Zettlr/master/resources/icons/png/1024x1024.png" alt="Aster" width="256" height="256" />
  </a>
  <br/>
  Aster [<em>ˈset·lər</em>]
</h1>

<p align="center"><strong>Your One-Stop Publication Workbench</strong>.</p>

> Aster is a community fork of Zettlr.

<p align="center">
  <a href="https://doi.org/10.5281/zenodo.2580173">
    <img src="https://zenodo.org/badge/DOI/10.5281/zenodo.2580173.svg" alt="DOI">
  </a>
  <a href="https://www.gnu.org/licenses/gpl-3.0">
    <img src="https://img.shields.io/badge/License-GPLv3-blue.svg" alt="License: GNU GPL v3">
  </a>
  <a href="https://www.zettlr.com/download">
    <img alt="GitHub tag (latest by date)" src="https://img.shields.io/github/tag-date/Zettlr/Zettlr.svg?label=latest">
  </a>
  <img alt="GitHub All Releases" src="https://img.shields.io/github/downloads/Zettlr/Zettlr/total.svg">
  <img alt="Unit Tests / Lint" src="https://github.com/Zettlr/Zettlr/actions/workflows/check.yml/badge.svg">
  <img alt="Build" src="https://github.com/Zettlr/Zettlr/workflows/Build/badge.svg">
</p>

<p align="center">
  <a href="https://www.zettlr.com/" target="_blank">Homepage</a> |
  <a href="https://www.zettlr.com/download">Download</a> |
  <a href="https://docs.zettlr.com/" target="_blank">Documentation</a> |
  <a href="https://forum.zettlr.com/" target="_blank">Community Forum</a> |
  <a href="https://go.zettlr.com/discord" target="_blank">Discord</a> |
  <a href="#contributing">Contributing</a> |
  <a href="https://zettlr.com/supporters" target="_blank">Support Us</a> |
  <a rel="me" href="https://fosstodon.org/@zettlr" target="_blank">Mastodon</a>
</p>

![screenshot](/resources/screenshots/zettlr_view.png)

Aster brings simplicity back to your texts. Open-minded writing that adapts to
your style. Fast information retrieval that finds what matters to you. Versatile
exporting that enables you to adapt to whatever publication pipeline your
employer or school uses.

Focus on what matters to you.

**Publish, not perish.**

> [Learn more on our website](https://zettlr.com/).

***

**Table of Contents**

- [Features](#features)
- [Getting Started](#getting-started)
- [Building from Source](#building-from-source)
- [Contributing](#contributing)
  - [Getting Started](#getting-started-1)
  - [Tech Stack](#tech-stack)
  - [Debugging](#debugging)
  - [Architecture Overview](#architecture-overview)
  - [Development Commands](#development-commands)
  - [Build Flags](#build-flags)
  - [Directory Structure](#directory-structure)
- [Command-Line Switches](#command-line-switches)
- [VSCode Extension Recommendations](#vscode-extension-recommendations)
- [License](#license)

## Features

- Your Notes are your notes: Aster is **privacy-first**
- **Citations** made easy: Tight and ever-growing integration with your
  favorite reference manager (Zotero, JabRef, and many others)
- Available in over a **dozen languages**
- Draft your publications in a professional environment, with
  **LaTeX and Word template support**
- Simple and beautiful exports with [Pandoc](https://pandoc.org/),
  [LaTeX](https://www.latex-project.org/), and [Textbundle](http://textbundle.org/)
- **Snippets** allow you to automate insertion of boilerplate code
- Themes, dark modes, and full flexibility with **custom CSS**
- **Code highlighting** for many languages
- Support for state of the art knowledge management techniques (**Zettelkasten**)
- A powerful **full text search** that helps you find anything, anywhere

… and the best is: **Aster is [Free and Open Source Software (FOSS)](https://en.wikipedia.org/wiki/Free_and_open-source_software)!**

## Getting Started

[Download the latest release](https://www.zettlr.com/download/) and install it
as you would any other app. Currently supported are macOS, Windows, and most
Linux distributions.

On our website and here on GitHub, we provide a set of installers for the most
common use-cases. We provide both 64-bit installers as well as installers for
ARM systems (called "Apple Silicon" in the macOS ecosystem). 32-bit is not
supported. We offer the following binaries directly:

* macOS (Intel and Apple Silicon)
* Windows (x64)
* Debian/Ubuntu (x64 and ARM) 
* Fedora/Red Hat (x64 and ARM)
* AppImage (x64 and ARM)

Thanks to our community, we can also offer you a variety of other setup
opportunities via package managers:

* [Homebrew (macOS)](https://formulae.brew.sh/cask/zettlr)
* [Aptitude (Ubuntu/Debian)](https://apt.zettlr.com)
* [Flathub (Linux)](https://flathub.org/apps/details/com.zettlr.Zettlr)
* [Chocolatey (Windows)](https://community.chocolatey.org/packages/zettlr/)
* [Arch Linux](https://wiki.archlinux.org/title/Zettlr)

Tauri supports Windows, macOS, and Linux. Build the application locally with
the platform toolchain when a packaged binary is not available.

> [!TIP]
> Aster is fully supported by community donations. You can donate once, or
> monthly. [Learn more on our website](https://www.zettlr.com/supporters).
> Thank you!

After you have installed Aster, [head over to our documentation](https://docs.zettlr.com/)
to get to know Aster. The app ships with a small tutorial which covers the basics.

If you are new to Aster, refer to our
[first time users guide](https://docs.zettlr.com/en/first-time-users/first-steps/).
You might also want to consider
[installing LaTeX](https://docs.zettlr.com/en/getting-started/installing-latex/)
to unlock all export profiles of the app.

![The central window of Aster using the dark theme](/resources/screenshots/zettlr_view_dark.png)

## Building from Source

You can compile the app for yourself using the Tauri 2 toolchain. Install Rust
and the platform prerequisites described below, then run:

```bash
corepack yarn install --immutable
corepack yarn tauri:dev
corepack yarn tauri:build
```

The Tauri host loads the complete Aster Vue renderer. Native filesystem,
dialog, clipboard, shell, configuration, and document-authority operations are
implemented as typed platform commands in Rust.

## Contributing

As an Open Source application, Aster always welcomes contributions from the
community. **You do not need to know how to write code to help!** A full
overview over all the areas where you can help can be found in our
[contributing guide](./CONTRIBUTING.md). In the following, we introduce you to
setting up the Aster source code locally.

### Getting Started

Aster is a Tauri 2 application with a Vue 3 frontend and Rust backend. To
start developing, you'll need to have the following installed on your computer:

1. [NodeJS](https://nodejs.org/). Make sure it's at least Node 22 (`lts/jod`).
   To test what version you have, run `node -v`.
2. [Yarn](https://yarnpkg.com/en/). This is the package manager for the project,
   as we do not commit `package-lock.json`-files and many commands require yarn.
   You can install this globally using `npm install -g yarn` or Homebrew, if you
   are on macOS.
3. On Windows, we recommend to
   [install the Windows Subsystem for Linux (WSL)](https://learn.microsoft.com/en-us/windows/wsl/install),
   which will make many of the next steps easier.
4. A few command-line utilities that various scripts require for running the
   development builds:
    * [`cURL`](https://curl.se/download.html) (required by the Pandoc download
      script)
    * `unzip` (required by the Pandoc download script)
    * [`jq`](https://jqlang.github.io/jq/) (required by the i18n script)
5. An appropriate build toolchain for your operating system, since Aster
   requires a few native C++-modules that must be compiled before running the
   app:
    * **macOS**: On macOS, installing the XCode command-line tools via
      `xcode-select --install` suffices
    * **Windows**: On Windows, you'll need the
      [free Visual Studio development tools](https://visualstudio.microsoft.com/free-developer-offers/)
      that include the required tools
    * **Linux**: On Linux, there are a variety of compatible toolchains
      available, sometimes they are already preinstalled. Refer to your
      distribution's manual for more information.

Then, simply clone the repository and install the dependencies on your local
computer:

```bash
git clone https://github.com/Zettlr/Zettlr.git
cd Aster
yarn install --immutable
```

> [!CAUTION]
> Ensure you run `yarn install` with the `--immutable` flag. This ensures that
> yarn will stick to the versions as listed in the `yarn.lock` and not attempt
> to update them. This can prevent supply-chain attacks that could infect your
> computer.

During development, webpack serves the Vue renderer with hot reload and Tauri
runs the native host. Frontend changes are picked up without a separate main
process.

### Tech Stack

The application uses Tauri 2 and Rust for native integration, and Vue,
TypeScript, Pinia, and CodeMirror 6 for the frontend. In order to provide code,
you should have basic familiarity with the following
topics and/or manuals (ordered by descending importance):

* [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
  (especially asynchronous code) and
  [TypeScript](https://www.typescriptlang.org/docs/)
* [Node.js](https://nodejs.org/api/)
* [Vue.js 3.x](https://vuejs.org/guide/introduction.html) and
  [Pinia](https://pinia.vuejs.org/)
* [CodeMirror 6.x](https://codemirror.net/docs/)
* [ESLint](https://eslint.org/)
* [Webpack 5.x](https://webpack.js.org/concepts/)
* [Tauri 2](https://v2.tauri.app/)
* [Rust](https://www.rust-lang.org/)

### Debugging

Aster can be debugged from the Tauri development process and the browser
frontend devtools. The native boundary is in `src-tauri`, while the renderer
entrypoint is `source/tauri/index.ts`.

> [!TIP]
> To learn more about debugging in VS Code,
> [read the official guide](https://code.visualstudio.com/docs/debugtest/debugging).

### Architecture Overview

Aster has one Tauri application window and one Vue renderer. The renderer is
loaded by `source/tauri/index.ts` and communicates with native functionality
only through the typed modules in `source/platform`. Those modules invoke Rust
commands and subscribe to Tauri events. Filesystem parsing and document
presentation remain in TypeScript, while OS access, dialogs, clipboard,
watching, and subprocess work belong in `src-tauri`.

The renderer remains a desktop-oriented SPA: Vue components are organised by
workspace, document, editor, and settings concerns rather than website layouts.

### Development Commands

Run these commands from the repository root:

- `yarn tauri:dev` — start the Tauri host and webpack development server.
- `yarn tauri:build` — build the frontend and native application installer.
- `yarn lint` — run ESLint and the TypeScript/Vue checker.
- `yarn test` — run the unit test suite.
- `yarn tauri:check` — type-check the Rust backend.
- `yarn tauri:fmt` — verify Rust formatting.

### Build Flags

The build process of Aster supports build flags that you can use to hardwire
certain behaviors into the final binary. These usually come as environment
variables. If they are present, Aster will produce a different binary.

#### `ZETTLR_DISABLE_UPDATE_CHECK`

If this environment variable is present during build, this will cause the
resulting binary to have its built-in update-checking mechanism disabled. This
is useful if you are repackaging the app for distribution through a package
manager. The build script will emit a warning that the binary will not have
update checks enabled.

To disable the update check at build time, simply make sure that this
environment variable is present. The build script only checks for its presence,
not the actual value. To ensure you are including the update check mechanism,
make sure this environment variable is *not* set, e.g., by running
`unset ZETTLR_DISABLE_UPDATE_CHECK` before running the build script.

> [!CAUTION]
> By creating and distributing a version of Aster with update checks disabled,
> you are responsible for ensuring that users will receive updates for Aster
> through a different mechanism. You acknowledge that you are responsible for
> ensuring that your update mechanism works reliably at all times. If – for any
> reasons – your update mechanism is disrupted – even temporarily – and Aster
> users cannot receive new updates, you are **required** to immediately notify
> us of this by opening a GitHub Issue, via Discord, or via Email.
> **Failure to comply with these added requirements will result in our immediate termination of the implicit consent for you to distribute modified Aster versions.**
> If we receive notice of a version of Aster being publicly distributed without
> a working update mechanism and you fail to communicate this directly to us, we
> will immediately warn users publicly about your Aster package and withdraw
> our implicit consent for you to distribute Aster. Thus, you will forfeit your
> allowance to distribute Aster indefinitely. In short: Only use this build
> flag if you know *exactly* what you're doing, and, if something goes wrong,
> communicate proactively. Then, all is good.

#### `BUNDLE_PANDOC`

If this environment variable is present during build, this will cause the build
script to **not** bundle the correct Pandoc binary into the final application
bundle. This is useful if you are repackaging the app for distribution through a
package manager and ensure that Pandoc gets installed as a dependency of Aster.
The build script will emit a warning that the binary will not be bundled with
Pandoc.

To disable bundling of Pandoc, you need to set the environment variable to `0`,
e.g.: `export BUNDLE_PANDOC=0`. This will cause the build script to neither
download nor bundle Pandoc. (This also absolves your build environment from the
specific requirements for the Pandoc download script identified above.)

> [!CAUTION]
> Aster users expect Pandoc to be present, since otherwise they will not be
> able to import or export files. Every version of Aster that is publicly
> distributed must therefore either come bundled with Pandoc, or ensure through
> another mechanism that Pandoc is installed on the computer. If you use this
> build flag while repackaging the app and distribute it via some package
> manager, you are **required** to ensure that Pandoc will be installed
> alongside Aster via some other means (e.g., by marking Pandoc as a dependency
> of Aster). We do not want users to start complaining that some Aster version
> has non-functioning exports or imports.
> **Failure to comply with these added requirements will result in our immediate termination of the implicit consent for you to distribute modified Aster versions.**
> Thus, you will forfeit your allowance to distribute Aster indefinitely. In
> short: Only use this build flag if you know *exactly* what you're doing. Then,
> all is good.

### Directory Structure

Aster is a mature app that has amassed hundreds of directories over the course
of its development. Since it is hard to contribute to an application without any
guidance, we have compiled a short description of the directories with how they
interrelate.

<!-- File tree generated with `tree -d -L 4 -I node_modules .` in root -->

```
.
├── out                                   # Contains packaged apps (without the installer)
├── release                               # Contains packaged apps with the installer
├── resources                             # Resources for the app
│   ├── icons                             # Icons for the app in various sizes
│   ├── liquid-glass                      # The macOS Liquid Glass icon
│   ├── NSIS                              # NSIS installer pictures
│   ├── screenshots                       # The screenshots you can see in this file
├── scripts                               # Various scripts; should be called via `yarn`
├── source                                # Contains all source files
│   ├── app                               # Main process code
│   │   └── service-providers             # Service providers (singletons)
│   │       ├── appearance                # Appearance-related functionality
│   │       ├── assets                    # Assets (export profiles, custom CSS, etc.)
│   │       ├── citeproc                  # Citation management
│   │       ├── commands                  # Various commands that the user can execute
│   │       ├── config                    # The main configuration
│   │       ├── css                       # Custom CSS provider
│   │       ├── dictionary                # Hunspell provider
│   │       ├── documents                 # Main document editing hub
│   │       ├── fsal                      # File-System Abstraction Layer
│   │       ├── links                     # Zettelkasten-Link and interlinking management
│   │       ├── log                       # Logging
│   │       ├── long-running-tasks        # Long-Running Task indication management
│   │       ├── menu                      # Application menus
│   │       ├── recent-docs               # Recent documents
│   │       ├── search                    # Full-text search
│   │       ├── stats                     # Writing statistics
│   │       ├── tags                      # Tagging management
│   │       ├── targets                   # Writing targets
│   │       ├── tray                      # Tray icon management
│   │       ├── updates                   # Checks for updates
│   │       └── windows                   # Manages all application windows
│   ├── common                            # Shared modules
│   │   ├── modules                       # Various renderer modules
│   │   │   ├── markdown-editor           # The primary Markdown editor
│   │   │   ├── markdown-utils            # Markdown converters and AST
│   │   │   ├── persistent-data-container # Data structure used in the main process
│   │   │   ├── preload                   # Shared renderer process hooks
│   │   │   ├── trusted-types             # Trusted Types
│   │   │   └── window-register           # Shared initialization function for the SPAs
│   │   ├── pandoc-util                   # Various utilities for running Pandoc
│   │   ├── util                          # Utility functions
│   │   └── vue                           # Shared Vue components
│   │       ├── form                      # Form builder
│   │       ├── iris-indicator-utils      # Shader code for the Iris Indicator
│   │       └── window                    # Window Chrome
│   ├── pinia                             # SPA State management
│   ├── types                             # Shared types (deprecated)
│   ├── win-about                         # "About" window
│   ├── win-assets                        # Assets manager
│   ├── win-error                         # Custom error modal
│   ├── win-log-viewer                    # Log viewer
│   ├── win-main                          # Primary application window
│   ├── win-onboarding                    # Onboarding dialog
│   ├── win-paste-image                   # Paste-image modal
│   ├── win-preferences                   # Settings window
│   ├── win-print                         # Print preview
│   ├── win-project-properties            # Project properties dialog
│   ├── win-splash-screen                 # Splash screen
│   ├── win-stats                         # Statistics window with graph view
│   ├── win-tag-manager                   # Tag manager
│   └── win-update                        # Update dialog
├── static                                # Static files that are included in the application during build
│   ├── csl-locales                       # CSL translations
│   ├── csl-styles                        # CSL styles
│   ├── defaults                          # export profiles
│   ├── dict                              # A selection of hunspell dictionaries
│   ├── fonts                             # Fonts
│   ├── lang                              # App translations
│   ├── lua-filter                        # Lua filters for exports
│   └── tutorial                          # Tutorial files, sorted by language
└── test                                  # Unit tests
```

## Command-Line Switches

Both during development and for release builds, the Aster binary features a few
command line switches that you can make use of for different purposes.

#### `--launch-minimized`

This CLI flag will instruct Aster not to show the main window on start. This is
useful to create autostart entries. In that case, launching Aster with this
flag at system boot will make sure that you will only see its icon in the tray.

Since this implies the need to have the app running in the tray bar or
notification area when starting the app like this, it will automatically set the
corresponding setting `system.leaveAppRunning` to true.

> [!NOTE]
> This flag will not have any effect on Linux systems which do not support
> displaying an icon in a tray bar or notification area.

#### `--clear-cache`

This will direct the File System Abstraction Layer to fully clear its cache on
boot. This can be used to mitigate issues regarding changes in the code base. To
ensure compatibility with any changes to the information stored in the cache,
the cache is also automatically cleared when the version field in your
`config.json` does not match the one in the `package.json`, which means that, as
long as you do not explicitly set the `version`-field in your `test-config.yml`,
the cache will always be cleared on each run when you type `yarn start`.

> [!TIP]
> By selecting the appropriate item from the "Help" menu and restarting Aster,
> it will automatically start with this flag passed, meaning that it will clean
> the cache for non-technical users.

#### `--data-dir=path`

Use this switch to specify a custom data directory, which holds your
configuration files. Without this switch, the data directory defaults to
`%AppData%/Zettlr` (on Windows 10 and newer), `~/.config/Zettlr` (on Linux), or
`~/Library/Application Support/Zettlr` (on macOS). The path can be absolute or
relative. Basis for the relative path will be either the binary's directory
(when running a packaged app) or the repository root (when running an app that
is not packaged). Remember to escape spaces or quote the path, if necessary. The
`~` character to denote the home directory is not expanded in this case, so make
sure to pass the entire path to your home directory if necessary. Due to a minor
platform compatibility detail, an empty `Dictionaries` subdirectory is created in the default
data directory, but it does not impact functionality.

#### `--disable-hardware-acceleration`

This switch causes Aster to disable hardware acceleration, which could be
necessary in certain setups. For more information on why this flag was added,
see issue [#2127](https://github.com/Zettlr/Zettlr/issues/2127).

## VSCode Extension Recommendations

This repository makes use of Visual Studio Code's
[recommended extensions feature](https://go.microsoft.com/fwlink/?LinkId=827846).
This means: If you use VS Code and open the repository for the first time, VS
Code will tell you that the repository recommends to install a handful of
extensions. These extensions are recommended if you work with Aster and will
make contributing much easier. The recommendations are specified in the file
`.vscode/extensions.json`.

Since installing extensions is sometimes a matter of taste, we have added short
descriptions for each recommended extension within that file to explain why we
recommend it. This way you can make your own decision whether or not you want to
install any of these extensions (for example, the SVG extension is not necessary
if you do not work with the SVG files provided in the repository).

If you choose not to install all of the recommended extensions at once (which we
recommend), VS Code will show you the recommendations in the extensions sidebar
so you can first decide which of the ones you'd like to install and then
manually install those you'd like to have.

> [!TIP]
> Using the same extensions as the core developer team will make the code
> generally more consistent since you will have the same visual feedback.

## License

This software is licensed via the
[GNU GPL v3-License](https://www.gnu.org/licenses/gpl-3.0.en.html).

The brand (including name, icons and everything Aster can be identified with)
is excluded and all rights reserved. If you want to fork Aster to develop
another app, feel free but please change name and icons.
[Read about the logo usage](https://www.zettlr.com/press#usage-rights).
