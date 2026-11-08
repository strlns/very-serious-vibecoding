# Squeaklite · SQLite workspace

A static, browser-only desktop workspace for exploring, querying and editing SQLite 3 databases. No backend, database server, native bindings or Node APIs at runtime. All imported data is processed on the device. Includes a fictional commerce sample so the app can be explored immediately.

## Quick start

Use Node.js **24.11+** (`nvm use` reads `.nvmrc`) and npm. Every direct dependency is pinned to an exact stable version; `package-lock.json` pins the complete dependency tree.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite.

```sh
npm test                 # SQLite, routing and graph gesture tests
npm run test:ui          # rendered React flows against a real SQLite engine
npm run build            # default target: self-contained releases/squeaklite.html
npm run build:static     # optional split-assets HTTP(S) deployment → dist/
npm run preview          # preview dist/ locally
npm run build:standalone # self-contained releases/squeaklite.html
npm run build:all        # produce both formats
npm run build:root       # also refresh ../squeaklite.html in the monorepo
npm run typecheck        # strict checking of the migrated TypeScript modules
npm run verify           # typecheck, engine, UI, build and generated-worker checks
npm run release          # verify + reproducible source/build ZIP
```

The supplied release archive contains both the reproducible source and prebuilt outputs. `dist/` can be hosted by any static HTTP(S) server, including under a subdirectory. The standalone **`releases/squeaklite.html`** embeds the app, fonts, SQLite WebAssembly and a Blob-based worker in one file; it is intended for direct local opening in modern desktop browsers as well as HTTP hosting. Browser policies can restrict workers on `file:` URLs; if so, serve the file over localhost. The regular `dist/index.html` needs HTTP(S) because it loads a worker and WebAssembly assets. Neither format needs a runtime CDN or internet connection. The normal static build is preferable for hosting and asset caching.

## What you can do

