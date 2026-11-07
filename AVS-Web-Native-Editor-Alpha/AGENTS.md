# AVS//Web — project guidance

This file belongs in the `AVS-Web-Native-Editor-Alpha/` subdirectory of the larger `veryseriousvibecoding/` Git repository. Keep work scoped to this subdirectory unless the user explicitly asks otherwise. The user reviews diffs and performs Git staging, commits, and pushes locally; do not commit, push, force-push, publish, or deploy on their behalf unless explicitly requested.

## Repository layout

- The Git root and `.git` directory are in the parent `veryseriousvibecoding/` folder. This AVS folder is a normal tracked subdirectory, not a separate repository or submodule. Do not run `git init`, create a nested `.git`, or add a submodule.
- Open this AVS folder as the local Codex project and use it as the working directory. Git commands can still discover the parent repository; `git rev-parse --show-toplevel` should identify it.
- The parent repository contains unrelated projects and a commit hook that generates a directory listing. Do not edit those other projects or the listing as part of AVS work. When reviewing changes from this directory, use a path-limited diff such as `git diff -- .` and check staged paths before a commit.

## What this project is

- A standalone, English-language web UI for the original AVS renderer compiled from C/C++ to WebAssembly. It loads legacy binary `.avs` presets directly; it does not use Webvs or converted JSON presets at runtime.
- `index.html`, `app.js`, `avs-worker.js`, `libavs.js`, `libavs.wasm`, the CSS files, and `presets/bundled-presets.js` comprise the distributable app. `app/index.html` is a backward-compatibility redirect; preserve it when packaging.
- The existing WASM binary is already built. This directory does not contain a complete native source checkout, Emscripten build recipe, or `package.json`. Read `SOURCE-NOTICE.txt` for the pinned native source basis and modifications; do not claim a WASM rebuild is reproducible here or silently replace it with a JS approximation.
- Bundled presets are optional and separate from application code. The app must still start with its new waveform preset if `presets/bundled-presets.js` is absent. Unsupported APE plugins remain out of scope unless the user changes that decision.

## Working on the app

- Read `README.md`, `SOURCE-NOTICE.txt`, and the relevant files before editing. Preserve working visualization, audio input, queue, editor, reduced-motion warning, and mobile behavior when making focused changes.
- Run the app from this directory with `./start-server.sh` on macOS/Linux or `start-server.bat` on Windows, then open `http://127.0.0.1:8080/`. HTTP is needed for its ES-module worker and WASM; opening `index.html` via `file://` is not the supported run path.
- Keep UI copy in English. Use system font stacks and local assets; do not add CDN dependencies or external fonts without an explicit reason and appropriate notices.
- Prefer a small syntax check or targeted manual inspection for ordinary changes. Do not create a blanket regression suite for the mixed legacy presets or run broad, expensive tests without a concrete need or the user's go-ahead.
- When making a deliverable, include the complete app directory and license/notice files in the ZIP. The user extracts it over the same subdirectory in their local Git checkout, reviews `git diff`, stages, commits, and pushes there. Do not overwrite unrelated folders in the parent repository or interfere with its hooks and generated directory listing.

## Attribution and licensing

- Preserve `LICENSE-AVS.txt`, every bundled third-party `LICENSE-*.txt`, `THIRD-PARTY-NOTICES.txt`, `SOURCE-NOTICE.txt`, and the About & licenses information. Verify notices when adding or rebuilding dependencies.
- The bundled presets were collected from publicly available mixed legacy sources. Credit their individual authors; do not claim that all presets fall under AVS's BSD source-code license or that this project created them. Preserve the attribution in legacy Comment components and the takedown contact `mo@max-hirschfluss.de` in the README and UI.
- AVS was originally shipped with Winamp; that trademark is not owned by this project. Keep it out of the app title and preserve the independent-project disclaimer in About & licenses.

## Audio and scope

- Media files, user-granted tab/system audio, and microphone input are general audio sources. Browser support for system/tab audio varies; avoid service-specific playback integrations or claims that a streaming provider authorizes AVS integration.
- An optional native desktop audio-loopback helper has been discussed as a possible future project, not approved for implementation. Do not add Electron, a native helper, or streaming-service SDKs without a separate request.
