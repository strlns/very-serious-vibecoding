export interface Filter {
  column: string;
  operator: string;
  value?: unknown;
}
export interface Join {
  table: string;
  from: string;
  to: string;
  source?: string;
  type?: string;
  pairs?: { from: string; to: string }[];
}
export interface QueryOptions {
  table: string;
  columns?: string[];
  filters?: Filter[];
  conjunction?: string;
  order?: string;
  direction?: string;
  limit?: number | null;
  joins?: Join[];
  group?: string;
  aggregate?: string;
  aggregateColumn?: string;
}
export const ident = (value: unknown) =>
  '"' + String(value).replaceAll('"', '""') + '"';
export const literal = (value: unknown) =>
  value == null
    ? "NULL"
    : typeof value === "number" || typeof value === "bigint"
      ? String(value)
      : "'" + String(value).replaceAll("'", "''") + "'";
export const display = (v: unknown) =>
  v == null
    ? "NULL"
    : v instanceof Uint8Array || isBlobSummary(v)
      ? `[BLOB · ${v.length} bytes]`
      : String(v);
export function buildQuery({
  table,
  columns = [],
  filters = [],
  conjunction = "AND",
  order = "",
  direction = "ASC",
  limit = 100,
  joins = [],
  group = "",
  aggregate = "",
  aggregateColumn = "",
}: QueryOptions) {
  if (!table) return "";
  const ref = (c: string) => {
    const prefix = [table, ...joins.map((j) => j.table)]
      .sort((a, b) => b.length - a.length)
      .find((t) => c.startsWith(t + "."));
    return prefix
      ? `${ident(prefix)}.${ident(c.slice(prefix.length + 1))}`
      : `${ident(table)}.${ident(c)}`;
  };
  // In summary mode only grouped dimensions belong beside an aggregate.
  const fields = aggregate
    ? group
      ? [ref(group)]
      : []
    : columns.length
      ? columns.map(ref)
      : [`${ident(table)}.*`];
  if (aggregate)
    fields.push(
      `${["COUNT", "SUM", "AVG", "MIN", "MAX"].includes(aggregate) ? aggregate : "COUNT"}(${aggregateColumn ? ref(aggregateColumn) : "*"}) AS "aggregate_value"`,
    );
  let sql = `SELECT ${fields.join(", ")}\nFROM ${ident(table)}`;
  for (const j of joins)
    if (j.table && j.from && j.to)
      sql +=
        `\n${j.type === "INNER" ? "INNER" : "LEFT"} JOIN ${ident(j.table)} ON ` +
        (j.pairs || [{ from: j.from, to: j.to }])
          .map(
            (p) =>
              `${ident(j.source || table)}.${ident(p.from)} = ${ident(j.table)}.${ident(p.to)}`,
          )
          .join(" AND ");
  const valid = filters.filter((f) => f.column);
  if (valid.length)
    sql +=
      "\nWHERE " +
      valid
        .map((f) => {
          const op = [
            "=",
            "!=",
            ">",
            ">=",
            "<",
            "<=",
            "LIKE",
            "IS NULL",
            "IS NOT NULL",
            "CONTAINS",
          ].includes(f.operator)
            ? f.operator
            : "=";
          if (op.startsWith("IS ")) return `${ref(f.column)} ${op}`;
          const value = op === "CONTAINS" ? "%" + f.value + "%" : f.value;
          return `${ref(f.column)} ${op === "CONTAINS" ? "LIKE" : op} ${literal(value)}`;
        })
        .join(conjunction === "OR" ? "\n   OR " : "\n  AND ");
  if (group) sql += `\nGROUP BY ${ref(group)}`;
  if (order)
    sql += `\nORDER BY ${ref(order)} ${direction === "DESC" ? "DESC" : "ASC"}`;
  if (limit === null) return sql + ";";
  return sql + `\nLIMIT ${Math.max(1, Math.min(10000, Number(limit) || 100))};`;
}

function isBlobSummary(
  value: unknown,
): value is { __quarryBlob: true; length: number } {
  return (
    typeof value === "object" &&
    value !== null &&
    "__quarryBlob" in value &&
    Boolean(value.__quarryBlob) &&
    "length" in value &&
    typeof value.length === "number"
  );
}
