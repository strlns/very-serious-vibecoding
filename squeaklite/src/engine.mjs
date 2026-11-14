import { unzipSync, zipSync, strToU8 } from "fflate";
import { ident } from "./sql.ts";
import { seedDemo } from "./demo.mjs";
import {
  TEXT_LIMIT,
  decodeText,
  encodeText,
  workspaceFilePath,
} from "./text-files.ts";
import { schemaStatements, schemaReferences } from "./schema-tools.mjs";
import { sqlNeedsConfirmation } from "./sql-review.mjs";
const MAX_IMPORT = 768 * 1024 * 1024;
const isSQLite = (bytes) =>
  new TextDecoder().decode(bytes.subarray(0, 16)) === "SQLite format 3\0";
const safePath = (p) =>
  !p.startsWith("/") && !p.split("/").includes("..") && !p.includes("\\");
const forDisplay = (v) =>
  v instanceof Uint8Array ? { __quarryBlob: true, length: v.length } : v;
export class Engine {
  constructor(SQL) {
    this.SQL = SQL;
    this.files = new Map();
    this.path = "";
    this.db = null;
    this.dirty = new Set();
    this.generation = 0;
    this.operationVersion = 0;
    this.workspaceGeneration = 0;
  }
  async initialize() {
    let restored = false;
    if (this.persistence) {
      const snapshot = await this.persistence.initialize();
      if (snapshot) {
        try {
          this.files = new Map(snapshot.entries.map((e) => [e.path, e.data]));
          await this.open(snapshot.active);
          this.dirty = new Set(snapshot.dirty);
          this.workspaceGeneration++;
          this.persistence.allowWrites();
          restored = true;
        } catch (error) {
          this.persistence.fail(
            error,
            "Restore failed; original snapshot preserved",
          );
        }
      }
    }
    const workspace = restored ? await this.workspace() : await this.demo();
    return { ...workspace, restored, persistence: this.persistence?.status };
  }
  snapshot() {
    this.active();
    this.flush();
    return {
      active: this.path,
      dirty: [...this.dirty],
      entries: [...this.files].map(([path, data]) => ({ path, data })),
    };
  }
  async storageSave() {
    await this.persistence?.save(() => this.snapshot());
    return this.persistence?.status;
  }
  values(sql, params = []) {
    const stmt = this.db.prepare(sql);
    try {
      stmt.bind(params.map((v) => (typeof v === "bigint" ? String(v) : v)));
      const rows = [];
      while (stmt.step())
        rows.push(stmt.getAsObject(null, { useBigInt: true }));
      return rows;
    } finally {
      stmt.free();
    }
  }
  active() {
    if (!this.db) throw new Error("Open a SQLite database first.");
  }
  flush() {
    if (this.db) {
      this.files.set(this.path, this.db.export());
      this.db.run("PRAGMA foreign_keys=ON");
    }
  }
  async open(path) {
    if (path === this.path && this.db) return this.meta();
    const source = this.files.get(path);
    if (!source) throw new Error("Database file not found.");
    const bytes =
      source instanceof Uint8Array
        ? source
        : new Uint8Array(await source.arrayBuffer());
    const next = new this.SQL.Database(bytes);
    try {
      next.exec("SELECT name FROM sqlite_schema LIMIT 1");
      next.run("PRAGMA foreign_keys=ON");
      this.flush();
    } catch (e) {
      next.close();
      throw e;
    }
    this.db?.close();
    this.db = next;
    this.path = path;
    this.generation++;
    return this.meta();
  }
  async empty() {
    const next = new this.SQL.Database();
    next.run("PRAGMA user_version=0");
    const bytes = next.export();
    next.close();
    this.db?.close();
    this.db = null;
    this.path = "";
    this.files = new Map([["workspace.db", bytes]]);
    this.dirty.clear();
    this.workspaceGeneration++;
    await this.open("workspace.db");
    return this.workspace();
  }
  async demo() {
    this.workspaceGeneration++;
    const next = new this.SQL.Database();
    seedDemo(next);
    const bytes = next.export();
    next.close();
    if (this.db) this.db.close();
    this.db = null;
    this.path = "";
    this.files = new Map([
      ["commerce.db", bytes],
      [
        "README.txt",
        strToU8(
          "Squeaklite sample workspace. A fictional commerce database for exploring SQLite.\n",
        ),
      ],
    ]);
    this.dirty.clear();
    await this.open("commerce.db");
    return this.workspace();
  }
  async importFiles(files) {
    const entries = new Map();
    let total = 0;
    for (const item of files) {
      const file = item.file || item;
      const selectedPath = item.path || file.webkitRelativePath || file.name;
      if (
        selectedPath.toLowerCase().endsWith(".zip") &&
        !selectedPath.includes("/")
      ) {
        const archive = new Uint8Array(await file.arrayBuffer());
        const expanded = unzipSync(archive, {
          filter: (f) => {
            if (!safePath(f.name))
              throw new Error("Archive contains an unsafe path.");
            total += f.originalSize;
            if (total > MAX_IMPORT)
              throw new Error(
                "Expanded workspace exceeds the 768 MiB import budget.",
              );
            return true;
          },
        });
        for (const [p, v] of Object.entries(expanded)) {
          if (entries.has(p)) throw new Error(`Duplicate path: ${p}`);
          entries.set(p, v);
        }
      } else {
        const path = selectedPath;
        if (!safePath(path)) throw new Error("Invalid file path.");
        total += file.size;
        if (total > MAX_IMPORT)
          throw new Error("Workspace exceeds the 768 MiB import budget.");
        if (entries.has(path)) throw new Error(`Duplicate path: ${path}`);
        entries.set(path, file);
      }
    }
    if (entries.size > 10000)
      throw new Error("A workspace can contain up to 10,000 files.");
    const databases = [];
    for (const [path, value] of entries) {
      const head =
        value instanceof Uint8Array
          ? value.subarray(0, 16)
          : new Uint8Array(await value.slice(0, 16).arrayBuffer());
      if (isSQLite(head)) databases.push(path);
    }
    if (!databases.length)
      throw new Error(
        "No SQLite databases found. Import a .db/.sqlite file, ZIP, or folder containing a SQLite 3 database.",
      );
    for (const p of databases) {
      if (entries.has(p + "-wal"))
        throw new Error(
          `A WAL sidecar was found for ${p}. Checkpoint the database in its source application before importing.`,
        );
    }
    const source = entries.get(databases[0]);
    const next = new this.SQL.Database(
      source instanceof Uint8Array
        ? source
        : new Uint8Array(await source.arrayBuffer()),
    );
    try {
      next.exec("SELECT name FROM sqlite_schema LIMIT 1");
      next.run("PRAGMA foreign_keys=ON");
    } catch (e) {
      next.close();
      throw e;
    }
    this.db?.close();
    this.db = next;
    this.files = entries;
    this.path = databases[0];
    this.dirty.clear();
    this.databasePaths = databases;
    this.generation++;
    this.workspaceGeneration++;
    return this.workspace();
  }
  async workspace() {
    const databases = [];
    for (const [path, file] of this.files) {
      const bytes =
        file instanceof Uint8Array
          ? file.subarray(0, 16)
          : new Uint8Array(await file.slice(0, 16).arrayBuffer());
      if (isSQLite(bytes))
        databases.push({
          path,
          size: file.size ?? file.length,
          dirty: this.dirty.has(path),
        });
    }
    return {
      workspaceId: this.workspaceGeneration,
      databases,
      files: [...this.files].map(([path, f]) => ({
        path,
        size: f.size ?? f.length,
      })),
      active: this.path,
      meta: this.meta(),
      dirty: [...this.dirty],
    };
  }
  meta() {
    this.active();
    const tableFlags = new Map(
      this.values("PRAGMA table_list")
        .filter((t) => t.schema === "main")
        .map((t) => [t.name, t]),
    );
    const objects = this.values(
      "SELECT name,type,tbl_name AS tableName,sql FROM sqlite_schema WHERE name NOT GLOB 'sqlite_*' ORDER BY type,name",
    );
    return {
      objects: objects.map((o) => {
        let columns = [],
          schemaError = "";
        try {
          if (["table", "view"].includes(o.type))
            columns = this.values(`PRAGMA table_xinfo(${ident(o.name)})`);
        } catch (e) {
          schemaError = e.message;
        }
        return {
          ...o,
          schemaError,
          strict: Number(tableFlags.get(o.name)?.strict || 0) > 0,
          withoutRowid: Number(tableFlags.get(o.name)?.wr || 0) > 0,
          columns,
          foreignKeys:
            o.type === "table"
              ? this.values(`PRAGMA foreign_key_list(${ident(o.name)})`)
              : [],
          indexes:
            o.type === "table"
              ? this.values(`PRAGMA index_list(${ident(o.name)})`)
              : [],
        };
      }),
      version: this.values("SELECT sqlite_version() AS v")[0].v,
      pageCount: this.values("PRAGMA page_count")[0].page_count,
      pageSize: this.values("PRAGMA page_size")[0].page_size,
    };
  }
  schema(table) {
    this.active();
    const obj = this.meta().objects.find((o) => o.name === table);
    if (!obj) throw new Error("Table does not exist.");
    return obj;
  }
  browse({
    table,
    page = 0,
    pageSize = 50,
    search = "",
    sort = "",
    direction = "ASC",
    filters = [],
    focusKey,
  }) {
    this.active();
    const obj = this.schema(table);
    const cols = obj.columns.filter((c) => Number(c.hidden) !== 1);
    let rowid = "";
    const primary = cols
      .filter((c) => Number(c.pk) > 0)
      .sort((a, b) => Number(a.pk) - Number(b.pk));
    const withoutRowid = obj.withoutRowid;
    const safePrimary =
      primary.length > 0 &&
      (withoutRowid ||
        primary.every((c) => Number(c.notnull) > 0) ||
        (primary.length === 1 &&
          primary[0].type.toUpperCase() === "INTEGER" &&
          !obj.indexes.some((i) => i.origin === "pk")));
    if (obj.type === "table" && !safePrimary && !withoutRowid) {
      rowid =
        ["rowid", "_rowid_", "oid"].find(
          (n) => !cols.some((c) => c.name.toLowerCase() === n),
        ) || "";
    }
    const where = [],
      params = [];
    if (search) {
      where.push(
        "(" +
          cols
            .map((c) => `CAST(${ident(c.name)} AS TEXT) LIKE ? ESCAPE '\\'`)
            .join(" OR ") +
          ")",
      );
      cols.forEach(() =>
        params.push("%" + search.replace(/[\\%_]/g, "\\$&") + "%"),
      );
    }
    for (const f of filters) {
      if (cols.some((c) => c.name === f.column)) {
        where.push(`${ident(f.column)} IS ?`);
        params.push(f.value);
      }
    }
    const clause = where.length ? " WHERE " + where.join(" AND ") : "";
    const count = this.values(
      `SELECT COUNT(*) AS n FROM ${ident(table)}${clause}`,
      params,
    )[0].n;
    const validSort = cols.some((c) => c.name === sort)
      ? sort
      : primary[0]?.name || cols[0]?.name;
    const size = Math.min(200, Math.max(10, Number(pageSize) || 50));
    const identity = this.identity(obj);
    const ordering = [
      ...(validSort
        ? [ident(validSort) + (direction === "DESC" ? " DESC" : " ASC")]
        : []),
      ...identity.fields
        .filter((f) => f !== validSort)
        .map((f) => ident(f) + " ASC"),
    ].join(", ");
    let focusPosition = null;
    if (focusKey && identity.fields.length) {
      const selection = this.selectionWhere(obj, [focusKey], "f");
      let positionName = "__squeaklite_position__";
      while (identity.fields.includes(positionName)) positionName += "_";
      const found = this.values(
        `SELECT f.${ident(positionName)} AS position FROM (SELECT ${identity.fields.map(ident).join(", ")}, ROW_NUMBER() OVER (ORDER BY ${ordering}) - 1 AS ${ident(positionName)} FROM ${ident(table)}${clause}) AS f WHERE ${selection.sql}`,
        [...params, ...selection.params],
      )[0];
      if (found) focusPosition = Number(found.position);
    }
    const current = Math.max(
      0,
      Math.min(
        focusPosition !== null
          ? Math.floor(focusPosition / size)
          : Number(page) || 0,
        Math.max(0, Math.ceil(Number(count) / size) - 1),
      ),
    );
    const stmt = this.db.prepare(
      `SELECT ${rowid ? ident(rowid) + ' AS "__quarry_identity__", ' : ""}* FROM ${ident(table)}${clause}${ordering ? " ORDER BY " + ordering : ""} LIMIT ? OFFSET ?`,
    );
    try {
      stmt.bind([
        ...params.map((v) => (typeof v === "bigint" ? String(v) : v)),
        size,
        current * size,
      ]);
      const columns = stmt.getColumnNames();
      const rows = [];
      while (stmt.step()) rows.push(stmt.get(null, { useBigInt: true }));
      return {
        columns: rowid ? columns.slice(1) : columns,
        rows: rows.map((r) => (rowid ? r.slice(1) : r).map(forDisplay)),
        keys: rows.map((r) =>
          rowid
            ? { [rowid]: r[0] }
            : Object.fromEntries(
                primary.map((c) => [c.name, r[columns.indexOf(c.name)]]),
              ),
        ),
        editable: obj.type === "table" && (safePrimary || !!rowid),
        count,
        page: current,
        pageSize: size,
        focusFound: focusPosition !== null,
        token: this.mutationToken(),
      };
    } finally {
      stmt.free();
    }
  }
  assertDatabase(path) {
    this.active();
    if (path && path !== this.path)
      throw new Error(
        "The active database changed. Reopen the intended database and review this action again.",
      );
  }
  mutationToken() {
    return `${this.generation}:${this.operationVersion}:${this.values("SELECT total_changes() AS n")[0].n}:${this.values("PRAGMA schema_version")[0].schema_version}`;
  }
  identity(obj) {
    const cols = obj.columns.filter((c) => Number(c.hidden) !== 1),
      primary = cols
        .filter((c) => Number(c.pk) > 0)
        .sort((a, b) => Number(a.pk) - Number(b.pk));
    const safe =
      primary.length > 0 &&
      (obj.withoutRowid ||
        primary.every((c) => Number(c.notnull) > 0) ||
        (primary.length === 1 &&
          primary[0].type.toUpperCase() === "INTEGER" &&
          !obj.indexes.some((i) => i.origin === "pk")));
    const rowid =
      obj.type === "table" && !safe && !obj.withoutRowid
        ? ["rowid", "_rowid_", "oid"].find(
            (n) => !cols.some((c) => c.name.toLowerCase() === n),
          ) || ""
        : "";
    return {
      fields: rowid ? [rowid] : safe ? primary.map((c) => c.name) : [],
      rowid,
    };
  }
  selectionWhere(obj, keys, alias = "") {
    const fields = this.identity(obj).fields;
    if (obj.type !== "table" || !fields.length)
      throw new Error("This table has no safe row identifier.");
    if (!Array.isArray(keys) || !keys.length || keys.length > 200)
      throw new Error("Select between 1 and 200 rows.");
    const params = [];
    const sql = keys
      .map((key) => {
        if (
          !key ||
          Object.keys(key).length !== fields.length ||
          !fields.every((f) => Object.hasOwn(key, f))
        )
          throw new Error(
            "The row selection is invalid. Refresh the table and select again.",
          );
        return (
          "(" +
          fields
            .map((f) => {
              params.push(typeof key[f] === "bigint" ? String(key[f]) : key[f]);
              return (alias ? ident(alias) + "." : "") + ident(f) + " IS ?";
            })
            .join(" AND ") +
          ")"
        );
      })
      .join(" OR ");
    return { sql: "(" + sql + ")", params };
  }
  deletionPlan({ table, keys, databasePath }) {
    this.assertDatabase(databasePath);
    const objects = this.meta().objects,
      obj = objects.find((o) => o.name === table);
    if (!obj) throw new Error("The selected table no longer exists.");
    const selection = this.selectionWhere(obj, keys, "p");
    const count = Number(
      this.values(
        `SELECT COUNT(*) AS n FROM ${ident(table)} AS p WHERE ${selection.sql}`,
        selection.params,
      )[0].n,
    );
    if (count !== keys.length)
      throw new Error(
        "Some selected rows changed or disappeared. Refresh the table and select again.",
      );
    const enabled =
        Number(this.values("PRAGMA foreign_keys")[0].foreign_keys) !== 0,
      related = [];
    const primary = obj.columns
      .filter((c) => Number(c.pk) > 0)
      .sort((a, b) => Number(a.pk) - Number(b.pk));
    for (const child of objects.filter((o) => o.type === "table")) {
      const groups = new Map();
      for (const f of child.foreignKeys.filter(
        (f) => f.table.toLowerCase() === table.toLowerCase(),
      )) {
        if (!groups.has(String(f.id))) groups.set(String(f.id), []);
        groups.get(String(f.id)).push(f);
      }
      for (const group of groups.values()) {
        group.sort((a, b) => Number(a.seq) - Number(b.seq));
        const join = group
          .map(
            (f, i) =>
              `p.${ident(f.to || primary[i]?.name)} = c.${ident(f.from)}`,
          )
          .join(" AND ");
        const reference = `EXISTS(SELECT 1 FROM ${ident(table)} AS p WHERE ${selection.sql} AND ${join})`;
        const n = Number(
          this.values(
            `SELECT COUNT(*) AS n FROM ${ident(child.name)} AS c WHERE ${reference}`,
            selection.params,
          )[0].n,
        );
        if (!n) continue;
        let external = n;
        if (child.name === table) {
          const own = this.selectionWhere(obj, keys, "c");
          external = Number(
            this.values(
              `SELECT COUNT(*) AS n FROM ${ident(child.name)} AS c WHERE ${reference} AND NOT ${own.sql}`,
              [...selection.params, ...own.params],
            )[0].n,
          );
        }
        const action = group[0].on_delete;
        related.push({
          table: child.name,
          columns: group.map((f) => f.from),
          count: n,
          action,
          blocked:
            enabled &&
            external > 0 &&
            ["NO ACTION", "RESTRICT"].includes(action),
        });
      }
    }
    return {
      table,
      databasePath: this.path,
      count,
      token: this.mutationToken(),
      related,
      blocked: related.some((r) => r.blocked),
      foreignKeysEnabled: enabled,
    };
  }
  deleteRows({ table, keys, databasePath, token, confirmed = false }) {
    this.assertDatabase(databasePath);
    if (!confirmed) throw new Error("Confirm deletion before deleting rows.");
    if (!token || token !== this.mutationToken())
      throw new Error(
        "The database changed after deletion was reviewed. Review the selection again.",
      );
    const plan = this.deletionPlan({ table, keys, databasePath });
    if (plan.blocked)
      throw new Error(
        "Deletion is blocked by foreign-key references. Delete related rows first.",
      );
    return this.editMany({ table, keys, databasePath, confirmed: true });
  }
  edit({ table, key, values, action, databasePath, token, confirmed = false }) {
    this.assertDatabase(databasePath);
    if (token && token !== this.mutationToken())
      throw new Error(
        "The database changed while this form was open. Close it and reopen the row before saving.",
      );
    const obj = this.schema(table);
    if (obj.type !== "table")
      throw new Error("Views are read-only in the row editor.");
    if (action === "delete" && !confirmed)
      throw new Error("Confirm deletion before deleting rows.");
    if (!["insert", "update", "delete"].includes(action))
      throw new Error("Unknown row operation.");
    const cols = obj.columns.filter((c) => Number(c.hidden) === 0),
      valid = Object.keys(values || {}).filter((n) =>
        cols.some((c) => c.name === n),
      ),
      val = valid.map((n) => values[n]),
      identity = this.identity(obj);
    const returning =
      identity.fields.length && action !== "delete"
        ? ` RETURNING ${identity.fields.map((f, i) => ident(f) + " AS " + ident("__key_" + i)).join(", ")}`
        : "";
    let sql, params;
    if (action === "insert") {
      sql = valid.length
        ? `INSERT INTO ${ident(table)} (${valid.map(ident).join(",")}) VALUES (${valid.map(() => "?").join(",")})`
        : `INSERT INTO ${ident(table)} DEFAULT VALUES`;
      params = val;
    } else {
      const where = this.selectionWhere(obj, [key]);
      if (action === "update" && !valid.length) {
        if (
          !this.values(
            `SELECT 1 FROM ${ident(table)} WHERE ${where.sql}`,
            where.params,
          ).length
        )
          throw new Error("This row no longer exists. Refresh the table.");
        return { changed: 0, key, meta: this.meta() };
      }
      sql =
        action === "delete"
          ? `DELETE FROM ${ident(table)} WHERE ${where.sql}`
          : `UPDATE ${ident(table)} SET ${valid.map((n) => ident(n) + "=?").join(",")} WHERE ${where.sql}`;
      params = action === "delete" ? where.params : [...val, ...where.params];
    }
    // A trigger using RAISE(FAIL) can otherwise leave partial changes behind.
    this.db.run("SAVEPOINT squeaklite_row_edit");
    let changed, savedKey;
    try {
      const rows = this.values(sql + returning, params);
      changed = this.db.getRowsModified();
      if (!changed)
        throw new Error(
          action === "insert"
            ? "No row was inserted. A trigger may have ignored the insert."
            : "This row no longer exists or a trigger ignored the change. Refresh the table.",
        );
      savedKey = rows[0]
        ? Object.fromEntries(
            identity.fields.map((f, i) => [f, rows[0]["__key_" + i]]),
          )
        : undefined;
      this.db.run("RELEASE squeaklite_row_edit");
    } catch (error) {
      try {
        this.db.run("ROLLBACK TO squeaklite_row_edit");
        this.db.run("RELEASE squeaklite_row_edit");
      } catch {
        /* RAISE(ROLLBACK) may already have ended the transaction. */
      }
      throw error;
    }
    if (changed) {
      this.dirty.add(this.path);
      this.operationVersion++;
    }
    return { changed, key: savedKey, meta: this.meta() };
  }
  editMany({ table, keys, databasePath, confirmed = false }) {
    this.assertDatabase(databasePath);
    if (!confirmed) throw new Error("Confirm deletion before deleting rows.");
    const obj = this.schema(table),
      where = this.selectionWhere(obj, keys);
    this.db.run("SAVEPOINT quarry_bulk_delete");
    try {
      this.db.run(
        `DELETE FROM ${ident(table)} WHERE ${where.sql}`,
        where.params,
      );
      const changed = this.db.getRowsModified();
      this.db.run("RELEASE quarry_bulk_delete");
      if (changed) {
        this.dirty.add(this.path);
        this.operationVersion++;
      }
      return { changed, meta: this.meta() };
    } catch (error) {
      this.db.run("ROLLBACK TO quarry_bulk_delete");
      this.db.run("RELEASE quarry_bulk_delete");
      throw error;
    }
  }
  async readFile({ path }) {
    this.active();
    const file = this.files.get(path);
    if (!file) throw new Error("Workspace file not found.");
    const size = file.size ?? file.length,
      bytes =
        file instanceof Uint8Array
          ? file.subarray(0, TEXT_LIMIT)
          : new Uint8Array(await file.slice(0, TEXT_LIMIT).arrayBuffer());
    if (isSQLite(bytes))
      return { path, size, kind: "database", token: this.mutationToken() };
    if (path.endsWith("/"))
      return { path, size, kind: "directory", token: this.mutationToken() };
    const text = decodeText(bytes, size);
    return {
      path,
      size,
      kind: text ? "text" : "binary",
      ...text,
      token: this.mutationToken(),
    };
  }
  async saveText({ path, text, token }) {
    if (token !== this.mutationToken())
      throw new Error(
        "The workspace changed. Reload this file before saving. Your draft is still available.",
      );
    const file = await this.readFile({ path });
    if (file.kind !== "text" || file.truncated)
      throw new Error("Only complete text files up to 256 KiB can be edited.");
    if (typeof text !== "string" || text.length > TEXT_LIMIT)
      throw new Error("Edited text exceeds the 256 KiB budget.");
    const bytes = encodeText(text, file.encoding, file.bom);
    if (bytes.length > TEXT_LIMIT)
      throw new Error("Encoded text exceeds the 256 KiB budget.");
    this.files.set(path, bytes);
    this.dirty.add(path);
    this.operationVersion++;
    return this.readFile({ path });
  }
  async fileReview({ action, path = "", newPath = "", text = "" }) {
    this.active();
    if (!["create", "rename", "drop"].includes(action))
      throw new Error("Unknown file operation.");
    if (action !== "create") {
      const info = await this.readFile({ path });
      if (info.kind === "database")
        throw new Error("Use the database manager for SQLite files.");
      if (info.kind === "directory")
        throw new Error(
          "Directory entries are preserved by ZIP export. Manage their files individually.",
        );
    }
    if (action !== "drop") {
      workspaceFilePath(newPath);
      if (this.files.has(newPath))
        throw new Error("A workspace file already uses that path.");
    }
    if (
      action === "create" &&
      (typeof text !== "string" ||
        new TextEncoder().encode(text).length > TEXT_LIMIT)
    )
      throw new Error("New text files must be at most 256 KiB.");
    const reviewId = String((this.fileReviewSequence || 0) + 1);
    this.fileReviewSequence = Number(reviewId);
    const plan = {
      action,
      path,
      newPath,
      text,
      reviewId,
      token: this.mutationToken(),
    };
    this.pendingFile = plan;
    return { ...plan, text: undefined };
  }
  async fileApply({ reviewId, token, confirmed = false }) {
    if (!confirmed) throw new Error("Confirm the file change first.");
    const plan = this.pendingFile;
    if (
      !plan ||
      plan.reviewId !== reviewId ||
      plan.token !== token ||
      token !== this.mutationToken()
    )
      throw new Error(
        "The workspace changed. Review the file operation again.",
      );
    if (plan.action === "create") {
      this.files.set(plan.newPath, new TextEncoder().encode(plan.text));
      this.dirty.add(plan.newPath);
    } else if (plan.action === "rename") {
      this.files.set(plan.newPath, this.files.get(plan.path));
      this.files.delete(plan.path);
      this.dirty.delete(plan.path);
      this.dirty.add(plan.newPath);
    } else {
      this.files.delete(plan.path);
      this.dirty.delete(plan.path);
      this.dirty.add(this.path);
    }
    this.operationVersion++;
    this.pendingFile = null;
    return {
      path: plan.action === "drop" ? "" : plan.newPath,
      workspace: await this.workspace(),
    };
  }
  async databaseReview({ action, path = "", newPath = "" }) {
    this.active();
    const w = await this.workspace();
    if (!["create", "rename", "drop"].includes(action))
      throw new Error("Unknown database operation.");
    if (action !== "create" && !w.databases.some((d) => d.path === path))
      throw new Error("Database file not found.");
    if (action !== "drop") {
      if (
        !newPath ||
        newPath.includes("\0") ||
        newPath.length > 255 ||
        !safePath(newPath) ||
        newPath.endsWith("/") ||
        !/[.](db|sqlite|sqlite3|db3)$/i.test(newPath)
      )
        throw new Error(
          "Enter a relative database path ending in .db, .sqlite or .sqlite3.",
        );
      if (this.files.has(newPath) && newPath !== path)
        throw new Error("A workspace file already uses that path.");
    }
    if (action === "rename" && path === newPath)
      throw new Error("Enter a different database path.");
    if (action === "drop" && w.databases.length === 1)
      throw new Error(
        "Create or import another database before removing the last one.",
      );
    const reviewId = String((this.databaseReviewSequence || 0) + 1);
    this.databaseReviewSequence = Number(reviewId);
    const plan = {
      action,
      path,
      newPath,
      reviewId,
      token: this.mutationToken(),
    };
    this.pendingDatabase = plan;
    return plan;
  }
  async databaseApply({ reviewId, token, confirmed = false }) {
    if (!confirmed) throw new Error("Confirm the workspace change first.");
    const plan = this.pendingDatabase;
    if (
      !plan ||
      plan.reviewId !== reviewId ||
      plan.token !== token ||
      token !== this.mutationToken()
    )
      throw new Error(
        "The workspace changed after review. Review the change again.",
      );
    const { action, path, newPath } = plan;
    this.flush();
    if (action === "create") {
      const db = new this.SQL.Database();
      db.run("PRAGMA user_version=0");
      this.files.set(newPath, db.export());
      db.close();
      this.dirty.add(newPath);
      await this.open(newPath);
    } else if (action === "rename") {
      const file = this.files.get(path);
      this.files.set(newPath, file);
      this.files.delete(path);
      this.dirty.delete(path);
      this.dirty.add(newPath);
      if (this.path === path) this.path = newPath;
    } else {
      if (this.path === path) {
        const target = (await this.workspace()).databases.find(
          (d) => d.path !== path,
        ).path;
        await this.open(target);
      }
      this.files.delete(path);
      this.dirty.delete(path);
      this.dirty.add(this.path);
    }
    this.generation++;
    this.operationVersion++;
    this.pendingDatabase = null;
    return this.workspace();
  }
  schemaReview(request) {
    this.assertDatabase(request.databasePath);
    const objects = this.meta().objects,
      statements = schemaStatements(request, objects),
      old = objects.find(
        (o) =>
          o.name === (request.oldName || request.name) &&
          o.type === request.kind,
      );
    const related = old
      ? schemaReferences(objects, old).map((o) => ({
          name: o.name,
          type: o.type,
          owned:
            ["table", "view"].includes(old.type) &&
            o.tableName === old.name &&
            ["index", "trigger"].includes(o.type),
        }))
      : [];
    const removing =
      request.action === "drop" ||
      (request.action === "replace" &&
        request.name !== (request.oldName || request.name));
    const blockers =
      removing && ["table", "view"].includes(request.kind)
        ? related.filter((o) => !o.owned)
        : [];
    if (request.kind === "table" && request.action === "drop")
      for (const o of objects.filter(
        (o) =>
          o.type === "table" &&
          o.name !== old.name &&
          o.foreignKeys.some(
            (f) => f.table.toLowerCase() === old.name.toLowerCase(),
          ),
      ))
        if (!blockers.some((x) => x.name === o.name))
          blockers.push({ name: o.name, type: "foreign-key table" });
    const rows =
      request.kind === "table" && request.action === "drop"
        ? this.values(`SELECT COUNT(*) AS n FROM ${ident(old.name)}`)[0].n
        : null;
    const validViews = objects
      .filter((o) => o.type === "view" && !o.schemaError)
      .map((o) => o.name);
    const token = this.mutationToken(),
      reviewId = String((this.schemaReviewSequence || 0) + 1);
    this.schemaReviewSequence = Number(reviewId);
    const plan = {
      reviewId,
      token,
      validViews,
      databasePath: this.path,
      statements,
      kind: request.kind,
      name: request.name,
      action: request.action,
      related,
      blockers,
      blocked: !!blockers.length,
      rows,
      destructive:
        request.action === "drop" || request.operation === "dropColumn",
    };
    this.pendingSchema = plan;
    return {
      ...plan,
      sql: statements.join(";\n\n") + ";",
      preservedTriggers:
        request.kind === "view" && request.action === "replace"
          ? related.filter((o) => o.owned && o.type === "trigger").length
          : 0,
    };
  }
  schemaApply({ reviewId, token, databasePath, confirmed = false }) {
    this.assertDatabase(databasePath);
    const plan = this.pendingSchema;
    if (!confirmed)
      throw new Error("Confirm the schema change before applying it.");
    if (
      !plan ||
      plan.reviewId !== reviewId ||
      plan.token !== token ||
      token !== this.mutationToken() ||
      plan.databasePath !== this.path
    )
      throw new Error(
        "The database changed after schema review. Review the change again.",
      );
    if (plan.blocked)
      throw new Error(
        "Other schema objects depend on this object. Update or remove the listed dependencies first.",
      );
    this.db.run("SAVEPOINT quarry_schema_change");
    try {
      for (const sql of plan.statements) {
        let count = 0;
        for (const statement of this.db.iterateStatements(sql)) {
          if (++count > 1)
            throw new Error(
              "Enter exactly one CREATE statement, without additional SQL.",
            );
          statement.step();
        }
        if (count !== 1) throw new Error("A schema statement is required.");
      }
      // SQLite defers validation of view bodies until use. Check every view before commit.
      const views = this.values(
        "SELECT name FROM sqlite_schema WHERE type='view'",
      );
      for (const v of views) {
        if (
          !plan.validViews.includes(v.name) &&
          !(plan.kind === "view" && plan.name === v.name)
        )
          continue;
        const stmt = this.db.prepare(`SELECT * FROM ${ident(v.name)} LIMIT 0`);
        stmt.free();
      }
      const meta = this.meta();
      this.db.run("RELEASE quarry_schema_change");
      this.dirty.add(this.path);
      this.operationVersion++;
      this.pendingSchema = null;
      return { name: plan.name, kind: plan.kind, action: plan.action, meta };
    } catch (error) {
      this.db.run("ROLLBACK TO quarry_schema_change");
      this.db.run("RELEASE quarry_schema_change");
      throw error;
    }
  }
  queryReview({ sql, databasePath }) {
    this.assertDatabase(databasePath);
    if (typeof sql !== "string" || sql.length > 1024 * 1024)
      throw new Error("SQL scripts must be smaller than 1 MiB.");
    return {
      token: this.mutationToken(),
      databasePath: this.path,
      requiresConfirmation: sqlNeedsConfirmation(sql),
    };
  }
  query({ sql, limit = 1000, databasePath, token, confirmed = false }) {
    this.assertDatabase(databasePath);
    if (typeof sql !== "string" || sql.length > 1024 * 1024)
      throw new Error("SQL scripts must be smaller than 1 MiB.");
    if (token && token !== this.mutationToken())
      throw new Error(
        "The database changed after SQL review. Review the script again.",
      );
    const writes = sqlNeedsConfirmation(sql);
    if (writes && !confirmed)
      throw new Error("Confirm data-changing SQL before running it.");
    limit = Math.max(1, Math.min(1000, Number(limit) || 1000));
    const start = performance.now(),
      results = [];
    let statements = 0,
      cells = 0,
      bytes = 0;
    const changesBefore = this.values("SELECT total_changes() AS n")[0].n,
      before = this.values("PRAGMA schema_version")[0].schema_version;
    try {
      for (const statement of this.db.iterateStatements(sql)) {
        if (statements >= 20)
          throw new Error(
            "Run at most 20 statements at a time. Earlier statements may have completed.",
          );
        statements++;
        const columns = statement.getColumnNames();
        const rows = [];
        let truncated = false,
          textTruncated = false,
          warning = "";
        if (columns.length) {
          while (statement.step()) {
            if (rows.length >= limit) {
              truncated = true;
              warning = "Row limit reached. Narrow the query to retrieve more.";
              break;
            }
            if (cells + columns.length > 20000 || bytes >= 4 * 1024 * 1024) {
              truncated = true;
              warning =
                "The shared result-size budget was reached. Narrow the query or select fewer columns.";
              break;
            }
            const row = statement.get(null, { useBigInt: true }).map((v) => {
              if (typeof v === "string" && v.length > 4096) {
                textTruncated = true;
                return v.slice(0, 4096) + "…";
              }
              return forDisplay(v);
            });
            const size = row.reduce(
              (n, v) => n + (typeof v === "string" ? v.length * 2 : 32),
              0,
            );
            if (bytes + size > 4 * 1024 * 1024) {
              truncated = true;
              warning =
                "The shared result-size budget was reached. Narrow the query.";
              break;
            }
            rows.push(row);
            cells += columns.length;
            bytes += size;
          }
        } else statement.step();
        results.push({
          columns,
          rows,
          truncated,
          textTruncated,
          warning,
          changed: columns.length ? 0 : this.db.getRowsModified(),
        });
      }
      if (!statements) throw new Error("Enter a SQL statement to run.");
    } finally {
      if (writes) this.operationVersion++;
      if (
        this.values("SELECT total_changes() AS n")[0].n !== changesBefore ||
        this.values("PRAGMA schema_version")[0].schema_version !== before ||
        writes
      )
        this.dirty.add(this.path);
    }
    return {
      results,
      ms: Math.round((performance.now() - start) * 10) / 10,
      statements,
      changed:
        Number(this.values("SELECT total_changes() AS n")[0].n) -
        Number(changesBefore),
      schemaChanged:
        before !== this.values("PRAGMA schema_version")[0].schema_version,
      meta: this.meta(),
    };
  }
  async export({ databaseOnly = false } = {}) {
    this.active();
    this.flush();
    if (databaseOnly)
      return {
        bytes: this.files.get(this.path),
        name: this.path.split("/").pop(),
        mime: "application/vnd.sqlite3",
      };
    const files = {};
    for (const [path, f] of this.files)
      files[path] =
        f instanceof Uint8Array ? f : new Uint8Array(await f.arrayBuffer());
    return {
      bytes: zipSync(files, { level: 1 }),
      name: "squeaklite-workspace.zip",
      mime: "application/zip",
    };
  }
}
