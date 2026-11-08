import { display } from "./sql.ts";
export const GRAPH_LIMITS = Object.freeze({
  nodes: 500,
  edges: 1000,
  inputRows: 1000,
  fields: 8,
  visibleNodes: 64,
  visibleEdges: 240,
});
const short = (value, n = 100) => {
  const text = display(value);
  return text.length > n ? text.slice(0, n) + "…" : text;
};
function position(nodes) {
  let y = 24;
  for (let start = 0; start < nodes.length; start += 3) {
    let height = 0;
    for (let i = start; i < Math.min(start + 3, nodes.length); i++) {
      const node = nodes[i];
      node.x = 24 + (i % 3) * 320;
      node.y = y;
      node.width = 260;
      node.height = 66 + node.fields.length * 27 + (node.extraFields ? 24 : 0);
      height = Math.max(height, node.height);
    }
    y += height + 65;
  }
  return {
    width: Math.min(3, Math.max(1, nodes.length)) * 320 - 60 + 48,
    height: Math.max(260, y - 41),
  };
}
const edgeBounds = (edge, byId) => {
  const a = byId.get(edge.from),
    b = byId.get(edge.to);
  return {
    ...edge,
    x1: a.x + a.width,
    y1: a.y + Math.min(a.height - 15, 69 + (edge.fromField || 0) * 27),
    x2: b.x,
    y2: b.y + Math.min(b.height - 15, 69 + (edge.toField || 0) * 27),
  };
};
function finish(nodes, edges, stats) {
  const bounds = position(nodes),
    byId = new Map(nodes.map((n) => [n.id, n]));
  return {
    nodes,
    edges: edges
      .filter((e) => byId.has(e.from) && byId.has(e.to))
      .map((e) => edgeBounds(e, byId)),
    bounds,
    stats,
  };
}
export function schemaScene(objects = []) {
  const tables = objects.filter((o) => o.type === "table"),
    chosen = tables.slice(0, GRAPH_LIMITS.nodes);
  const nodes = chosen.map((t, index) => ({
    id: "schema-node-" + index,
    title: short(t.name),
    table: t.name,
    fields: t.columns
      .slice(0, 12)
      .map((c) => ({
        name: short(c.name, 60),
        type: short(c.type.toLowerCase(), 30),
        kind:
          Number(c.pk) > 0
            ? "key"
            : t.foreignKeys.some((f) => f.from === c.name)
              ? "link"
              : "",
      })),
    extraFields: Math.max(0, t.columns.length - 12),
  }));
  const edges = [];
  for (const t of chosen)
    for (const f of t.foreignKeys) {
      if (edges.length >= GRAPH_LIMITS.edges) break;
      const target = chosen.find(
        (o) => o.name.toLowerCase() === f.table.toLowerCase(),
      );
      if (!target) continue;
      const col =
        f.to ||
        target.columns
          .filter((c) => Number(c.pk) > 0)
          .sort((a, b) => Number(a.pk) - Number(b.pk))[Number(f.seq)]?.name;
      edges.push({
        id: `schema-${edges.length}`,
        from: nodes[chosen.indexOf(t)].id,
        to: nodes[chosen.indexOf(target)].id,
        label: `${short(t.name, 50)}.${short(f.from, 50)} → ${short(target.name, 50)}.${short(col || "primary key", 50)}`,
        fromField: t.columns.findIndex((c) => c.name === f.from),
        toField: target.columns.findIndex((c) => c.name === col),
      });
    }
  return finish(nodes, edges, {
    totalRows: tables.length,
    shownRows: nodes.length,
    skippedRows: Math.max(0, tables.length - nodes.length),
    kind: "schema",
  });
}
function valueKey(v) {
  if (
    v == null ||
    v?.__quarryBlob ||
    v instanceof Uint8Array ||
    (typeof v === "string" && v.length > 1024) ||
    !["string", "number", "bigint", "boolean"].includes(typeof v)
  )
    return null;
  if (typeof v === "number" && !Number.isFinite(v)) return null;
  return typeof v === "number" || typeof v === "bigint"
    ? "number:" + String(v)
    : typeof v + ":" + String(v);
}
export function resultScene(
  result,
  { mode = "rows", source = 0, target = 1, label = -1, nodeLimit = 250 } = {},
) {
  const budget = Math.max(
      1,
      Math.min(GRAPH_LIMITS.nodes, Math.floor(Number(nodeLimit) || 250)),
    ),
    columns = result?.columns || [],
    rows = result?.rows || [],
    count = Math.min(rows.length, GRAPH_LIMITS.inputRows);
  const nodes = [],
    edges = [];
  let shownRows = 0,
    skippedRows = Math.max(0, rows.length - count);
  const nodeMap = new Map(),
    edgeMap = new Map();
  if (
    mode === "links" &&
    (!Number.isInteger(source) ||
      !Number.isInteger(target) ||
      source < 0 ||
      target < 0 ||
      source >= columns.length ||
      target >= columns.length ||
      source === target)
  )
    return finish([], [], {
      totalRows: rows.length,
      shownRows: 0,
      skippedRows: rows.length,
      error: "Choose two different source and target columns.",
      kind: "results",
    });
  const titleIndex = columns.findIndex((c) => /^(name|title|label)$/i.test(c));
  for (let i = 0; i < count; i++) {
    const row = rows[i];
    if (!Array.isArray(row)) {
      skippedRows++;
      continue;
    }
    if (mode === "rows") {
      if (nodes.length >= budget) {
        skippedRows++;
        continue;
      }
      nodes.push({
        id: `row-${i}`,
        title: titleIndex >= 0 ? short(row[titleIndex], 70) : `Row ${i + 1}`,
        rowIndex: i,
        fields: columns
          .slice(0, GRAPH_LIMITS.fields)
          .map((name, j) => ({
            name: short(name, 60),
            value: short(row[j], 100),
          })),
        extraFields: Math.max(0, columns.length - GRAPH_LIMITS.fields),
      });
      shownRows++;
      continue;
    }
    const from = valueKey(row[source]),
      to = valueKey(row[target]);
    if (from == null || to == null) {
      skippedRows++;
      continue;
    }
    const newCount = new Set([from, to].filter((k) => !nodeMap.has(k))).size;
    if (
      nodes.length + newCount > budget ||
      edges.length >= GRAPH_LIMITS.edges
    ) {
      skippedRows++;
      continue;
    }
    for (const [key, index] of [
      [from, source],
      [to, target],
    ]) {
      if (!nodeMap.has(key)) {
        const node = {
          id: `node-${nodes.length}`,
          title: short(row[index], 80),
          endpoint: { column: columns[index], value: row[index] },
          fields: [
            { name: "Column", value: short(columns[index], 60) },
            { name: "Occurrences", value: "0" },
          ],
          occurrences: 0,
        };
        nodes.push(node);
        nodeMap.set(key, node);
      }
      const node = nodeMap.get(key);
      node.occurrences++;
      node.fields[1].value = String(node.occurrences);
    }
    const edgeLabel =
        label >= 0 && label < columns.length ? short(row[label], 80) : "",
      key = JSON.stringify([from, to, edgeLabel]);
    if (edgeMap.has(key)) {
      edgeMap.get(key).count++;
    } else {
      const edge = {
        id: `result-edge-${edges.length}`,
        from: nodeMap.get(from).id,
        to: nodeMap.get(to).id,
        label: edgeLabel,
        count: 1,
      };
      edges.push(edge);
      edgeMap.set(key, edge);
    }
    shownRows++;
  }
  return finish(nodes, edges, {
    totalRows: rows.length,
    shownRows,
    skippedRows,
    kind: "results",
    nodeBudget: budget,
    truncated: !!result?.truncated,
  });
}
const intersects = (a, b) =>
  a.x <= b.x + b.width &&
  a.x + a.width >= b.x &&
  a.y <= b.y + b.height &&
  a.y + a.height >= b.y;
