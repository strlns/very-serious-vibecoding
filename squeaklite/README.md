# Squeaklite

A local-first SQLite workspace built with React, Vite and SQLite WebAssembly.
Explore tables, edit rows and schemas, run SQL, build queries visually, and inspect
relationship graphs. The first-open chooser offers an empty database, import,
or the fictional commerce demo; reopen it from Guide & shortcuts. The visual
builder supports LEFT/INNER joins (forward/reverse foreign keys or custom column
pairs), grouping and COUNT/SUM/AVG/MIN/MAX summaries. Self joins and aliases use
the SQL editor. One-to-many joins can multiply rows and aggregate values.
Import databases, folders or ZIPs containing multiple
databases and companion files. Data stays in your browser; there is no backend.

## Development

Node.js 24.11+ and npm are required. Dependencies are pinned in the lockfile.

```sh
nvm use
npm ci
npm run dev
```

## Build

```sh
npm run build
```

This produces **both** static build targets:

| Output | Contents | Usage |
| --- | --- | --- |
| `dist/` | HTML and separate JS, CSS, fonts and WASM assets | Serve the whole directory over HTTP(S); `npm run preview` previews it locally. |
| `dist-singlefile/index.html` | One HTML file with all code, fonts, WASM and worker embedded | Open directly in a compatible browser or serve over HTTP(S). |

`dist-singlefile/` contains only `index.html`, which is committed to Git so the
portable app and download target are also available from the repository. `dist/`
remains generated and ignored. There are no additional release or
repo-root copies. Neither build needs a CDN or runtime network connection.
Browser policies may restrict workers under `file://`; localhost is the fallback.

The parent monorepo's Pages action builds and verifies Squeaklite. It serves
`dist/` at `/squeaklite/` and the portable file at `/squeaklite/dist-singlefile/`.
The sidebar’s “Download HTML →” link downloads the portable app, independently
of workspace data export. In the single-file build it links to the current HTML
file, including after renaming or downloading it. In the split build it uses a
relative URL. Local dev/preview serves the existing portable artifact without
copying or transforming it; run `npm run build` first to generate that artifact.
For another HTTP host, publish `dist/` as the app root and `dist-singlefile/`
under that root, as the Pages workflow does. Serving both output directories
side by side also works at `/dist/` and `/dist-singlefile/`. A split build needs
HTTP(S), including localhost; opening its index via `file://` is not supported
by browser module-loading rules. Building locally does not deploy anything.

## Storage and portability

- SQLite runs in a worker using sql.js. The active database is held in RAM.
- On HTTPS/localhost with OPFS and Web Locks, committed changes are autosaved.
  Reload restores the databases, companion files and active database. A second
  tab uses memory-only mode to avoid overwriting the first tab's workspace.
  It queues an origin-scoped Web Lock request: when the owner closes, the header
  updates automatically and offers a reload to restore autosave. Reload discards
  that tab's in-memory changes, so export them first. No polling is used.
- `file://` and unsupported environments use memory-only mode. Check the visible
  storage status; export before closing when autosave is unavailable or failed.
- Import and database/ZIP/CSV export remain available in every mode. Exports are
  independent backups; original imported files are never overwritten.
- Unsaved text drafts, editor SQL and history are not autosaved. Save companion
  text changes explicitly. Saved queries and UI preferences use localStorage.
- Autosave publishes complete snapshots and retains the last good snapshot on
  failure. Restored file references move to the new snapshot before old snapshot
  files are removed. Open write transactions must finish before saving. Browser
  data can be cleared or evicted; “Keep browser storage” requests persistent storage.

## Limits

Imports allow up to 768 MiB expanded data and 10,000 files, subject to available
memory. ZIP expansion, database copies, snapshots and exports can require much
more space than the input. Snapshot saves rewrite the workspace and temporarily
need room for two snapshots. Interrupted saves can leave unused directories.

SQL runs at most 20 statements / 1 MiB per script. Results retain at most 1,000
rows each, with a shared 20,000-cell / 4 MiB budget; text is clipped at 4,096
characters. CSV contains the displayed results. A later SQL error does not undo
earlier statements; use explicit transactions for atomic scripts. Queries cannot
currently be cancelled. Use closed/checkpointed databases; WAL sidecars are not
imported. Text previews are capped at 256 KiB. Encrypted databases and native
SQLite extensions are unsupported.

See [ROADMAP.md](ROADMAP.md) for direct paged OPFS access and streamed large-file
I/O. These are not implemented by snapshot autosave.

## Checks and source

`npm run verify` runs TypeScript checking, engine/RPC tests, React DOM tests,
both builds, and tests of the generated WASM workers. Individual commands are
`typecheck`, `test`, `test:ui`, and `test:built`. DOM/worker tests do not replace
real-browser layout and storage checks.

`src/App.jsx` contains the UI; `engine.mjs` owns SQLite and workspace operations;
`persistence.ts` handles snapshots; `client.ts` connects the UI and worker.
TypeScript migration is incremental; remaining JS/JSX is not type-checked.
Legacy `quarry-*` storage keys and internal markers preserve compatibility.
Third-party licenses are in `licenses/` and [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt).