- Import SQLite files, ZIP archives, or a folder using the browser file picker. Folder paths and companion files are preserved. Drop a ZIP or database anywhere in the app. An imported workspace replaces the current workspace after a reminder when there are changes.
- Browse companion files in **Workspace files / Files**. Plain UTF-8 and BOM-marked UTF-16 text (Markdown, JSON, CSV, source code, notes, etc.) is rendered as inert text. Edit complete files up to 256 KiB, preserve drafts while changing routes, and save their bytes into the next ZIP. Large text files have a read-only 256 KiB preview; binary files and the unpreviewed remainder are preserved in full. Create, rename and confirm deletion of companion files. An export reminder distinguishes unsaved text drafts from saved file bytes.
- Switch between multiple databases in one workspace. Only the selected database is open in SQLite memory; edits are serialized before switching.
- Browse tables and views with server-free paging (25–200 rows), column sorting, escaped text search, exact value/NULL filtering and column visibility controls.
- Inspect and edit rows in generated forms. Insert rows with SQLite defaults, edit values, review and confirm single-row or atomic bulk deletion. Explicit NULL and SQLite defaults are independently available on inserts. Generated columns and BLOB fields are protected in forms. Use SQL for binary changes and advanced migrations. Foreign key constraints are enabled when a database opens.
- Inspect columns, types, defaults, primary keys, foreign keys, indexes and original CREATE SQL.
- Use **Add Table / Add View** or the **Schema explorer** to create and inspect tables, views, indexes and triggers. Search/filter the full schema, inspect CREATE definitions, columns and related objects, then browse their rows or manage their definitions. Rename tables/columns, add columns, or confirm column removal. Column and user-index rows have direct edit/delete icons in Structure; column rows have the same controls in Schema explorer. Tables use ALTER operations rather than replacement to preserve rows. More complex constraint/type changes remain explicit SQL migrations.
- A view’s **Query** tab opens its defining SELECT without executing it. An explicit **Edit view definition** action is available from the data, structure and query screens. View query drafts stay separate from other views and table queries; **Load saved view SQL** restores the current definition, and **Edit view** saves definition changes through review. Changed definitions and replacement workspaces refresh the initial SQL.
- Create views from SQL or the shared visual SELECT builder. Edit/rename view definitions, preserve explicit column aliases and attached triggers, and confirm view deletion. Visual view definitions have no implicit row limit. SQLite view rows stay read-only in forms; INSTEAD OF triggers can still be managed and used through SQL.
- Manage indexes with a column/unique builder or CREATE SQL; create/edit triggers as one CREATE TRIGGER statement. All schema changes show exact SQL for confirmation. Worker checks reject stale reviews, appended statements and wrong-database operations; savepoints roll back failures. Dropping a table/view with detected dependent objects is blocked. Editing a view preserves its triggers in the same transaction. Imported broken views can be inspected and repaired without making the whole workspace unusable.
- In the database selector, create empty databases, rename their ZIP paths, and confirm removal. At least one database stays open; create/import a replacement before removing the last one. Original device files are untouched until you choose to download a new archive.
- SQL editors show light-grey inline schema suggestions. Tab accepts, ↑/↓ cycles up to eight candidates, Escape dismisses, and Shift+Tab leaves the editor. Sources include tables/views and alias-qualified columns, plus a small contextual keyword vocabulary. Automatic keyword suggestions begin after one typed letter; Arrow Down explicitly requests suggestions, including at an empty caret. Clause/expression state limits suggestions to supported syntax, and unknown contexts (including CTE/subquery scopes) remain quiet. Strings, comments, selected text, IME composition and scripts over 200,000 characters suppress completion. This is a bounded grammar aid: complex CTE/subquery scopes and unsupported dialect syntax require explicit typing. Unusual names are quoted on insertion. The same editor is used for queries, views, schema definitions and saved queries.
- The SQL editor starts empty. An optional table-aware SELECT suggestion inserts text only when requested; it never runs automatically. Run raw SQL, including multiple statements, DDL, DML, transactions and PRAGMAs. Potentially data-changing scripts require review and confirmation before execution; this includes DELETE/DROP/REPLACE and state-changing commands. Ctrl/⌘ + Enter opens the query workspace from other views, then runs the current SQL or visual query with the same confirmation gate. Main Enter and numpad Enter are supported. Outside editable fields, `/` focuses table search and `?` opens the shortcut guide. Dialogs, held keys and IME composition do not trigger these shortcuts. Shift+Tab leaves the SQL editor; Tab accepts a visible completion or inserts indentation. Graph keyboard controls act on the focused viewport; browser modifier shortcuts remain available. Inspect each result set, view session history and export displayed results as CSV.
- Build SELECT queries visually with selected columns, AND/OR conditions, comparisons, LIKE/contains/NULL checks, foreign-key left joins, aggregates, grouping, ordering and row limits. Transfer generated SQL to the editor.
- Inspect the foreign-key graph, drag to pan, pinch with two fingers to zoom, or use Ctrl/⌘ + wheel/trackpad pinch. Fit considers both width and height. Full screen uses the native browser API with a viewport-filling fallback, including Escape and focus handling. Follow a foreign key (including composite keys and self-references) from a row form to the referenced record.
- View query results as row-card graphs or map source/target columns into connection graphs. Use Find, pan, pinch, Fit and full screen; click a node for read-only inspection. Graph generation and viewport rendering have explicit budgets.
- Create, edit and save query text locally in this browser. Removing a saved query requires confirmation. No imported database content is written to localStorage.
- Export all workspace files to ZIP, replacing edited databases in their original paths. Alternatively download the active database, or the displayed table page/query result as CSV.
- Navigate with hash routes and browser back/forward. The shell stays within the viewport: the main content scrolls vertically and data panels scroll horizontally. Mobile uses an off-canvas sidebar, modal controls, safe-area insets and readable form inputs. Graph panning and zooming affect only the graph camera.

## Deletion and stable state

Row deletion, bulk deletion, schema deletion, database removal, saved-query removal and potentially destructive SQL all require confirmation. Row/bulk deletion reviews the exact keys and database first, displays direct foreign-key references and their ON DELETE actions, and uses a mutation token so a stale review cannot delete newer data. View rows and query-result graphs are read-only; view definitions can be created, changed and deleted in the schema tools. The SQL review uses a conservative tokenizer that ignores quoted text and comments; it gates potentially changing statements, including CTE deletes and scripts with multiple statements. Some harmless PRAGMAs or unusual SQL can therefore request review too.

The sample database intentionally has restrictive references: customers are referenced by addresses/orders, and orders by payments/order items. A blocked delete is explained instead of bypassing constraints. Open the related table to resolve references first. Existing CASCADE/SET NULL/SET DEFAULT rules and triggers remain SQLite's responsibility; the review shows direct dependencies and does not promise a complete transitive trigger/cascade count. No automatic cascade override is introduced.

Bulk deletion is one DELETE inside a savepoint. Failure rolls back the selection atomically; success clears selection and checkboxes, refreshes the view and clamps an empty last page. Cancelling preserves the selection and any unsaved form values. Busy forms cannot be dismissed or edited midway through a mutation. Table results are tied to their database/table/filter/page request, and database identity is checked again in the worker.

