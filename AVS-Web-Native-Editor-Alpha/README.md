# AVS//Web — native renderer alpha

This build runs the original AVS C/C++ renderer in WebAssembly and opens legacy
binary `.avs` presets directly. This milestone adds a schema-driven basic editor;
native APE plug-ins remain intentionally deferred.

![AVS//Web playing a visualization with the preset editor open on the right.](docs/avs-web-editor.png)

## Credits and source foundation

The renderer is based on grandchild/vis_avs, the modern C++ AVS port and libavs
library, at revision `1cee1f3`: [grandchild/vis_avs](https://github.com/grandchild/vis_avs).
Credit for that foundation belongs to grandchild and the other upstream
contributors, building on the original AVS by Justin Frankel and other Nullsoft
contributors. AVS//Web adds the browser adaptation and UI.

See [CREDITS.txt](CREDITS.txt) for attribution, [SOURCE-NOTICE.txt](SOURCE-NOTICE.txt) for web-port modifications,
and [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt) for dependency notices. The modern port's upstream
BSD 3-Clause license is reproduced verbatim in [LICENSE-AVS.txt](LICENSE-AVS.txt); individual
dependencies and legacy presets retain their own license status.

## Preset authors / takedown

The bundled presets were collected from publicly available legacy sources and
were created by their respective authors, not by this project. If you authored
a bundled preset or AVS component and want it removed, email
[mo@max-hirschfluss.de](mailto:mo@max-hirschfluss.de). Takedown requests will be handled promptly.

Bundled presets are optional and live separately in `presets/bundled-presets.js`.
The app continues to work with only “New preset” if that module is deleted. Each
preset is stored as one record per line so an individual preset can be removed
without changing application code. Entries known to require unsupported APE
effects are not included.

## Start locally

Serve this folder over **HTTP**. Opening `index.html` via `file://` does not
work: the app uses an ES-module Web Worker and WebAssembly. If an “Open in” action
opens a local file URL, use the HTTP address below instead.

With Python 3 installed, run one of the included launchers from this directory:

- **Windows:** `start-server.bat`
- **macOS/Linux:** `./start-server.sh`

Or start the server directly:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

On Windows, use `py -3` instead of `python3`. If your Python 3 executable is named
`python`, `python -m http.server 8080 --bind 127.0.0.1` also works.

Then open [http://127.0.0.1:8080/](http://127.0.0.1:8080/).
The launchers run this same server; no application build is needed to run the
included JavaScript and WebAssembly files.

## Audio

Use “Media file” or drop an audio or video file anywhere. For video files, the
audio track drives AVS while the compact player remains audio-only. “Share system
audio” uses the browser's screen/tab picker when the browser supports an audio
track. “Microphone” is the fallback when the browser cannot expose system or
other-app audio. Audio never leaves the browser.

If the browser exposes screen sharing without a usable audio track, the app reports
that system audio is unsupported and leaves file playback and the renderer usable.

The browser signal is normalized independently of playback volume. The native port
also restores AVS's original waveform-level beat detector; earlier alpha builds passed
waveform/spectrum data but never raised the beat flag.

## Editor

“New preset” is pinned at the top of the preset list and creates the default minimal
purple waveform preset, effectively clearing the current preset. It is selected on startup.
The separate “Clear every frame” checkbox is the original rendering setting and takes
effect after Apply. Optional Auto-apply is off by default and disables the manual Apply
button while active. Preset settings and components use compact dark accordions.

Date Initial and Date Last are display-only. Legacy binary presets do not contain the
initial-date metadata, so it is intentionally shown as empty instead of receiving a
synthesized date. Built-in preset comments are also display-only, and built-in presets
are downloaded with “ - edited” in the filename rather than overwritten.

For built-in legacy presets, Comment components are shown first as attribution and are
entirely read-only: they cannot be edited, disabled, or removed from within the app.

The header resolution selector offers Auto, 320×240, 640×480 and 800×600. Lower
fixed resolutions can substantially reduce CPU use for complex presets.

## Known alpha limitations

* Native APE plug-ins are skipped safely.
* Presets known to contain unsupported APE/unknown components are omitted.
* The Structure tab can edit supported fields and add/remove components. Apply
  validates changes through libavs; Save writes a legacy binary .avs file.
* Saving without applying changes preserves the original preset bytes exactly.
* Picture/video effects cannot yet resolve external media files.
* The mixed legacy preset collection has not been exhaustively regression-tested.

Normalization improves quiet material but deliberately does not alter the sound you
hear.

See About & licenses inside the app and the included license files.
