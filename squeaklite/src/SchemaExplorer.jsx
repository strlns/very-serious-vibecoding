import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Plus,
  Eye,
  Table2,
  KeyRound,
  Zap,
  Search,
  SquarePen,
  Trash2,
  Code2,
  ChevronRight,
} from "lucide-react";
import { Button, IconButton, Empty, Modal } from "./ui.jsx";
import { ident } from "./sql.ts";
import {
  columnDefinition,
  viewSelect,
  viewColumnNames,
  SCHEMA_KINDS,
  schemaReferences,
  schemaDependencies,
} from "./schema-tools.mjs";
import { rpc } from "./client.ts";
import SqlEditor from "./SqlEditor.jsx";
import Query from "./Query.jsx";
const icons = { table: Table2, view: Eye, index: KeyRound, trigger: Zap };
const title = (kind) => kind[0].toUpperCase() + kind.slice(1);
export default function SchemaExplorer({
  objects,
  onOpen,
  onEdit,
  onCreate,
  onQuery,
  busy,
  onColumn,
  onAddColumn,
}) {
  const [search, setSearch] = useState(""),
    [kind, setKind] = useState("all"),
    [selected, setSelected] = useState("");
  const filtered = useMemo(
    () =>
      objects.filter(
        (o) =>
          (kind === "all" || o.type === kind) &&
          `${o.name} ${o.tableName || ""}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [objects, kind, search],
  );
  const object =
      filtered.find((o) => o.type + ":" + o.name === selected) || filtered[0],
    related = object
      ? [
          ...schemaDependencies(objects, object).map((o) => ({
            ...o,
            direction: "Uses",
          })),
          ...schemaReferences(objects, object).map((o) => ({
            ...o,
            direction: "Used by",
          })),
        ]
      : [];
  return (
    <div className="schema-workspace">
      <section className="schema-catalog">
        <div className="panel-bar">
          <div>
            <strong>Schema explorer</strong>
            <p className="muted small-text">
              {objects.length} objects · main database
            </p>
          </div>
          <div className="schema-create-actions">
            {SCHEMA_KINDS.map((k) => (
              <Button
                key={k}
                icon={Plus}
                variant={k === "view" ? "primary small" : "small"}
                disabled={busy}
                onClick={() => onCreate(k)}
              >
                Add {title(k)}
              </Button>
            ))}
          </div>
        </div>
        <div className="schema-search">
          <Search size={15} />
          <input
            aria-label="Search schema objects"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find an object or its table…"
          />
          <select
            aria-label="Schema object type"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="all">All object types</option>
            {SCHEMA_KINDS.map((k) => (
              <option value={k} key={k}>
                {k === "index" ? "Indexes" : title(k) + "s"}
              </option>
            ))}
          </select>
        </div>
        <div className="schema-browser">
          <div className="schema-object-list" aria-label="Schema objects">
            {filtered.length ? (
              filtered.map((o) => {
                const Icon = icons[o.type] || Code2;
                return (
                  <button
                    key={o.type + o.name}
                    className={object === o ? "active" : ""}
                    onClick={() => setSelected(o.type + ":" + o.name)}
                  >
                    <Icon size={16} />
                    <span>
                      <strong>{o.name}</strong>
                      <small>
                        {o.type}
                        {o.tableName !== o.name ? " · " + o.tableName : ""}
                      </small>
                    </span>
                    <ChevronRight size={13} />
                  </button>
                );
              })
            ) : (
              <Empty title="No matching objects">
                Create a schema object or change the search.
              </Empty>
            )}
          </div>
          {object && (
            <div className="schema-object-detail">
              <div className="schema-detail-heading">
                <div>
                  <span className="type-tag">{object.type.toUpperCase()}</span>
                  <h2>{object.name}</h2>
                </div>
                <div className="flex">
                  {["table", "view"].includes(object.type) && (
                    <Button onClick={() => onOpen(object.name)}>
                      Browse rows
                    </Button>
                  )}
                  <Button
                    icon={SquarePen}
                    aria-label={`Edit ${object.type} ${object.name}`}
                    disabled={busy}
                    onClick={() => onEdit(object)}
                  >
                    {object.type === "view" ? "Edit view definition" : "Edit"}
                  </Button>
                  <IconButton
                    icon={Trash2}
                    label={`Delete ${object.type} ${object.name}`}
                    disabled={busy}
                    onClick={() => onEdit(object, "drop")}
                  />
                </div>
              </div>
              {object.schemaError && (
                <p role="alert" className="error-text">
                  {object.schemaError}
                </p>
              )}
              {object.columns.length > 0 && (
                <div className="schema-column-list">
                  <div className="schema-detail-label">
                    <h3>
                      Columns{" "}
                      <span className="count-tag">{object.columns.length}</span>
                    </h3>
                    {object.type === "table" && (
                      <Button
                        icon={Plus}
                        variant="quiet small"
                        disabled={busy}
                        onClick={() => onAddColumn(object)}
                      >
                        Add column
                      </Button>
                    )}
                  </div>
                  {object.columns.map((c) => (
                    <div key={c.name}>
                      <code>{c.name}</code>
                      <span>
                        {c.type || "ANY"}
                        {Number(c.pk) > 0 ? " · primary key" : ""}
                        {Number(c.notnull) ? " · not null" : ""}
                      </span>
                      {object.type === "table" && (
                        <span className="schema-row-actions">
                          <IconButton
                            icon={SquarePen}
                            label={`Edit column ${c.name}`}
                            disabled={busy}
                            onClick={() => onColumn(object, c, "renameColumn")}
                          />
                          <IconButton
                            icon={Trash2}
                            label={`Delete column ${c.name}`}
                            disabled={busy}
                            onClick={() => onColumn(object, c, "dropColumn")}
                          />
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="schema-detail-label">
                <h3>Definition</h3>
                <Button
                  icon={Code2}
                  variant="quiet small"
                  onClick={() => onQuery(object.sql + ";")}
                >
                  Open SQL
                </Button>
              </div>
              <pre className="definition-code">{object.sql};</pre>
              <h3>Related objects</h3>
              {related.length ? (
                <div className="schema-related">
                  {related.map((o) => (
                    <button
                      key={o.direction + o.type + o.name}
                      onClick={() => {
                        setKind("all");
                        setSearch("");
                        setSelected(o.type + ":" + o.name);
                      }}
                    >
                      <span className="schema-relation-direction">
                        {o.direction}
                      </span>
                      <span className="type-tag">{o.type}</span> {o.name}
                      <ChevronRight size={12} />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="muted small-text">
                  No related schema objects detected.
                </p>
              )}
              <p className="schema-footnote">
                Internal SQLite indexes are listed with table constraints in
                Structure. Related objects are detected conservatively from
                definitions.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
const blankColumn = () => ({
  name: "",
  type: "TEXT",
  primary: false,
  notNull: false,
  defaultValue: "",
});
function ColumnFields({ value, onChange, primary = false }) {
  return (
    <div className="schema-column-fields">
      <label>
        Column name
        <input
          required
          aria-label="Column name"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
      </label>
      <label>
        Type
        <select
          value={value.type}
          onChange={(e) => onChange({ ...value, type: e.target.value })}
        >
          {["INTEGER", "TEXT", "REAL", "NUMERIC", "BLOB", "ANY"].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <label>
        Default value
        <input
          placeholder="e.g. 'draft' or 0"
          value={value.defaultValue}
          onChange={(e) => onChange({ ...value, defaultValue: e.target.value })}
        />
      </label>
      <div className="flex">
        {primary && (
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={value.primary}
              onChange={(e) =>
                onChange({ ...value, primary: e.target.checked })
              }
            />
            Primary key
          </label>
        )}
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={value.notNull}
            onChange={(e) => onChange({ ...value, notNull: e.target.checked })}
          />
          Not null
        </label>
      </div>
    </div>
  );
}
export function SchemaDialog({
  kind,
  object,
  action: initialAction,
  databasePath,
  objects,
  onClose,
  onChanged,
  defaultTable,
  onBusyChange,
  initialOperation = "rename",
  initialColumn,
}) {
  const action =
    initialAction ||
    (!object ? "create" : kind === "table" ? "alter" : "replace");
  const [name, setName] = useState(object?.name || ""),
    [sql, setSql] = useState(object?.sql || ""),
    [select, setSelect] = useState(object ? viewSelect(object.sql) : ""),
    [draft, setDraft] = useState(select),
    [aliases, setAliases] = useState(
      object ? viewColumnNames(object.sql).join("\n") : "",
    ),
    [advanced, setAdvanced] = useState(!!object || kind === "trigger"),
    [operation, setOperation] = useState(initialOperation),
    [column, setColumn] = useState(
      initialColumn || object?.columns[0]?.name || "",
    ),
    [newColumn, setNewColumn] = useState(""),
    [definition, setDefinition] = useState(blankColumn),
    [columns, setColumns] = useState([
      { ...blankColumn(), name: "id", type: "INTEGER", primary: true },
      { ...blankColumn(), name: "title" },
    ]),
    [table, setTable] = useState(
      defaultTable || objects.find((o) => o.type === "table")?.name || "",
    ),
    [indexColumns, setIndexColumns] = useState([]),
    [unique, setUnique] = useState(false),
    [plan, setPlan] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const mounted = useRef(true),
    started = useRef(false);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );
  useEffect(() => {
    onBusyChange?.(busy);
    return () => onBusyChange?.(false);
  }, [busy, onBusyChange]);
  const request = () => {
    let ddl = sql;
    if (action === "create" && kind === "table" && !advanced)
      ddl = `CREATE TABLE ${ident(name)} (\n  ${columns.map(columnDefinition).join(",\n  ")}\n)`;
    if (action === "create" && kind === "index" && !advanced) {
      if (!indexColumns.length)
        throw new Error("Choose at least one index column.");
      ddl = `CREATE ${unique ? "UNIQUE " : ""}INDEX ${ident(name)} ON ${ident(table)} (${indexColumns.map(ident).join(", ")})`;
    }
    return {
      action,
      kind,
      name: name || object?.name,
      oldName: object?.name,
      sql: ddl,
      select: draft,
      columnNames: aliases.split("\n").filter((n) => n.trim()),
      operation,
      column,
      newColumn,
      definition,
      databasePath,
    };
  };
  const review = async () => {
    setError("");
    setBusy(true);
    try {
      const result = await rpc("schemaReview", request());
      if (mounted.current) setPlan(result);
    } catch (e) {
      if (mounted.current) setError(e.message);
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  useEffect(() => {
    if (
      (action === "drop" || initialOperation === "dropColumn") &&
      !started.current
    ) {
      started.current = true;
      review();
    }
  }, []);
  const apply = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await rpc("schemaApply", {
        reviewId: plan.reviewId,
        token: plan.token,
        databasePath,
        confirmed: true,
      });
      if (mounted.current) await onChanged(result);
    } catch (e) {
      if (mounted.current) {
        setPlan(null);
        setError(e.message);
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  const generate = () => {
    try {
      if (!name.trim()) {
        setError("Enter an object name first.");
        return;
      }
      if (kind === "trigger")
        setSql(
          `CREATE TRIGGER ${ident(name)}\nAFTER INSERT ON ${ident(table)}\nBEGIN\n  SELECT 1;\nEND;`,
        );
      else if (kind === "table")
        setSql(
          `CREATE TABLE ${ident(name)} (\n  ${columns.map(columnDefinition).join(",\n  ")}\n);`,
        );
      else if (kind === "index")
        setSql(
          `CREATE ${unique ? "UNIQUE " : ""}INDEX ${ident(name)} ON ${ident(table)} (${indexColumns.map(ident).join(", ")});`,
        );
      setAdvanced(true);
    } catch (e) {
      setError(e.message);
    }
  };
  const tables = objects.filter((o) => o.type === "table"),
    fields = tables.find((o) => o.name === table)?.columns || [];
  return (
    <Modal
      wide
      title={
        plan
          ? plan.blocked
            ? "Schema change blocked"
            : plan.destructive
              ? operation === "dropColumn"
                ? "Delete column?"
                : `Delete ${kind}?`
              : "Review schema change"
          : kind === "view" && action === "replace"
            ? "Edit view definition"
            : `${action === "create" ? "Add" : action === "drop" ? "Delete" : "Edit"} ${title(kind)}`
      }
      subtitle={
        object?.name || "Changes stay in memory until you export the workspace."
      }
      onClose={onClose}
      dismissible={!busy}
    >
      {error && (
        <div className="error-banner form-error" role="alert">
          {error}
        </div>
      )}
      {plan ? (
        <>
          <div className="schema-review">
            <p>
              {plan.destructive
                ? "This removes data or a schema object. Export a backup before confirming."
                : "Review the exact SQL before applying this change."}
            </p>
            {plan.rows != null && (
              <p>
                <strong>{Number(plan.rows).toLocaleString()} rows</strong> in
                this table.
              </p>
            )}
            {plan.blockers.length > 0 && (
              <div className="error-banner">
                <strong>Resolve these dependencies first</strong>
                {plan.blockers.map((o) => (
                  <p key={o.name}>
                    {o.type}: {o.name}
                  </p>
                ))}
              </div>
            )}
            {plan.related.some((o) => o.owned) && (
              <p>
                Attached objects:{" "}
                {plan.related
                  .filter((o) => o.owned)
                  .map((o) => o.name)
                  .join(", ")}
                .{" "}
                {plan.preservedTriggers
                  ? "View triggers will be recreated in the same transaction."
                  : action === "drop"
                    ? "They will be removed with this object."
                    : ""}
              </p>
            )}
            <pre className="definition-code">{plan.sql}</pre>
            <p className="small-text muted">
              Changes are atomic. An error restores the previous schema and
              data.
            </p>
          </div>
          <footer className="modal-footer">
            <Button
              disabled={busy}
              onClick={() => (plan.destructive ? onClose() : setPlan(null))}
            >
              {plan.destructive ? "Cancel" : "Back to editing"}
            </Button>
            <Button
              variant={plan.destructive ? "danger" : "primary"}
              disabled={busy || plan.blocked}
              onClick={apply}
            >
              {busy
                ? "Applying…"
                : plan.destructive
                  ? "Confirm deletion"
                  : "Confirm schema change"}
            </Button>
          </footer>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            review();
          }}
        >
          <fieldset disabled={busy} className="schema-edit-fields">
            {action === "drop" ? (
              <p>Review the dependencies before deleting {object?.name}.</p>
            ) : (
              <>
                <label>
                  {kind === "table" && action === "alter"
                    ? "Table name"
                    : "Object name"}
                  <input
                    autoFocus
                    required
                    maxLength={255}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={action === "alter" && operation !== "rename"}
                  />
                </label>
                {kind === "table" && action === "alter" ? (
                  <>
                    <label>
                      Change
                      <select
                        value={operation}
                        onChange={(e) => setOperation(e.target.value)}
                      >
                        <option value="rename">Rename table</option>
                        <option value="addColumn">Add column</option>
                        <option value="renameColumn">Rename column</option>
                        <option value="dropColumn">Delete column</option>
                      </select>
                    </label>
                    {operation === "addColumn" ? (
                      <ColumnFields
                        value={definition}
                        onChange={setDefinition}
                      />
                    ) : (
                      operation !== "rename" && (
                        <>
                          <label>
                            Existing column
                            <select
                              value={column}
                              onChange={(e) => setColumn(e.target.value)}
                            >
                              {object.columns.map((c) => (
                                <option key={c.name}>{c.name}</option>
                              ))}
                            </select>
                          </label>
                          {operation === "renameColumn" && (
                            <label>
                              New column name
                              <input
                                required
                                value={newColumn}
                                onChange={(e) => setNewColumn(e.target.value)}
                              />
                            </label>
                          )}
                        </>
                      )
                    )}
                    <p className="form-note">
                      SQLite checks constraints and dependencies. Rename and add
                      operations preserve rows; deleting a column requires
                      confirmation. More advanced migrations can be reviewed in
                      the SQL workspace.
                    </p>
                  </>
                ) : kind === "view" ? (
                  <>
                    <p className="small-text muted">
                      Define the SELECT behind this view. Row data is read
                      through the view; edit its definition here. Leave the
                      visual builder’s row limit empty to include all matching
                      rows.
                    </p>
                    <label>
                      View column aliases (optional, one per line)
                      <textarea
                        className="view-aliases"
                        aria-label="View column aliases"
                        value={aliases}
                        onChange={(e) => setAliases(e.target.value)}
                      />
                    </label>
                    <Query
                      embedded
                      table={table}
                      objects={objects}
                      sql={select}
                      setSql={setSelect}
                      onDraft={setDraft}
                      editorLabel="View query editor"
                      busy={busy}
                    />
                  </>
                ) : (
                  <>
                    {(kind === "index" || kind === "trigger") && (
                      <label>
                        Target table
                        <select
                          value={table}
                          onChange={(e) => {
                            setTable(e.target.value);
                            setIndexColumns([]);
                          }}
                        >
                          {tables.map((t) => (
                            <option key={t.name}>{t.name}</option>
                          ))}
                        </select>
                      </label>
                    )}
                    {!advanced && kind === "table" && (
                      <div className="schema-draft-columns">
                        {columns.map((c, i) => (
                          <div key={i}>
                            <ColumnFields
                              value={c}
                              primary
                              onChange={(v) =>
                                setColumns((cs) =>
                                  cs.map((x, j) => (i === j ? v : x)),
                                )
                              }
                            />
                            <IconButton
                              icon={Trash2}
                              label={`Remove draft column ${i + 1}`}
                              disabled={columns.length === 1}
                              onClick={() =>
                                setColumns((cs) => cs.filter((_, j) => i !== j))
                              }
                            />
                          </div>
                        ))}
                        <Button
                          type="button"
                          icon={Plus}
                          onClick={() =>
                            setColumns((cs) => [...cs, blankColumn()])
                          }
                        >
                          Add column
                        </Button>
                      </div>
                    )}
                    {!advanced && kind === "index" && (
                      <>
                        <div className="column-chips">
                          {fields.map((c) => (
                            <label key={c.name}>
                              <input
                                type="checkbox"
                                checked={indexColumns.includes(c.name)}
                                onChange={(e) =>
                                  setIndexColumns((cs) =>
                                    e.target.checked
                                      ? [...cs, c.name]
                                      : cs.filter((x) => x !== c.name),
                                  )
                                }
                              />
                              {c.name}
                            </label>
                          ))}
                        </div>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={unique}
                            onChange={(e) => setUnique(e.target.checked)}
                          />
                          Unique index
                        </label>
                      </>
                    )}
                    {advanced ? (
                      <>
                        <SqlEditor
                          value={sql}
                          onChange={setSql}
                          objects={objects}
                          table={table}
                          label="Schema SQL editor"
                          disabled={busy}
                        />
                        {kind === "trigger" && !object && (
                          <Button
                            type="button"
                            variant="quiet"
                            onClick={generate}
                          >
                            Insert trigger template
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button
                        type="button"
                        icon={Code2}
                        variant="quiet"
                        onClick={generate}
                      >
                        Open generated SQL
                      </Button>
                    )}
                  </>
                )}
              </>
            )}
          </fieldset>
          <footer className="modal-footer">
            <Button type="button" disabled={busy} onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={busy || (action !== "drop" && !name.trim())}
            >
              {busy ? "Reviewing…" : "Review change"}
            </Button>
          </footer>
        </form>
      )}
    </Modal>
  );
}

export function DatabaseDialog({
  action,
  path = "",
  onClose,
  onChanged,
  onBusyChange,
}) {
  const [name, setName] = useState(action === "create" ? "untitled.db" : path),
    [plan, setPlan] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );
  useEffect(() => {
    onBusyChange?.(busy);
    return () => onBusyChange?.(false);
  }, [busy, onBusyChange]);
  const review = async () => {
    setError("");
    setBusy(true);
    try {
      const p = await rpc("databaseReview", { action, path, newPath: name });
      if (mounted.current) setPlan(p);
    } catch (e) {
      if (mounted.current) setError(e.message);
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  const apply = async () => {
    setError("");
    setBusy(true);
    try {
      const w = await rpc("databaseApply", {
        reviewId: plan.reviewId,
        token: plan.token,
        confirmed: true,
      });
      if (mounted.current) onChanged(w);
    } catch (e) {
      if (mounted.current) {
        setPlan(null);
        setError(e.message);
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  return (
    <Modal
      title={
        action === "create"
          ? "Add Database"
          : action === "rename"
            ? "Rename database"
            : "Delete database?"
      }
      subtitle="Workspace files are changed in memory; export the ZIP to keep them."
      onClose={onClose}
      dismissible={!busy}
    >
      {error && (
        <div className="error-banner form-error" role="alert">
          {error}
        </div>
      )}
      {plan ? (
        <>
          <div className="schema-review">
            <p>
              {action === "drop"
                ? `Remove ${path} and all of its data from this workspace? Export a backup first.`
                : action === "rename"
                  ? `${path} → ${name}`
                  : `Create an empty SQLite database at ${name}?`}
            </p>
            <p className="small-text muted">
              The original files on your device are untouched. This changes the
              next ZIP export.
            </p>
          </div>
          <footer className="modal-footer">
            <Button disabled={busy} onClick={() => setPlan(null)}>
              Back
            </Button>
            <Button
              variant={action === "drop" ? "danger" : "primary"}
              disabled={busy}
              onClick={apply}
            >
              {action === "drop"
                ? "Confirm deletion"
                : "Confirm workspace change"}
            </Button>
          </footer>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            review();
          }}
        >
          <div className="schema-edit-fields">
            {action === "drop" ? (
              <p>Review removal of {path} from the workspace.</p>
            ) : (
              <label>
                Database path
                <input
                  required
                  autoFocus
                  value={name}
                  disabled={busy}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={255}
                />
              </label>
            )}
          </div>
          <footer className="modal-footer">
            <Button disabled={busy} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? "Reviewing…" : "Review change"}
            </Button>
          </footer>
        </form>
      )}
    </Modal>
  );
}
