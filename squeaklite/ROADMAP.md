# Squeaklite roadmap

## Delivered: portable HTML + OPFS workspace autosave

- Single HTML remains the default build, with embedded worker and WASM.
- Capability-based autosave, restore, quota errors, last-good snapshot protection.
- Multiple databases, companion files and active database are restored together.
- Memory-only fallback on file URLs, unavailable storage and concurrent tabs.
- **Import and export remain available in every mode.** Persistence never replaces
  portable database / ZIP import and export.

## Next: direct, paged SQLite access to OPFS

Initial investigation: sql.js uses an in-memory filesystem; persisting snapshots
alone does not remove the full-database RAM requirement. The official SQLite WASM
`opfs-sahpool` VFS is a candidate for the next backend. It does not require
COOP/COEP headers, which matters for the existing GitHub Pages static deployment.
Reference: https://sqlite.org/wasm/doc/trunk/persistence.md#vfs-opfs-sahpool

Implementation steps:

1. Add a backend interface around the SQL.js calls in Engine (Database, prepared
   statements, iteration, BigInt conversion and exports). Run the existing engine
   suite against both implementations; no silent loss of SQL functionality.
2. Prototype the official SQLite WASM engine + SAHPool in the same inline worker.
   Embed its WASM in the HTML and retain the current RAM backend as a fallback.
   Disable destructive storage reset on initialization failure; never clear a pool
   merely to recover startup. Preserve the existing snapshot during migration.
3. Stream standalone database imports into OPFS in bounded chunks, then open them
   by VFS path. Store workspace manifests and companion files separately. Committed
   SQLite writes go directly to disk; do not export the entire DB after each edit.
4. Preserve multi-database workspaces and locking, and keep old snapshots until the
   migrated workspace has been opened and validated successfully.
5. Stream database and ZIP exports where supported. A disk-backed engine alone
   does not eliminate ZIP decompression/export buffers. Replace the current whole-
   archive fflate path before advertising large ZIP support.
6. Only raise input limits after memory/size tests on Firefox, Chromium and Safari.
   Test >768 MiB databases, disk-full errors, interrupted imports, transactions,
   reload recovery, BLOBs and exact 64-bit IDs. Bound memory by chunk/cache size.

Status: backend selection investigated; direct paged VFS is not implemented yet.
The current 768 MiB expanded import ceiling remains in place. Snapshot autosave
was verified with a real localhost browser write/reload/read cycle; this does not
establish large-file performance or full cross-browser compatibility.