## Query result graphs and rendering budgets

Choose **Graph** beside a result set. **Row cards** display records without inventing relationships. **Connections** maps explicit source and target columns, with an optional link label; conventional source/target aliases are detected. Numeric IDs remain lossless, text IDs stay distinct from numeric IDs, and duplicate links are counted. Empty, binary or excessively long endpoints are omitted with a notice.

Each graph examines at most 1,000 returned rows, retains at most 500 nodes and 1,000 links, and defaults to a 250-node budget (100/250/500 selectable). Cards show up to eight fields; inspection shows up to 128 columns. Schema graphs cap tables at 500 and show the first 12 columns per card. Extra fields and omitted rows are reported.

Rendering culls offscreen nodes and links. At wide zoom levels, at most 64 detailed cards and 240 links are drawn; additional visible nodes use lightweight overview shapes. Find moves to a loaded node so it can be inspected even when previously offscreen. Graph errors are contained behind a return-to-table fallback. Larger query tables also virtualize rows, keeping a bounded visible window rather than mounting the entire result. Limits reduce rendering risk; they cannot guarantee a browser will survive arbitrary SQL or insufficient device memory.

## Mobile table gestures

Touch-sized screens and devices with coarse pointers default to **Steady scroll** in table, schema and query-result views. A short movement threshold distinguishes taps from drags. Each drag locks to its first dominant axis, moves at 65% of finger travel, stays within the panel bounds, and has no release momentum. The small arrow buttons move the table by a bounded horizontal step. Taps still inspect rows; dragging does not open a row accidentally. Pen drags use the same guardrails.

The mode button switches to **Native scroll** and remembers that preference locally. Mouse wheels, trackpads, scrollbars and keyboard scrolling remain native. Regions without overflow in an axis allow the parent to handle movement in that axis. Browser/system zoom is preserved: the table policy always includes pinch zoom (or its manipulation shorthand), a second pointer stops the custom drag, and no wheel or multi-touch zoom event is cancelled. The viewport meta tag has no maximum scale or user-scalable restriction. `touch-action: manipulation` suppresses accidental double-tap zoom, while deliberate native pinch remains available. Graph gestures continue to use their separate anchored pan/zoom camera.

## Data and performance model

`src/engine.mjs` owns SQLite and ZIP operations inside a dedicated Web Worker. React receives metadata and bounded result pages. File bytes, query execution, ZIP expansion/compression and SQLite exports stay in the worker. File inputs are passed as cloneable File/path descriptors so folder paths survive worker boundaries. Companion files from folders stay as File objects until export; companion bytes extracted from ZIP stay in the worker. On-screen BLOBs are summarized instead of transferring their binary payloads to the UI.

SQLite runs **in memory**, not directly against a disk file. One active SQLite database, original workspace bytes, exports and ZIP compression can require multiple times the input size. Imports have a **768 MiB expanded workspace budget** and a **10,000-file limit**; those limits are ceilings, not a guarantee a device can process that amount. Large text values, wide result sets, full-table searches, COUNT, sorting and OFFSET pagination can still be expensive. Indexes improve suitable queries. The UI remains responsive while the worker is busy; an active query cannot currently be cancelled without restarting the worker and losing unsaved work. There is no OPFS-backed engine in this edition.

Each SQL result set is capped at **1,000 rows**, with a shared per-run budget of **20,000 cells / 4 MiB** of retained values. Long text values are clipped to 4,096 characters in query results and their CSV exports, with a notice. Scripts are capped at 1 MiB and 20 statements; if a later statement exceeds a limit or fails, earlier statements may already have completed. A SELECT is finalized after detecting an additional row. Add WHERE/LIMIT clauses to narrow expensive work. CSV exports include the displayed result/page, not the full table; BLOBs are represented by their size. Integer values are read as BigInt to preserve SQLite's signed 64-bit values and are bound losslessly in row keys. The form editor uses a usable primary key or a hidden rowid; nullable primary keys fall back to rowid to avoid changing several NULL-key rows.

Changes remain in memory until you export. In memory-only mode, reloading or closing clears imported workspaces, edits and history. Where OPFS is available, committed workspace changes are autosaved and restored. A browser leave warning is registered when changes are detected, but browser policies control when it appears. Loading the page restores the saved workspace when available, otherwise starts the sample. Saved query text persists in localStorage. Exporting downloads a copy and keeps the changed indicator as a reminder that the working database is still held only in memory.

