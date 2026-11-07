# Editable AVS renderer

`avs/` starts from grandchild/vis_avs revision
`1cee1f3d4f783b830538c3e4d2082a2c59521dee`. Its bundled JSON, image decoder, FFT,
and WDL-EEL2 sources are included. Keep all upstream licenses and source notices.

`upstream.json` records the downloaded source archive and locally modified files;
`web-port.patch` captures the initial browser adaptations to upstream. The patch is a
review aid: it is already applied to `avs/`; do not apply it again before compiling.

## Fork adaptations

The changes supply portable render paths where upstream assumed x86 intrinsics,
use the EEL portable interpreter, initialize global RAM and callback pointers,
swap root settings together with child effects, accept browser hex colors, and
clear metadata absent from legacy files. The original waveform-level beat detector
from upstream `main.cpp` is adapted into `Audio::get()` for external PCM. Its FFT
window and legacy waveform buffers are kept separate to avoid overwriting memory.

`web/avs_wasm.cpp` exports the ABI consumed by `avs-worker.js`. Presets are loaded
into a fresh instance and committed only on success. The browser sends float PCM;
the native audio implementation calculates FFT and beat flags. `web/platform_web.cpp`
provides the synchronous single-worker platform layer. It deliberately provides
no OS audio capture, native dynamic plugins, native background threads, or external
media enumeration. Transitions that need native threads are not enabled by the ABI.

## Build and verify

From the project root:

```sh
npm ci
npm run setup:wasm
npm run build:wasm
```

Python 3 orchestrates compilation using the official, project-local Emscripten
**4.0.15** SDK. No system CMake, Rust, Winamp, native audio library, or x86 compiler
is required. The macOS arm64 host has been tested. Other hosts need compatible
official SDK binaries and Python 3; they have not been verified here.

Edit the source files directly. The incremental build tracks header contents,
source contents and compile options. Delete `build/native/` for a clean rebuild.
Output goes to `build/native/libavs.js`, `libavs.wasm`, and `provenance.json`.
`npm run dev` and `npm run build` compile these sources first. Vite packages the
generated loader and WASM unchanged.

`scripts/check-renderer.mjs` exercises waveform output, schema, hex colors, legacy
serialization and missing dates, root settings, Web Audio beat response, and actual
EEL/global-RAM execution. It is a focused smoke check, not an exhaustive regression
test of the mixed preset collection. A clean build, browser smoke checks, and
manual user testing have passed; all presets and effects are not exhaustively tested.
