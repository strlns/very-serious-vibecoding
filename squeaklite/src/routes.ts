import type { Filter } from "./sql.ts";
export function parseRoute(hash = "") {
  const [view = "data", query = ""] = hash.replace(/^#\//, "").split("?"),
    params = new URLSearchParams(query);
  let filters: Filter[] = [];
  try {
    const parsed = JSON.parse(params.get("where") || "[]");
    if (Array.isArray(parsed))
      filters = parsed.filter(
        (f) =>
          f &&
          typeof f.column === "string" &&
          (f.value == null ||
            ["string", "number", "boolean"].includes(typeof f.value)),
      );
  } catch {
    /* Ignore malformed external route parameters. */
  }
  return {
    view: [
      "data",
      "structure",
      "query",
      "relationships",
      "schema",
      "files",
    ].includes(view)
      ? view
      : "data",
    table: params.get("table") || "customers",
    db: params.get("db") || "",
    filters,
    filterKey: params.get("where") || "",
  };
}
export function routeHash(
  view: string,
  table: string,
  db: string,
  filters: Filter[] = [],
) {
  const params = new URLSearchParams();
  if (db) params.set("db", db);
  if (table) params.set("table", table);
  if (filters.length)
    params.set(
      "where",
      JSON.stringify(filters, (_, v) =>
        typeof v === "bigint" ? String(v) : v,
      ),
    );
  return `/${view}?${params}`;
}
