import { ident } from "./sql.ts";
import { significant } from "./sql-tokens.mjs";
export const SCHEMA_KINDS = ["table", "view", "index", "trigger"];
export function objectName(value) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > 255 ||
    value.includes("\0") ||
    /^sqlite_/i.test(value)
  )
    throw new Error(
      "Use an object name of 1–255 characters, outside the reserved sqlite_ namespace.",
    );
  return value;
}
export function viewSelect(sql = "") {
  const t = significant(sql),
    as = t.findIndex(
      (v, i) => v.kind === "word" && v.text.toUpperCase() === "AS" && i > 1,
    );
  return as < 0 ? "" : sql.slice(t[as].end).trim().replace(/;\s*$/, "");
}
export function viewColumnNames(sql = "") {
  const t = significant(sql);
  const begin = t.findIndex((v) => v.text === "("),
    as = t.findIndex((v) => v.kind === "word" && v.text.toUpperCase() === "AS");
  if (begin < 0 || begin > as) return [];
  const end = t.findIndex((v, i) => i > begin && v.text === ")");
  return t
    .slice(begin + 1, end)
    .filter((v) => ["word", "identifier"].includes(v.kind))
    .map((v) => v.value);
}
export function createHeader(sql, kind, name) {
  const t = significant(sql);
  let i = 0;
  const word = (w) =>
    t[i]?.kind === "word" && t[i].text.toUpperCase() === w && ++i;
  if (!word("CREATE")) throw new Error("Enter one CREATE statement.");
  if (kind === "index") word("UNIQUE");
  if (!word(kind.toUpperCase()))
    throw new Error(`Expected CREATE ${kind.toUpperCase()}.`);
  const token = t[i];
  if (
    !token ||
    !["word", "identifier"].includes(token.kind) ||
    token.value !== name ||
    t[i + 1]?.text === "."
  )
    throw new Error(
      `The CREATE statement must define ${ident(name)} in the main database.`,
    );
  return t;
}
export function columnDefinition(c) {
  objectName(c.name);
  const type = (c.type || "TEXT").toUpperCase();
  if (!["INTEGER", "TEXT", "REAL", "NUMERIC", "BLOB", "ANY"].includes(type))
    throw new Error("Choose a supported SQLite column type.");
  let sql = ident(c.name) + " " + type;
  if (c.primary) sql += " PRIMARY KEY";
  if (c.notNull) sql += " NOT NULL";
  if (c.defaultValue?.trim()) {
    const v = c.defaultValue.trim();
    if (
      !/^(NULL|TRUE|FALSE|CURRENT_TIME|CURRENT_DATE|CURRENT_TIMESTAMP|[+-]?\d+(\.\d+)?|'([^']|'')*')$/i.test(
        v,
      )
    )
      throw new Error(
        "Default must be a quoted string, number, NULL, boolean or CURRENT_TIMESTAMP/DATE/TIME. Use SQL for expressions.",
      );
    sql += " DEFAULT " + v;
  }
  return sql;
}
export function schemaStatements(request, objects) {
  const { action, kind, name, oldName = name } = request;
  objectName(name);
  if (!SCHEMA_KINDS.includes(kind))
    throw new Error("Unknown schema object type.");
  const old = objects.find((o) => o.name === oldName && o.type === kind);
  if (action !== "create" && !old)
    throw new Error("The schema object no longer exists.");
  if (action === "drop")
    return [`DROP ${kind.toUpperCase()} ${ident(oldName)}`];
  if (action === "alter") {
    if (kind !== "table") throw new Error("Only tables use ALTER TABLE.");
    const base = `ALTER TABLE ${ident(oldName)}`;
    if (request.operation === "rename")
      return [`${base} RENAME TO ${ident(name)}`];
    const col = old.columns.find((c) => c.name === request.column);
    if (request.operation !== "addColumn" && !col)
      throw new Error("Choose an existing column.");
    if (request.operation === "addColumn")
      return [`${base} ADD COLUMN ${columnDefinition(request.definition)}`];
    if (request.operation === "renameColumn")
      return [
        `${base} RENAME COLUMN ${ident(request.column)} TO ${ident(objectName(request.newColumn))}`,
      ];
    if (request.operation === "dropColumn")
      return [`${base} DROP COLUMN ${ident(request.column)}`];
    throw new Error("Unknown table change.");
  }
  if (
    !["create", "replace"].includes(action) ||
    (action === "replace" && kind === "table")
  )
    throw new Error("Use table alteration controls to preserve table data.");
  let sql = request.sql?.trim() || "";
  if (sql.length > 1024 * 1024 || request.select?.length > 1024 * 1024)
    throw new Error("Schema SQL must be smaller than 1 MiB.");
  if (kind === "view") {
    const select = request.select?.trim();
    if (
      !select ||
      !["SELECT", "WITH"].includes(significant(select)[0]?.text.toUpperCase())
    )
      throw new Error("A view needs a SELECT or WITH query.");
    const aliases = request.columnNames || [];
    if (!Array.isArray(aliases) || aliases.length > 2000)
      throw new Error("Use at most 2,000 view column aliases.");
    aliases.forEach(objectName);
    sql = `CREATE VIEW ${ident(name)}${aliases.length ? " (" + aliases.map(ident).join(", ") + ")" : ""} AS\n${select}`;
  }
  createHeader(sql, kind, name);
  const statements = [];
  if (action === "replace")
    statements.push(`DROP ${kind.toUpperCase()} ${ident(oldName)}`);
  statements.push(sql);
  if (action === "replace" && kind === "view")
    for (const trigger of objects.filter(
      (o) => o.type === "trigger" && o.tableName === oldName,
    )) {
      if (name !== oldName)
        throw new Error(
          "Rename views without attached triggers, or recreate their triggers explicitly with SQL.",
        );
      statements.push(trigger.sql);
    }
  return statements;
}
export function schemaReferences(objects, target) {
  return objects.filter(
    (o) =>
      !(o.name === target.name && o.type === target.type) &&
      o.sql &&
      significant(o.sql).some(
        (t) =>
          ["word", "identifier"].includes(t.kind) &&
          t.value?.toLowerCase() === target.name.toLowerCase(),
      ),
  );
}
export function schemaDependencies(objects, target) {
  const names = new Set(
    significant(target.sql || "")
      .filter((t) => ["word", "identifier"].includes(t.kind))
      .map((t) => t.value?.toLowerCase()),
  );
  return objects.filter(
    (o) =>
      !(o.type === target.type && o.name === target.name) &&
      (names.has(o.name.toLowerCase()) ||
        (["index", "trigger"].includes(target.type) &&
          o.name === target.tableName &&
          ["table", "view"].includes(o.type))),
  );
}
