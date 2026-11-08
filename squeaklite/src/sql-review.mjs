// Conservative review gate: ignore quoted text/comments, then allow only read-shaped scripts.
export function sqlNeedsConfirmation(sql) {
  const tokens = [];
  let i = 0;
  while (i < sql.length) {
    const c = sql[i],
      next = sql[i + 1];
    if (c === "-" && next === "-") {
      i = sql.indexOf("\n", i + 2);
      if (i < 0) break;
      continue;
    }
    if (c === "/" && next === "*") {
      const end = sql.indexOf("*/", i + 2);
      i = end < 0 ? sql.length : end + 2;
      continue;
    }
    if (c === "'" || c === '"' || c === "`" || c === "[") {
      const end = c === "[" ? "]" : c;
      i++;
      while (i < sql.length) {
        if (sql[i] === end) {
          if (sql[i + 1] === end) {
            i += 2;
            continue;
          }
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const start = i++;
      while (i < sql.length && /[A-Za-z0-9_$]/.test(sql[i])) i++;
      tokens.push(sql.slice(start, i).toUpperCase());
      continue;
    }
    if (c === ";") tokens.push(";");
    i++;
  }
  if (
    tokens.some((t) =>
      [
        "DELETE",
        "DROP",
        "REPLACE",
        "UPDATE",
        "INSERT",
        "ALTER",
        "CREATE",
        "REINDEX",
        "VACUUM",
        "ATTACH",
        "DETACH",
        "ANALYZE",
        "PRAGMA",
        "BEGIN",
        "COMMIT",
        "ROLLBACK",
        "SAVEPOINT",
        "RELEASE",
      ].includes(t),
    )
  )
    return true;
  let first = true;
  for (const token of tokens) {
    if (token === ";") {
      first = true;
      continue;
    }
    if (first && !["SELECT", "WITH", "EXPLAIN", "VALUES"].includes(token))
      return true;
    first = false;
  }
  return false;
}
