AVS//Web — native renderer alpha
================================

This build runs the original AVS C/C++ renderer in WebAssembly and opens legacy
binary .avs presets directly. This milestone adds a schema-driven basic editor;
native APE plug-ins remain intentionally deferred.

PRESET AUTHORS / TAKEDOWN
-------------------------

The bundled presets were collected from publicly available legacy sources and
were created by their respective authors, not by this project. If you authored
a bundled preset or AVS component and want it removed, email
mo@max-hirschfluss.de. Takedown requests will be handled promptly.

Bundled presets are optional and live separately in presets/bundled-presets.js.
The app continues to work with only “New preset” if that module is deleted. Each
preset is stored as one record per line so an individual preset can be removed
without changing application code. Entries known to require unsupported APE
effects are not included.

Start locally
-------------

For browser security reasons WebAssembly modules and module Workers need HTTP. From
this directory run one of:

  Windows:  start-server.bat
  macOS/Linux:  ./start-server.sh

Then open http://127.0.0.1:8080/ . Python 3 is required by these tiny launchers.

Audio
-----

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

Editor
------

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

Known alpha limitations
-----------------------

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
