import { sqlTokens } from "./sql-tokens.mjs";
import { ident } from "./sql.ts";
const RESERVED = new Set(
  "SELECT FROM WHERE JOIN LEFT RIGHT FULL INNER OUTER CROSS ON USING GROUP ORDER BY HAVING LIMIT OFFSET AS AND OR NOT NULL IS IN LIKE BETWEEN CASE WHEN THEN ELSE END DISTINCT UNION ALL INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE VIEW INDEX TRIGGER DROP ALTER PRIMARY KEY DEFAULT CHECK REFERENCES UNIQUE ASC DESC WITH RETURNING EXPLAIN".split(
    " ",
  ),
);
const val = (t) => t?.value ?? t?.text ?? "";
const upper = (t) => (t?.kind === "word" ? t.text.toUpperCase() : "");
const identifier = (t) => t && ["word", "identifier"].includes(t.kind);
const quoted = (name) =>
  /^[\p{L}_][\p{L}\p{N}_$]*$/u.test(name) && !RESERVED.has(name.toUpperCase())
    ? name
    : ident(name);

// Deliberately bounded grammar: known SELECT clauses and expressions only.
// Unrecognized constructs (including CTEs/subqueries) abstain instead of guessing.
function selectState(tokens) {
  if (!tokens.length) return { kind: "start" };
  let start = 0;
  if (upper(tokens[0]) === "CREATE") {
    if (upper(tokens[1]) !== "VIEW") return null;
    start = tokens.findIndex((t, i) => i > 2 && upper(t) === "AS") + 1;
    if (!start) return null;
  }
  if (upper(tokens[start]) !== "SELECT") {
    const first = upper(tokens[0]),
      offset =
        first === "UPDATE"
          ? 1
          : first === "DELETE" && upper(tokens[1]) === "FROM"
            ? 2
            : first === "INSERT" && upper(tokens[1]) === "INTO"
              ? 2
              : 0;
    if (!offset) return null;
    const source = tokens.slice(offset);
    if (
      !source.length ||
      (source.length === 2 &&
        val(source[0]).toLowerCase() === "main" &&
        source[1].text === ".")
    )
      return { kind: "source" };
    return null;
  }
  let clause = "select",
    state = "operand",
    lead = true,
    depth = 0,
    afterAlias = false,
    sourceQualifier = false,
    sourceQualified = false,
    wildcard = false;
  const clauseStart = (w) => {
    wildcard = false;
    if (w === "FROM") {
      clause = "from";
      state = "source";
      sourceQualified = false;
      return true;
    }
    if (w === "WHERE" || w === "HAVING" || w === "ON") {
      clause = w.toLowerCase();
      state = "operand";
      return true;
    }
    if (w === "GROUP" || w === "ORDER") {
      clause = w.toLowerCase();
      state = "by";
      return true;
    }
    if (w === "LIMIT") {
      clause = "limit";
      state = "number";
      return true;
    }
    return false;
  };
  for (let i = start + 1; i < tokens.length; i++) {
    const t = tokens[i],
      w = upper(t),
      s = t.text;
    if (
      [
        "SELECT",
        "WITH",
        "UNION",
        "CASE",
        "OVER",
        "FILTER",
        "WINDOW",
        "RETURNING",
      ].includes(w)
    )
      return null;
    if (state === "by") {
      if (w !== "BY") return null;
      state = "operand";
      continue;
    }
    if (state === "join") {
      if (w === "OUTER") continue;
      if (w !== "JOIN") return null;
      clause = "join";
      state = "source";
      sourceQualified = false;
      continue;
    }
    if (state === "source") {
      if (!identifier(t) || (w && RESERVED.has(w))) return null;
      state = "sourceAfter";
      sourceQualifier = !sourceQualified && val(t).toLowerCase() === "main";
      continue;
    }
    if (state === "sourceAfter") {
      if (s === "." && sourceQualifier) {
        state = "source";
        sourceQualifier = false;
        sourceQualified = true;
        wildcard = false;
        continue;
      }
      if (w === "AS") {
        state = "sourceAlias";
        continue;
      }
      if (identifier(t) && !RESERVED.has(w)) {
        state = "sourceAliasAfter";
        continue;
      }
    }
    if (state === "sourceAlias") {
      if (!identifier(t) || RESERVED.has(w)) return null;
      state = "sourceAliasAfter";
      continue;
    }
    if (["sourceAfter", "sourceAliasAfter"].includes(state)) {
      if (s === ",") {
        state = "source";
        clause = "from";
        sourceQualified = false;
        continue;
      }
      if (["LEFT", "RIGHT", "FULL", "INNER", "CROSS"].includes(w)) {
        state = "join";
        continue;
      }
      if (w === "JOIN") {
        clause = "join";
        state = "source";
        sourceQualified = false;
        continue;
      }
      if (
        ["WHERE", "GROUP", "ORDER", "LIMIT"].includes(w) ||
        (w === "ON" && clause === "join")
      ) {
        clauseStart(w);
        continue;
      }
      return null;
    }
    if (state === "number") {
      if (t.kind === "number") {
        state = "limitAfter";
        continue;
      }
      return null;
    }
    if (state === "limitAfter") {
      if (w === "OFFSET" && clause === "limit") {
        clause = "offset";
        state = "number";
        continue;
      }
      return null;
    }
    if (state === "alias") {
      if (!identifier(t) || RESERVED.has(w)) return null;
      state = "after";
      afterAlias = true;
      continue;
    }
    if (state === "operand") {
      if (lead && ["DISTINCT", "ALL"].includes(w)) {
        lead = false;
        continue;
      }
      lead = false;
      if (w === "NOT" || s === "+" || s === "-" || s === "~") continue;
      if (s === "(") {
        depth++;
        continue;
      }
      if (
        t.kind === "number" ||
        t.kind === "string" ||
        ["NULL", "TRUE", "FALSE"].includes(w) ||
        (s === "*" && ["select", "function"].includes(clause))
      ) {
        state = "after";
        afterAlias = false;
        wildcard = s === "*" && depth === 0;
        continue;
      }
      if (identifier(t) && !RESERVED.has(w)) {
        if (tokens[i + 1]?.text === "(") {
          depth++;
          i++;
          continue;
        }
        state = "after";
        afterAlias = false;
        wildcard = false;
        continue;
      }
      return null;
    }
    if (state === "qualified") {
      if (!identifier(t) && s !== "*") return null;
      wildcard = s === "*" && depth === 0;
      state = "after";
      continue;
    }
    if (state === "after") {
      if (s === ")") {
        if (!depth) return null;
        depth--;
        continue;
      }
      if (s === ".") {
        state = "qualified";
        continue;
      }
      if (s === ",") {
        if (depth || ["select", "group", "order"].includes(clause)) {
          state = "operand";
          afterAlias = false;
          continue;
        }
        return null;
      }
      if (["+", "-", "*", "/", "%", "&", "|", "=", "!", "<", ">"].includes(s)) {
        if (afterAlias || wildcard) return null;
        const next = tokens[i + 1],
          pair = s + (next?.text || ""),
          combined =
            [">=", "<=", "<>", "!=", "==", "||", "<<", ">>"].includes(pair) &&
            t.end === next?.start;
        if (s === "!" && !combined) return null;
        if (combined) i++;
        state = "operand";
        continue;
      }
      if (["AND", "OR", "IS", "LIKE", "IN"].includes(w)) {
        if (
          !["where", "on", "having", "select"].includes(clause) ||
          afterAlias ||
          wildcard
        )
          return null;
        state = "operand";
        continue;
      }
      if (
        w === "AS" &&
        clause === "select" &&
        !depth &&
        !afterAlias &&
        !wildcard
      ) {
        state = "alias";
        continue;
      }
      if (["ASC", "DESC"].includes(w) && clause === "order" && !depth) {
        state = "ordered";
        continue;
      }
      if (depth) return null;
      const allowed =
        clause === "select"
          ? ["FROM", "WHERE", "GROUP", "ORDER", "LIMIT"]
          : clause === "where" || clause === "on"
            ? ["GROUP", "ORDER", "LIMIT", ...(clause === "on" ? ["WHERE"] : [])]
            : clause === "group"
              ? ["HAVING", "ORDER", "LIMIT"]
              : clause === "having"
                ? ["ORDER", "LIMIT"]
                : clause === "order"
                  ? ["LIMIT"]
                  : [];
      if (allowed.includes(w)) {
        clauseStart(w);
        continue;
      }
      if (
        clause === "on" &&
        ["JOIN", "LEFT", "INNER", "CROSS", "RIGHT", "FULL"].includes(w)
      ) {
        state = w === "JOIN" ? "source" : "join";
        clause = "join";
        sourceQualified = false;
        continue;
      }
      // Bare SELECT aliases are valid, but metadata must not be offered as new names.
      if (
        clause === "select" &&
        identifier(t) &&
        !RESERVED.has(w) &&
        !afterAlias &&
        !wildcard
      ) {
        afterAlias = true;
        continue;
      }
      return null;
    }
    if (state === "ordered") {
      if (s === ",") {
        state = "operand";
        continue;
      }
      if (w === "LIMIT") {
        clauseStart(w);
        continue;
      }
      return null;
    }
  }
  return { kind: state, clause, depth, lead, afterAlias, wildcard };
}