export function visibleGraph(scene, view, viewport, focusId) {
  const pad = 90 / Math.max(0.001, view.scale),
    rect = {
      x: -view.x / view.scale - pad,
      y: -view.y / view.scale - pad,
      width: viewport.width / view.scale + pad * 2,
      height: viewport.height / view.scale + pad * 2,
    };
  const candidates = scene.nodes.filter((n) => intersects(n, rect));
  if (focusId) {
    const index = candidates.findIndex((n) => n.id === focusId);
    if (index > 0) candidates.unshift(...candidates.splice(index, 1));
  }
  const nodes = candidates.slice(0, GRAPH_LIMITS.visibleNodes),
    overview = candidates.slice(GRAPH_LIMITS.visibleNodes);
  const visibleEdges = scene.edges.filter((e) =>
    intersects(
      {
        x: Math.min(e.x1, e.x2) - 100,
        y: Math.min(e.y1, e.y2) - 10,
        width: Math.abs(e.x1 - e.x2) + 200,
        height: Math.abs(e.y1 - e.y2) + 20,
      },
      rect,
    ),
  );
  return {
    nodes,
    overview,
    edges: visibleEdges.slice(0, GRAPH_LIMITS.visibleEdges),
    visibleCount: candidates.length,
    omittedEdges: Math.max(0, visibleEdges.length - GRAPH_LIMITS.visibleEdges),
  };
}