Raw SQL executes statements in order. An error in a later statement does **not** roll back earlier statements automatically. Use `BEGIN; … COMMIT;` for an atomic script and `ROLLBACK;` after a failure as needed. Finish active write transactions before exporting or switching databases; SQLite will reject a busy export. Queries that write rows, alter the schema or use transaction/PRAGMA statements mark the workspace changed. Views are read-only in forms, even when a trigger could permit writes.

WAL sidecar files are rejected when paired with a database; checkpoint the source database before copying/importing. Use consistent copies of closed/checkpointed databases. Encrypted databases, native extensions, direct native filesystem editing, attached-database export and automatic recovery are outside this edition. ZIP imports reject path traversal and duplicate file paths, preserve companion files and empty ZIP directory entries, and reject archives above the expanded budget. ZIP files inside imported folders are preserved as companion files. Empty folders cannot be obtained through standard folder file inputs.

## Source map

| Path | Responsibility |
| --- | --- |
| `src/main.tsx` | Browser entry point |
| `src/App.jsx` | Shell, table browser, forms and workspace dialogs |
| `src/routes.ts` | Hash routes and foreign-key filters |
| `src/graph-camera.mjs` | Pan/pinch/zoom geometry and graph layout |
| `src/TableViewport.jsx` | Touch table controls, native zoom handoff and accessible scroll regions |
| `src/table-drag.mjs` | Axis lock, damped drag and boundary geometry |
| `src/Query.jsx` | SQL editor, visual builder, result sets |
| `src/Graph.jsx` | Shared virtualized graph viewport, navigation and gestures |
| `src/ResultGraph.jsx` | Query graph mapping, inspection and error fallback |
| `src/graph-scene.mjs` | Bounded graph generation and viewport culling |
| `src/DeleteDialog.jsx` | Dependency-aware deletion confirmation |
| `src/sql-review.mjs` | Conservative SQL execution review gate |
| `src/view-state.ts` | Table request identity |
| `src/engine.mjs` | SQLite operations, bounded data reads, ZIP round trips |
| `src/db.worker.js` | Normal worker with a separately cached WASM asset |
| `src/db-inline.worker.js` | Portable worker with embedded WASM |
| `src/client.ts` | Promise-based worker RPC |
| `src/sql.ts` | SQL identifier/value quoting and query generation |
| `src/demo.mjs` | Sample database fixture |
| `src/styles.css` | Desktop-first responsive UI; local font assets |
| `scripts/standalone.mjs` | Converts the standalone Vite output into one HTML file |
| `tests/` | SQLite, import/export, graph geometry and route tests |
| `tests-ui/` | Node-based DOM component tests using real SQLite (no browser installation) |
| `tests-built/` | Both generated workers and their WebAssembly modules |
| `scripts/release.mjs` | Reproducible source + build ZIP using Node only |

## Dependencies

Runtime/build versions were resolved from npm stable `latest` tags on 2026-11-08; the happy-dom test dependency was resolved on 2026-11-09. Every direct version is pinned in package.json, and .npmrc defaults future additions to exact versions. Upgrade deliberately with exact versions and regenerate the lockfile; commit both together. `npm ci` reproduces the pinned dependency graph.

React renders the interface; Vite builds the static app; sql.js supplies SQLite WebAssembly; fflate handles ZIP; lucide-react supplies icons; Fontsource packages provide local DM Sans and IBM Plex Mono fonts. See `THIRD-PARTY-NOTICES.txt` and `licenses/` for dependency notices.

