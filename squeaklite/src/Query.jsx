import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Play,
  Plus,
  X,
  Code2,
  Workflow,
  Download,
  Copy,
  Check,
  Clock3,
  ArrowDown,
  Save,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { Button, DataGrid, Empty, csvDownload } from "./ui.jsx";
import { buildQuery, ident } from "./sql.ts";
import SqlEditor from "./SqlEditor.jsx";
import useShortcuts from "./useShortcuts.js";
import { commandEnter, shortcutLabels } from "./shortcuts.mjs";
import ResultGraph, { GraphErrorBoundary } from "./ResultGraph.jsx";
import { Table2, Network } from "lucide-react";
const shortcut = shortcutLabels();
export default function Query({
  table,
  objects,
  sql,
  setSql,
  run,
  busy,
  result,
  error,
  onSave,
  embedded = false,
  onDraft,
  editorLabel = "SQL query editor",
  viewDefinition,
  onEditView,
}) {
  const editorRef = useRef();
  const suggestion = table ? `SELECT *\nFROM ${ident(table)}\nLIMIT 100;` : "";
  const [mode, setMode] = useState("sql"),
    [tab, setTab] = useState(0),
    [resultView, setResultView] = useState("table");
  const [builder, setBuilder] = useState({
    table,
    columns: [],
    filters: [],
    conjunction: "AND",
    order: "",
    direction: "ASC",
    limit: embedded ? null : 100,
    joins: [],
    aggregate: "",
    aggregateColumn: "",
    group: "",
  });
  const tables = objects.filter((o) => o.type === "table" || o.type === "view"),
    fields = [
      ...(tables
        .find((t) => t.name === builder.table)
        ?.columns.filter((c) => Number(c.hidden) !== 1) || []),
      ...builder.joins.flatMap((j) =>
        (
          tables
            .find((t) => t.name === j.table)
            ?.columns.filter((c) => Number(c.hidden) !== 1) || []
        ).map((c) => ({ ...c, name: j.table + "." + c.name })),
      ),
    ];
  const generated = useMemo(
    () =>
      buildQuery(
        embedded ? { ...builder, limit: builder.limit || null } : builder,
      ),
    [builder, embedded],
  );
  const update = (patch) => setBuilder((b) => ({ ...b, ...patch }));
  useEffect(() => {
    if (!tables.some((t) => t.name === builder.table))
      update({
        table,
        columns: [],
        filters: [],
        joins: [],
        group: "",
        order: "",
        aggregateColumn: "",
      });
  }, [table, objects]);
  useEffect(() => {
    setTab(0);
    setResultView("table");
  }, [result]);
  const builderError = !builder.table
    ? "Choose a table to build a query."
    : builder.aggregate &&
        builder.aggregate !== "COUNT" &&
        !builder.aggregateColumn
      ? "Choose a column for " + builder.aggregate + "."
      : "";
  const currentSql = mode === "builder" ? generated : sql;
  useEffect(() => {
    onDraft?.(currentSql);
  }, [currentSql, onDraft]);
  const removeJoin = (i) => {
    const prefix = builder.joins[i].table + ".",
      keep = (c) => !c.startsWith(prefix);
    update({
      joins: builder.joins.filter((_, n) => n !== i),
      columns: builder.columns.filter(keep),
      filters: builder.filters.filter((f) => keep(f.column)),
      order: keep(builder.order) ? builder.order : "",
      group: keep(builder.group) ? builder.group : "",
      aggregateColumn: keep(builder.aggregateColumn)
        ? builder.aggregateColumn
        : "",
    });
  };
  const execute = () => {
    if (currentSql.trim() && (mode !== "builder" || !builderError))
      run(currentSql);
  };
  useShortcuts((e) => {
    if (
      embedded ||
      !commandEnter(e) ||
      document.querySelector("[role=dialog][aria-modal=true]")
    )
      return false;
    if (!busy) execute();
    return true;
  });
  const r = result?.results[Math.min(tab, result.results.length - 1)];
  const fkOptions = (
    tables.find((t) => t.name === builder.table)?.foreignKeys || []
  ).filter(
    (f) =>
      f.table !== builder.table &&
      !builder.joins.some((j) => j.table === f.table),
  );
  return (
    <div className="query-workspace">
      <section className="query-panel">
        <div className="panel-bar">
          <div className="segmented">
            <button
              type="button"
              className={mode === "sql" ? "active" : ""}
              onClick={() => setMode("sql")}
            >
              <Code2 size={14} />
              SQL editor
            </button>
            <button
              type="button"
              className={mode === "builder" ? "active" : ""}
              onClick={() => setMode("builder")}
            >
              <Workflow size={14} />
              Visual builder
            </button>
          </div>
          {!embedded && (
            <div className="flex">
              <Button
                icon={Save}
                variant="quiet"
                onClick={() => onSave(currentSql)}
                disabled={!currentSql.trim()}
              >
                Save query
              </Button>
              <span className="keyboard">{shortcut.run}</span>
              <Button
                icon={Play}
                variant="primary"
                aria-keyshortcuts={shortcut.ariaRun}
                title={`Run query · ${shortcut.run}`}
                onClick={execute}
                disabled={
                  busy ||
                  !currentSql.trim() ||
                  (mode === "builder" && !!builderError)
                }
              >
                {busy ? "Running…" : "Run query"}
              </Button>
            </div>
          )}
        </div>
        {viewDefinition && !embedded && (
          <div className="query-view-source">
            <span>
              Query for view <code>{viewDefinition.name}</code>
              <small>
                Run this SELECT to preview results. Save definition changes
                through Edit view definition.
              </small>
            </span>
            <div className="flex">
              <Button
                variant="quiet small"
                onClick={() => {
                  setSql(viewDefinition.select);
                  setMode("sql");
                }}
              >
                Load saved view SQL
              </Button>
              <Button variant="primary small" onClick={onEditView}>
                Edit view definition
              </Button>
            </div>
          </div>
        )}
        {mode === "sql" ? (
          <>
            {!sql.trim() && suggestion && (
              <div className="query-suggestion">
                <span>
                  Start with a preview of <code>{table}</code>
                </span>
                <Button
                  icon={Plus}
                  variant="quiet small"
                  onClick={() => {
                    setSql(suggestion);
                    editorRef.current?.focus();
                  }}
                >
                  Insert SELECT
                </Button>
              </div>
            )}
            <SqlEditor
              value={sql}
              onChange={setSql}
              objects={objects}
              table={table}
              label={editorLabel}
              editorRef={editorRef}
              disabled={busy}
            />
          </>
        ) : (
          <div className="builder">
            <div className="builder-top">
              <label>
                From table
                <select
                  value={builder.table}
                  onChange={(e) =>
                    update({
                      table: e.target.value,
                      columns: [],
                      filters: [],
                      joins: [],
                      order: "",
                      group: "",
                      aggregateColumn: "",
                    })
                  }
                >
                  {tables.map((t) => (
                    <option key={t.name}>{t.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Match conditions
                <select
                  value={builder.conjunction}
                  onChange={(e) => update({ conjunction: e.target.value })}
                >
                  <option value="AND">All conditions (AND)</option>
                  <option value="OR">Any condition (OR)</option>
                </select>
              </label>
              <label>
                Row limit
                <input
                  type="number"
                  min="1"
                  max="10000"
                  placeholder={embedded ? "No limit" : undefined}
                  value={builder.limit ?? ""}
                  onChange={(e) => update({ limit: e.target.value })}
                />
              </label>
            </div>
            <label className="field-label">
              Select columns <span>All columns when none selected</span>
            </label>
            <div className="column-chips">
              {fields.map((c) => (
                <label
                  key={c.name}
                  className={builder.columns.includes(c.name) ? "checked" : ""}
                >
                  <input
                    type="checkbox"
                    checked={builder.columns.includes(c.name)}
                    onChange={(e) =>
                      update({
                        columns: e.target.checked
                          ? [...builder.columns, c.name]
                          : builder.columns.filter((x) => x !== c.name),
                      })
                    }
                  />
                  {c.name}
                </label>
              ))}
            </div>
            <div className="builder-section">
              <div className="section-label">
                Conditions{" "}
                <Button
                  icon={Plus}
                  variant="quiet small"
                  onClick={() =>
                    update({
                      filters: [
                        ...builder.filters,
                        {
                          column: fields[0]?.name || "",
                          operator: "=",
                          value: "",
                        },
                      ],
                    })
                  }
                >
                  Add condition
                </Button>
              </div>
              {!builder.filters.length && (
                <p className="muted small-text">
                  No conditions. All rows are included.
                </p>
              )}
              {builder.filters.map((f, i) => (
                <div className="condition" key={i}>
                  <select
                    aria-label={`Condition ${i + 1} column`}
                    value={f.column}
                    onChange={(e) =>
                      update({
                        filters: builder.filters.map((x, j) =>
                          i === j ? { ...x, column: e.target.value } : x,
                        ),
                      })
                    }
                  >
                    {fields.map((c) => (
                      <option key={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <select
                    aria-label={`Condition ${i + 1} operator`}
                    value={f.operator}
                    onChange={(e) =>
                      update({
                        filters: builder.filters.map((x, j) =>
                          i === j ? { ...x, operator: e.target.value } : x,
                        ),
                      })
                    }
                  >
                    {[
                      "=",
                      "!=",
                      ">",
                      ">=",
                      "<",
                      "<=",
                      "CONTAINS",
                      "LIKE",
                      "IS NULL",
                      "IS NOT NULL",
                    ].map((op) => (
                      <option key={op}>{op}</option>
                    ))}
                  </select>
                  <input
                    aria-label={`Condition ${i + 1} value`}
                    placeholder="Value"
                    value={f.value}
                    disabled={f.operator.startsWith("IS ")}
                    onChange={(e) =>
                      update({
                        filters: builder.filters.map((x, j) =>
                          i === j ? { ...x, value: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Remove condition"
                    onClick={() =>
                      update({
                        filters: builder.filters.filter((_, j) => i !== j),
                      })
                    }
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
            <div className="builder-section">
              <div className="section-label">
                Join related tables{" "}
                {fkOptions.length > 0 && (
                  <Button
                    icon={Plus}
                    variant="quiet small"
                    onClick={() => {
                      const f = fkOptions[0];
                      const keys = (
                        tables.find((t) => t.name === builder.table)
                          ?.foreignKeys || []
                      )
                        .filter((k) => k.id === f.id)
                        .sort((a, b) => Number(a.seq) - Number(b.seq));
                      const target =
                        tables
                          .find((t) => t.name === f.table)
                          ?.columns.filter((c) => Number(c.pk) > 0)
                          .sort((a, b) => Number(a.pk) - Number(b.pk)) || [];
                      const pairs = keys.map((k, i) => ({
                        from: k.from,
                        to: k.to || target[i]?.name,
                      }));
                      update({
                        joins: [
                          ...builder.joins,
                          {
                            table: f.table,
                            from: pairs[0].from,
                            to: pairs[0].to,
                            pairs,
                          },
                        ],
                      });
                    }}
                  >
                    Add join
                  </Button>
                )}
              </div>
              {!builder.joins.length && (
                <p className="muted small-text">
                  {fkOptions.length
                    ? "Add a left join using a foreign key."
                    : "No foreign keys available from this table."}
                </p>
              )}
              {builder.joins.map((j, i) => (
                <div className="join-row" key={i}>
                  <code>
                    LEFT JOIN {j.table} ON{" "}
                    {(j.pairs || [{ from: j.from, to: j.to }])
                      .map(
                        (p) =>
                          `${builder.table}.${p.from} = ${j.table}.${p.to}`,
                      )
                      .join(" AND ")}
                  </code>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Remove join"
                    onClick={() => removeJoin(i)}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="builder-bottom">
              <label>
                Order by
                <select
                  value={builder.order}
                  onChange={(e) => update({ order: e.target.value })}
                >
                  <option value="">No sorting</option>
                  {fields.map((c) => (
                    <option key={c.name}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Direction
                <select
                  value={builder.direction}
                  onChange={(e) => update({ direction: e.target.value })}
                >
                  <option>ASC</option>
                  <option>DESC</option>
                </select>
              </label>
              <label>
                Aggregate
                <select
                  value={builder.aggregate}
                  onChange={(e) => {
                    const aggregate = e.target.value;
                    update({
                      aggregate,
                      aggregateColumn:
                        aggregate && aggregate !== "COUNT"
                          ? builder.aggregateColumn ||
                            fields.find((c) =>
                              /INT|REAL|FLOAT|DOUBLE|NUMERIC|DECIMAL/i.test(
                                c.type,
                              ),
                            )?.name ||
                            fields[0]?.name ||
                            ""
                          : builder.aggregateColumn,
                    });
                  }}
                >
                  <option value="">None</option>
                  {["COUNT", "SUM", "AVG", "MIN", "MAX"].map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </label>
              <label>
                Aggregate column
                <select
                  value={builder.aggregateColumn}
                  onChange={(e) => update({ aggregateColumn: e.target.value })}
                >
                  <option
                    value=""
                    disabled={
                      !!builder.aggregate && builder.aggregate !== "COUNT"
                    }
                  >
                    All (*)
                  </option>
                  {fields.map((c) => (
                    <option key={c.name}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Group by
                <select
                  value={builder.group}
                  onChange={(e) => update({ group: e.target.value })}
                >
                  <option value="">No grouping</option>
                  {fields.map((c) => (
                    <option key={c.name}>{c.name}</option>
                  ))}
                </select>
              </label>
            </div>
            {builderError && (
              <p className="error-text" role="alert">
                {builderError}
              </p>
            )}
            <div className="sql-preview">
              <pre>{generated}</pre>
              <Button
                icon={Code2}
                variant="quiet small"
                onClick={() => {
                  setSql(generated);
                  setMode("sql");
                }}
              >
                Open in editor
              </Button>
            </div>
          </div>
        )}
        <footer className="editor-footer">
          <span>
            <span className="status-dot" /> Runs locally in your browser
          </span>
          <span>
            {embedded
              ? "SELECT definition · leave row limit empty for all rows"
              : "Results limited to 1,000 rows per statement"}
          </span>
        </footer>
      </section>
      {error && (
        <div className="error-banner" role="alert">
          <strong>Query failed</strong>
          <pre>{error}</pre>
          <span>
            Earlier statements may have completed. Review your data before
            retrying.
          </span>
        </div>
      )}
      {!embedded && (
        <section className="query-results">
          <div className="panel-bar">
            <div className="flex">
              <strong>Results</strong>
              {result && (
                <>
                  <BadgeResult>
                    {r?.rows.length || 0} rows{r?.truncated ? "+" : ""}
                  </BadgeResult>
                  <span className="muted small-text">
                    <Clock3 size={12} />
                    {result.ms} ms
                  </span>
                  <span className="muted small-text">
                    {result.changed} rows changed
                  </span>
                </>
              )}
            </div>
            <div className="flex">
              {r?.columns.length > 0 && (
                <div
                  className="segmented result-view-switch"
                  aria-label="Result view"
                >
                  <button
                    type="button"
                    className={resultView === "table" ? "active" : ""}
                    onClick={() => setResultView("table")}
                  >
                    <Table2 size={13} />
                    Table
                  </button>
                  <button
                    type="button"
                    className={resultView === "graph" ? "active" : ""}
                    onClick={() => setResultView("graph")}
                  >
                    <Network size={13} />
                    Graph
                  </button>
                </div>
              )}
              <Button
                icon={Download}
                variant="quiet small"
                disabled={!r?.columns.length}
                onClick={() => csvDownload(r)}
              >
                Export CSV
              </Button>
            </div>
          </div>
          {result?.results.length > 1 && (
            <div className="result-tabs">
              {result.results.map((_, i) => (
                <button
                  type="button"
                  key={i}
                  className={tab === i ? "active" : ""}
                  onClick={() => setTab(i)}
                >
                  Statement {i + 1}
                </button>
              ))}
            </div>
          )}
          {r ? (
            r.columns.length ? (
              <>
                {resultView === "graph" ? (
                  <GraphErrorBoundary
                    key={tab}
                    onBack={() => setResultView("table")}
                  >
                    <ResultGraph result={r} />
                  </GraphErrorBoundary>
                ) : (
                  <DataGrid compact columns={r.columns} rows={r.rows} />
                )}
                {r.truncated && (
                  <div className="result-notice">
                    Showing {r.rows.length} returned rows.{" "}
                    {r.warning || "Narrow the query to explore further."}
                  </div>
                )}
                {r.textTruncated && (
                  <div className="result-notice">
                    Long values are clipped to 4,096 characters in query results
                    and CSV exports.
                  </div>
                )}
              </>
            ) : (
              <Empty title="Statement completed">
                {r.changed} rows affected. Your changes are ready to export.
              </Empty>
            )
          ) : (
            <Empty title="Your next discovery starts here">
              Write a SQL query or use the visual builder, then hit Run query.
            </Empty>
          )}
        </section>
      )}
    </div>
  );
}
const BadgeResult = ({ children }) => (
  <span className="count-tag">{children}</span>
);
