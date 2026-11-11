## 1.6.0 · Portable builds and a more compact interface

- `npm run build` produces `dist/` and a single `dist-singlefile/index.html`.
- Removed release packaging, intermediate build copies and the repo-root HTML.
- Pages serves the normal bundle and offers the portable HTML as a download.
- Compact sidebar footer combines download and version information.
- Storage status and save controls moved into the header; redundant banners removed.
- Added a GitHub source link and reduced heading, tab and summary spacing.
- Native/steady scrolling remains available on touch/narrow layouts.

## 1.5.0 · Local workspace autosave

- OPFS snapshots and startup restore for multi-database workspaces.
- Atomic snapshot publication, memory fallback, cross-tab locking and save status.
- Import/export retained; opaque/file origins remain portable memory-only mode.
- Visible product branding and exported ZIP renamed to Squeaklite.
- Direct disk-backed SQLite and streamed large-file IO documented in ROADMAP.md.

# Changelog

## 1.4.1 · 2026-11-09

- Open a view’s Query tab with its defining SELECT, without executing it automatically. Keep edited drafts per view and refresh from changed definitions/workspaces.
- Add explicit controls to reload saved view SQL or edit the saved definition. Keep table queries as a separate scratch draft and clear mismatched results.
- Hide the empty-editor placeholder while an inline completion is visible, preventing overlapping text.
- Require a typed letter for automatic keyword suggestions; Arrow Down explicitly opens valid contextual suggestions. Qualify ambiguous columns and abstain from unsupported syntax.
- Make view-definition editing explicit across screens and add per-row column/index editing and confirmed deletion.

## 1.4.0 · 2026-11-09

- Add a searchable schema explorer for tables, views, indexes and triggers, with definitions, columns and related-object navigation.
- Add table creation/alteration, SQL/visual view creation and definition editing, index builders, and trigger definition editing. Review exact DDL; apply atomically with stale-review checks and dependency protections.
- Preserve view aliases and triggers during definition updates; keep broken imported views inspectable and repairable.
- Add database creation/path rename/confirmed removal and saved-query editing.
- Add a paged workspace-file browser with bounded text previews, UTF-8/UTF-16 text editing, persistent in-session drafts, companion-file CRUD and ZIP preservation. Verify standalone .db imports as well as folders and ZIPs.
- Share SQL editors with faded inline table/view/column completion, alias handling, safe identifier quoting, Tab acceptance, alternative cycling and small contextual keyword suggestions.
- Keep the public project URL and fully local Node/npm builds, tests and exports.

## 1.3.1 · 2026-11-09

- Wire the advertised table-search and query-navigation shortcuts; add a complete shortcut guide and platform-specific hints.
- Handle Command/Control + main or numpad Enter before focused controls, using the latest query, with dialog, busy, repeat and IME guards.
- Preserve Shift+Tab out of the SQL editor and browser-modified graph keys; explicitly focus the graph on background interaction.
- Add shortcut regressions for macOS Command, Control, numpad Enter, visual queries, confirmations and editable fields.

## 1.3.0 · 2026-11-09

- Review FK dependencies before deleting, explain blocked sample-database deletion, and reject stale reviews or wrong-database actions.
- Confirm row/bulk deletion, saved-query removal and potentially data-changing SQL consistently. Preserve cancellation state; clear successful deletions and clamp pagination.
- Add query-result row-card/connection graphs with hard generation budgets, viewport culling, detail budgets, Find and read-only inspection.
- Virtualize large query tables and cap retained query cells/bytes, text lengths, script size and statement counts.
- Improve text contrast while keeping the existing green/ivory design.
- Add engine, graph-budget, contrast and rendered-UI regressions. Keep the existing project URL and portable Node/npm release workflow.

## 1.2.0 · 2026-11-09

- Start the SQL editor empty; offer a table-aware SELECT suggestion that inserts only on request. Empty queries cannot run or be saved.
- Add steady touch/pen scrolling to table, schema and query-result panels: a tap threshold, one-axis locking, lower sensitivity, bounded motion and no fling after release.
- Add small horizontal step controls and a remembered native-scrolling option. Preserve wheel, trackpad, scrollbar and keyboard interaction.
- Preserve browser pinch zoom and remove accidental double-tap zoom. Hand multi-touch back to the browser; keep graph gestures separate.
- Add gesture-model and rendered-component regressions, including prevention of accidental row opening after a drag.

## 1.1.0 · 2026-11-09

- Keep the app shell within the viewport. Scroll wide data inside its panel and long pages inside the main content area.
- Add graph pinch zoom, anchored wheel zoom, keyboard controls, smooth pointer transitions, and movement-aware tap handling.
- Separate Fit from Full screen. Fit both graph dimensions; provide native fullscreen with a viewport-filling fallback, Escape, and keyboard focus handling.
- Lay out graph rows using actual column counts to avoid overlapping tall tables.
- Fix table loading after importing a new database. Clear stale query results after SQL errors or database switches.
- Route foreign-key filters without timers, including self-references and composite keys.
- Make bulk deletion atomic with SQLite savepoints. Serialize worker operations to prevent interleaved async imports.
- Correct row identity detection for descending INTEGER primary keys and use SQLite metadata for WITHOUT ROWID.
- Add explicit NULL insertion, inline form/import errors, safe handling of unavailable query storage, and aggregate/join builder corrections.
- Add rendered component tests and a Linux/Node/npm-only verification and source release workflow. Preserve exact dependency pins.

## 1.0.0

Initial static SQLite workspace: table browser, schema inspection, row forms, SQL editor, visual SELECT builder, relationship graph, ZIP/folder import/export and a portable single HTML build.