Primary documentation: [sql.js](https://sql.js.org/), [Vite static builds](https://vite.dev/guide/build), [fflate](https://github.com/101arrowz/fflate).

## Verification

Run `npm run verify` for the full suite. `npm test` covers SQLite operations, ZIP/folder round trips, companion preservation, multiple databases, 64-bit integers, nullable/composite/descending primary keys, atomic bulk deletion, stale reviews, foreign-key dependency plans and transactions, plus pinch anchoring, pointer transitions, fit geometry, routes and guarded table drags. `npm run test:ui` mounts the actual React components in happy-dom and uses the real SQLite engine for browsing, paging, sorting, search/filter/column controls, editing/errors, import, explicit NULL inserts, row deletion, read-only views, self-referencing foreign-key links, multi-statement SQL, failed-query cleanup, history/saved queries, visual joins/aggregates, ZIP downloads, opt-in SQL suggestions, empty-editor execution guards, steady/native table scrolling, native zoom handoff, query graphs, large-result virtualization, deletion/cancellation/selection resets, saved-query removal and graph/fullscreen events. Representative computed CSS text colors are tested for at least 4.5:1 contrast on their surfaces; this is not a full accessibility conformance audit. happy-dom is a DOM test runtime; it does **not** verify CSS layout or device-native touch behavior.

`npm run build:all` builds both output formats. `npm run test:built` exercises both generated worker bundles, including the embedded single-file worker, using Node's worker runtime and a browser-compatible adapter. It validates the actual built WebAssembly and edited ZIP round trips, queued import/browse operations and bulk deletion. It does not substitute a different database engine.

Automated DOM/model checks do not replace browser or device testing. The managed local-preview infrastructure was unavailable during development. Verify layout, physical multitouch and native fullscreen on target browsers, especially iOS/Android. Native fullscreen fallback, pointer events and geometry are covered by component/model tests; those are separate verification claims.

`npm run release` writes `releases/squeaklite-source.zip`, containing all source code, tests, lockfile, licenses, documentation, `dist/`, and `releases/squeaklite.html`. Release packaging itself uses only Node and an already pinned npm dependency. No Python, cloud helper, account, Sites tooling or hidden build service is required. The hosting identity is intentionally excluded from the portable source package.

## Monorepo integration and TypeScript migration

This is an ordinary directory in `veryseriousvibecoding`, not a submodule or a
separate repository. The parent GitHub Pages workflow installs dependencies,
runs verification, and publishes the single-file build at both `/squeaklite/`
and `/squeaklite.html`. It does not use ChatGPT Sites. No push is needed for local
builds, and building does not deploy anything.

The browser entry point, SQL builder, route handling, text encoding, table-view
identity and worker client now use TypeScript with strict checking. The RPC
method/argument/result types derive from the existing engine. React components,
SQLite engine and the remaining helpers are still JavaScript/JSX; `allowJs`
permits an incremental migration, while `checkJs` is intentionally off. This is
a typed foundation, not a claim that the full application is converted.

Existing `quarry-queries` / preference storage keys and the internal BLOB marker
are retained for compatibility. Product names and output filenames use Squeaklite.
Formatting expands the formerly compressed source for easier reading. Tests
remain alongside the implementation and exercise the same worker/SQLite engine.

`file://` compatibility depends on browser policy. Built-worker tests validate
embedded WASM and ZIP editing, but do not prove all browser storage/worker APIs
work under `file://`. A localhost server remains the fallback; no native wrapper
is required for that.

## Local autosave (OPFS)

The default build remains one self-contained HTML file. On HTTPS or localhost,
when OPFS and Web Locks are available, the worker automatically saves workspace
snapshots after imports, database switches and mutations. On startup it restores
all databases, companion files and the active database. Saved query text remains
in localStorage. Unsaved text-editor drafts, SQL editor contents and history are
not included; use Save in the file editor to include companion-text changes.

The sidebar reports memory-only, autosave-ready, saved or failed status, with a
last-saved time and manual retry. “Keep browser storage” requests persistent
storage; a denial does not disable autosave, but storage remains best effort.
Browser data deletion still removes snapshots. Export remains the backup and
portable copy. The export-dirty indicator is independent of local autosave.

`file://` / opaque origins intentionally remain memory-only. Unsupported APIs,
private-browser restrictions and a second simultaneous tab also fall back to
memory-only. A Web Lock prevents two tabs from silently overwriting one saved
workspace. All Squeaklite paths on the same origin share this workspace store.
Do not rely on a local filesystem path providing a persistent browser origin.

Snapshots use separate OPFS directories and publish HEAD only after all files
are closed successfully. Failed saves leave the previous committed snapshot
intact and report the error without turning a successful database edit into an
error. A corrupt/unreadable snapshot is preserved and automatic overwrite is
disabled for that session. After failure, export current work before clearing
site storage if you want to reset it. SQL write transactions must finish before
snapshotting; after COMMIT/ROLLBACK autosave retries. Partial script changes are
also saved when possible even if a later statement errors.

This is snapshot persistence, **not an OPFS-backed SQLite VFS**. Active databases
still run in sql.js RAM. The 768 MiB expanded import budget is unchanged. Saves
currently rewrite the workspace and may temporarily need space for two snapshots;
interrupted saves may leave unused directories. Large-workspace incremental
storage and garbage collection are future work.

Import/export are retained with autosave, including the memory-only fallback.
See [ROADMAP.md](ROADMAP.md) for direct paged OPFS access and streamed large-file
imports/exports; neither is implemented by snapshot persistence.
