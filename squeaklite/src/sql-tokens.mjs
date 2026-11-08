// Small lossless lexer shared by schema tools and completion. It is not a SQL parser.
export function sqlTokens(sql) {
  const out = [];
  let i = 0;
  while (i < sql.length) {
    const start = i,
      c = sql[i],
      n = sql[i + 1];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === "-" && n === "-") {
      i = sql.indexOf("\n", i + 2);
      if (i < 0) i = sql.length;
      out.push({
        kind: "comment",
        start,
        end: i,
        text: sql.slice(start, i),
        closed: i < sql.length,
      });
      continue;
    }
    if (c === "/" && n === "*") {
      const end = sql.indexOf("*/", i + 2);
      i = end < 0 ? sql.length : end + 2;
      out.push({
        kind: "comment",
        start,
        end: i,
        text: sql.slice(start, i),
        closed: end >= 0,
      });
      continue;
    }
    if (["'", '"', "`", "["].includes(c)) {
      const close = c === "[" ? "]" : c;
      let closed = false;
      i++;
      while (i < sql.length) {
        if (sql[i] === close) {
          if (sql[i + 1] === close) {
            i += 2;
            continue;
          }
          i++;
          closed = true;
          break;
        }
        i++;
      }
      const text = sql.slice(start, i);
      out.push({
        kind: c === "'" ? "string" : "identifier",
        start,
        end: i,
        text,
        value: text
          .slice(1, closed ? -1 : undefined)
          .split(close + close)
          .join(close),
        closed,
        quote: c,
      });
      continue;
    }
    if (/[\p{L}_$]/u.test(c)) {
      i++;
      while (i < sql.length && /[\p{L}\p{N}_$]/u.test(sql[i])) i++;
      const text = sql.slice(start, i);
      out.push({ kind: "word", start, end: i, text, value: text });
      continue;
    }
    if (/[0-9]/.test(c)) {
      i++;
      while (i < sql.length && /[0-9.eE]/.test(sql[i])) i++;
      out.push({ kind: "number", start, end: i, text: sql.slice(start, i) });
      continue;
    }
    out.push({ kind: "symbol", start, end: ++i, text: c });
  }
  return out;
}
export const significant = (sql) =>
  sqlTokens(sql).filter((t) => t.kind !== "comment");