export function completions(
  sql,
  cursor,
  objects = [],
  defaultTable = "",
  { manual = false } = {},
) {
  if (sql.length > 200000 || cursor < 0 || cursor > sql.length) return [];
  const all = sqlTokens(sql),
    at = all.find((t) => t.start < cursor && t.end >= cursor);
  if (
    at &&
    (at.kind === "comment" || at.kind === "string") &&
    (cursor < at.end || !at.closed || at.kind === "comment")
  )
    return [];
  if (at && at.end > cursor) return [];
  if (
    all.some(
      (t) =>
        t.start === cursor &&
        ["word", "identifier", "number", "string"].includes(t.kind),
    )
  )
    return [];
  const current =
    at && at.end === cursor && ["word", "identifier"].includes(at.kind)
      ? at
      : null;
  if (current?.kind === "identifier" && current.closed) return [];
  const prefix = current ? val(current) : "",
    from = current?.start ?? cursor,
    to = cursor;
  const before = all.filter((t) => t.kind !== "comment" && t.end <= from),
    last = before.at(-1),
    prev = before.at(-2);
  if ([":", "@", "$"].includes(last?.text)) return [];
  const boundary = before.findLastIndex((t) => t.text === ";"),
    tokens = before.slice(boundary + 1),
    state = selectState(tokens);
  if (!state) return [];
  const statementStart = before[boundary]?.end ?? 0,
    statementEnd =
      all.find((t) => t.text === ";" && t.start >= cursor)?.start ?? sql.length;
  const full = all.filter(
      (t) =>
        t.kind !== "comment" &&
        t.start >= statementStart &&
        t.start < statementEnd,
    ),
    relations = objects.filter((o) => ["table", "view"].includes(o.type)),
    sources = [],
    aliases = new Map();
  let nested = 0,
    inFrom = false,
    unknownSource = false;
  for (let i = 0; i < full.length; i++) {
    const t = full[i],
      w = upper(t);
    if (t.text === "(") {
      nested++;
      continue;
    }
    if (t.text === ")") {
      nested--;
      continue;
    }
    if (nested) continue;
    if (["WHERE", "ON", "GROUP", "ORDER", "LIMIT", "HAVING"].includes(w))
      inFrom = false;
    if (w === "FROM" || w === "JOIN" || (t.text === "," && inFrom)) {
      inFrom = true;
      let name = val(full[i + 1]),
        j = i + 2;
      if (full[j]?.text === ".") {
        if (name.toLowerCase() !== "main") {
          unknownSource = true;
          continue;
        }
        name = val(full[j + 1]);
        j += 2;
      }
      const obj = relations.find(
        (o) => o.name.toLowerCase() === name.toLowerCase(),
      );
      if (!obj) {
        unknownSource = true;
        continue;
      }
      let alias = obj.name;
      if (upper(full[j]) === "AS") j++;
      if (identifier(full[j]) && !RESERVED.has(upper(full[j])))
        alias = val(full[j]);
      sources.push({ obj, alias });
      aliases.set(alias.toLowerCase(), obj);
      if (alias === obj.name) aliases.set(obj.name.toLowerCase(), obj);
    }
  }
  if (!sources.length && !unknownSource && defaultTable) {
    const obj = relations.find((o) => o.name === defaultTable);
    if (obj) {
      sources.push({ obj, alias: obj.name });
      aliases.set(obj.name.toLowerCase(), obj);
    }
  }
  const candidates = [];
  const add = (label, kind, detail = "", insertName = label) => {
    if (
      kind === "keyword" &&
      !(manual || (current?.kind === "word" && /^[\p{L}]/u.test(prefix)))
    )
      return;
    if (
      prefix &&
      !label.toLowerCase().startsWith(prefix.toLowerCase()) &&
      !insertName.toLowerCase().startsWith(prefix.toLowerCase())
    )
      return;
    let insert =
      kind === "keyword"
        ? insertName
        : current?.quote
          ? insertName.includes(".")
            ? insertName
            : ident(label)
          : insertName;
    if (insert === sql.slice(from, to)) return;
    const matching = insert
      .toLowerCase()
      .startsWith(sql.slice(from, to).toLowerCase());
    candidates.push({
      label,
      kind,
      detail,
      from,
      to,
      insert,
      suffix: matching ? insert.slice(to - from) : insert,
      replaces: !matching,
    });
  };
  const dotted = last?.text === ".";
  if (state.kind === "source") {
    if (dotted && val(prev).toLowerCase() !== "main") return [];
    for (const o of relations.slice(0, 2000))
      add(o.name, o.type, "", quoted(o.name));
  } else if (state.kind === "qualified") {
    if (unknownSource) return [];
    const obj = aliases.get(val(prev).toLowerCase());
    if (!obj) return [];
    for (const c of obj.columns.slice(0, 2000))
      if (Number(c.hidden) !== 1)
        add(c.name, "column", obj.name, quoted(c.name));
  } else {
    if (
      state.kind === "operand" &&
      !unknownSource &&
      ["select", "where", "on", "having", "group", "order"].includes(
        state.clause,
      )
    ) {
      const count = new Map();
      for (const { obj } of sources)
        for (const c of obj.columns)
          count.set(
            c.name.toLowerCase(),
            (count.get(c.name.toLowerCase()) || 0) + 1,
          );
      for (const { obj, alias } of sources.slice(0, 100))
        for (const c of obj.columns.slice(0, 300))
          if (Number(c.hidden) !== 1) {
            const name =
              count.get(c.name.toLowerCase()) > 1
                ? quoted(alias) + "." + quoted(c.name)
                : quoted(c.name);
            add(c.name, "column", alias, name);
          }
    }
    let keywords = [];
    if (state.kind === "start")
      keywords = [
        "SELECT",
        "WITH",
        "CREATE VIEW",
        "CREATE TABLE",
        "EXPLAIN",
        "UPDATE",
        "INSERT INTO",
        "DELETE FROM",
      ];
    else if (state.kind === "by") keywords = ["BY"];
    else if (state.kind === "join") keywords = ["JOIN"];
    else if (state.kind === "operand" && state.lead)
      keywords = ["DISTINCT", "ALL"];
    else if (state.kind === "sourceAfter" || state.kind === "sourceAliasAfter")
      keywords = [
        ...(state.kind === "sourceAfter" ? ["AS"] : []),
        "JOIN",
        "LEFT JOIN",
        "INNER JOIN",
        "CROSS JOIN",
        ...(state.clause === "join" ? ["ON"] : []),
        "WHERE",
        "GROUP BY",
        "ORDER BY",
        "LIMIT",
      ];
    else if (state.kind === "limitAfter" && state.clause === "limit")
      keywords = ["OFFSET"];
    else if (
      (state.kind === "after" || state.kind === "ordered") &&
      !state.depth
    ) {
      if (state.clause === "select")
        keywords = [
          ...(state.afterAlias || state.wildcard ? [] : ["AS"]),
          "FROM",
        ];
      if (
        state.clause === "where" ||
        state.clause === "having" ||
        state.clause === "on"
      )
        keywords = [
          "AND",
          "OR",
          "IS NULL",
          "IS NOT NULL",
          "IN",
          "LIKE",
          ...(state.clause === "on" ? ["JOIN", "LEFT JOIN", "WHERE"] : []),
          ...(state.clause === "having" ? [] : ["GROUP BY"]),
          "ORDER BY",
          "LIMIT",
        ];
      if (state.clause === "group") keywords = ["HAVING", "ORDER BY", "LIMIT"];
      if (state.clause === "order")
        keywords = [
          ...(state.kind === "after" ? ["ASC", "DESC"] : []),
          "LIMIT",
        ];
    }
    const rank = {
      FROM: 1,
      JOIN: 2,
      ON: 2,
      WHERE: 3,
      GROUP: 4,
      HAVING: 5,
      ORDER: 6,
      LIMIT: 7,
      OFFSET: 8,
    };
    let d = 0,
      nextClause = "";
    for (const t of all.filter((t) => t.start >= cursor)) {
      if (t.text === "(") d++;
      else if (t.text === ")") d--;
      else if (!d && rank[upper(t)]) {
        nextClause = upper(t);
        break;
      }
      if (t.text === ";") break;
    }
    for (const k of keywords) {
      const first = k.split(" ")[0],
        clause = ["LEFT", "INNER", "CROSS"].includes(first) ? "JOIN" : first;
      if (nextClause && rank[clause] >= rank[nextClause]) continue;
      add(k, "keyword");
    }
  }
  const seen = new Set();
  return candidates
    .filter((c) => {
      const key = c.insert.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}
