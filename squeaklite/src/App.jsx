import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  Database,
  Table2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Upload,
  Download,
  Plus,
  Search,
  SlidersHorizontal,
  Columns3,
  Ellipsis,
  Code2,
  Workflow,
  Network,
  Eye,
  FileText,
  FolderOpen,
  ShieldCheck,
  ArrowUpRight,
  Settings2,
  KeyRound,
  Link2,
  Trash2,
  X,
  Check,
  Clock3,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  BookOpen,
  Copy,
  RefreshCw,
  HardDrive,
  LayoutList,
  Filter,
  FolderArchive,
  File,
  ExternalLink,
  AlertCircle,
  LoaderCircle,
  SquarePen,
  ArrowLeft,
  History,
  Bookmark,
  Command,
} from "lucide-react";
import { rpc, subscribeStorage } from "./client.ts";
import {
  Button,
  IconButton,
  Badge,
  Modal,
  DataGrid,
  Empty,
  formatBytes,
  download,
  csvDownload,
} from "./ui.jsx";
import { ident, display } from "./sql.ts";
import { appDownloadHref } from "./app-download.ts";
import Query from "./Query.jsx";
import { viewSelect } from "./schema-tools.mjs";
import SqlEditor from "./SqlEditor.jsx";
import FileBrowser from "./FileBrowser.jsx";
import SchemaExplorer, {
  SchemaDialog,
  DatabaseDialog,
} from "./SchemaExplorer.jsx";
import useShortcuts from "./useShortcuts.js";
import {
  commandEnter,
  plainCharacter,
  textEntry,
  shortcutLabels,
} from "./shortcuts.mjs";
const shortcut = shortcutLabels();
import Graph from "./Graph.jsx";
import TableViewport from "./TableViewport.jsx";
import DeleteDialog from "./DeleteDialog.jsx";
import { tableViewKey } from "./view-state.ts";
import { parseRoute as readRoute, routeHash } from "./routes.ts";
const parseRoute = () => readRoute(location.hash);
function Logo() {
  return (
    <span className="brand-mark">
      <svg width="23" height="25" viewBox="0 0 23 25" fill="none">
        <path
          d="M3 19L11.5 4L20 19H3Z"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M7.2 12H15.8M11.5 4V20M3 19L20 23"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
export default function App() {
  const [filePath, setFilePath] = useState(""),
    [fileDrafts, setFileDrafts] = useState({});
  const [storage, setStorage] = useState(null);
  useEffect(() => subscribeStorage(setStorage), []);
  const [workspace, setWorkspace] = useState(null),
    [route, setRoute] = useState(parseRoute),
    [loadedData, setData] = useState(null),
    [busy, setBusy] = useState("Loading sample workspace…"),
    [error, setError] = useState(""),
    [toast, setToast] = useState("");
  const [sidebar, setSidebar] = useState(false),
    [tableSearch, setTableSearch] = useState(""),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(0),
    [pageSize, setPageSize] = useState(25),
    [sort, setSort] = useState({ column: "", direction: "ASC" }),
    [filters, setFilters] = useState([]),
    [selection, setSelected] = useState([]),
    [visibleColumns, setVisibleColumns] = useState(null),
    [columnsOpen, setColumnsOpen] = useState(false);
  const [modal, setModal] = useState(null),
    [rowEditor, setRowEditor] = useState(null),
    [scratchSql, setScratchSql] = useState(""),
    [viewSqlDrafts, setViewSqlDrafts] = useState({}),
    [queryResult, setQueryResult] = useState(null),
    [queryError, setQueryError] = useState(""),
    [history, setHistory] = useState([]),
    [saved, setSaved] = useState(() => {
      try {
        const values = JSON.parse(
          localStorage.getItem("quarry-queries") || "[]",
        );
        return Array.isArray(values)
          ? values.filter(
              (q) =>
                q && typeof q.name === "string" && typeof q.sql === "string",
            )
          : [];
      } catch {
        return [];
      }
    }),
    [refresh, setRefresh] = useState(0),
    [viewsOpen, setViewsOpen] = useState(true),
    [tabOpen, setTabOpen] = useState(true);
  const tableSearchRef = useRef(),
    pendingQueryFocus = useRef(false),
    pendingSearchFocus = useRef(false),
    fileRef = useRef(),
    folderRef = useRef(),
    loadVersion = useRef(0),
    toastTimer = useRef(),
    initialized = useRef(false),
    busyRef = useRef(true),
    contextRef = useRef(),
    pendingTableFocus = useRef(false);
  const meta = workspace?.meta,
    objects = meta?.objects || [],
    tables = objects.filter((o) => o.type === "table"),
    views = objects.filter((o) => o.type === "view"),
    object =
      objects.find(
        (o) =>
          o.name === route.table && (o.type === "table" || o.type === "view"),
      ) ||
      tables[0] ||
      views[0],
    table = object?.name;
  const isView = object?.type === "view",
    viewDraftKey = JSON.stringify([
      workspace?.workspaceId,
      workspace?.active,
      table,
    ]);
  const viewSourceSql = useMemo(
    () => (isView ? viewSelect(object.sql) : null),
    [isView, object?.sql],
  );
  const viewDraft = viewSqlDrafts[viewDraftKey],
    sql = isView
      ? viewDraft?.definition === object.sql
        ? viewDraft.text
        : viewSourceSql
      : scratchSql;
  const setSql = (text) => {
    if (isView)
      setViewSqlDrafts((d) => ({
        ...d,
        [viewDraftKey]: { definition: object.sql, text },
      }));
    else setScratchSql(text);
  };
  const queryContext = JSON.stringify([
    workspace?.workspaceId,
    workspace?.active,
    isView ? table : "scratch",
  ]);
  const viewKey = tableViewKey({
    table,
    db: workspace?.active,
    page,
    pageSize,
    search,
    sort,
    filters,
  });
  const data = loadedData?.context === viewKey ? loadedData : null,
    selected = data
      ? [...new Set(selection)].filter((i) => i >= 0 && i < data.rows.length)
      : [];
  contextRef.current = {
    viewKey,
    path: workspace?.active,
    view: route.view,
    queryContext,
  };
  const notify = (message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3500);
  };
  const perform = async (label, fn) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(label);
    setError("");
    try {
      return await fn();
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      busyRef.current = false;
      setBusy("");
    }
  };
  const navigate = (
    view = route.view,
    t = table,
    db = workspace?.active,
    nextFilters = [],
  ) => {
    location.hash = routeHash(view, t, db, nextFilters);
    setSidebar(false);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  useEffect(() => {
    const listener = () => setRoute(parseRoute());
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, []);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    rpc("initialize")
      .then((w) => {
        setWorkspace(w);
        if (w.persistence) setStorage(w.persistence);
        if (w.restored) {
          const first =
            w.meta.objects.find((o) => o.type === "table")?.name || "";
          location.hash = routeHash("data", first, w.active);
        }
        if (
          !w.restored &&
          (!location.hash ||
            (parseRoute().db && parseRoute().db !== "commerce.db"))
        ) {
          const reopen = !!parseRoute().db;
          location.hash = `/data?db=commerce.db&table=customers`;
          if (reopen) notify("Reopen your workspace files after reloading.");
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => {
        setBusy("");
        busyRef.current = false;
      });
  }, []);
  useEffect(() => {
    const listener = (e) => {
      if (
        (workspace?.dirty.length && storage?.state !== "saved") ||
        busy ||
        Object.keys(fileDrafts).length
      ) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", listener);
    return () => window.removeEventListener("beforeunload", listener);
  }, [workspace?.dirty.length, fileDrafts, storage?.state, busy]);
  useEffect(() => {
    setSearch("");
    setPage(0);
    setFilters(route.filters);
    setSelected([]);
    setVisibleColumns(null);
    setSort({ column: "", direction: "ASC" });
    setData(null);
    setColumnsOpen(false);
    setRowEditor(null);
  }, [table, workspace?.active, route.filterKey]);
  useEffect(() => {
    setQueryResult(null);
    setQueryError("");
  }, [queryContext, viewSourceSql]);
  useEffect(() => {
    setFileDrafts({});
    setFilePath("");
    setViewSqlDrafts({});
  }, [workspace?.workspaceId]);
  useEffect(() => {
    setSelected([]);
  }, [viewKey, route.view]);
  useEffect(() => {
    setModal(null);
  }, [route.view, route.db, route.table, route.filterKey]);
  useEffect(() => {
    if (!workspace || !route.db || route.db === workspace.active) return;
    if (workspace.databases.some((d) => d.path === route.db))
      perform("Opening database…", async () => {
        const m = await rpc("open", route.db);
        setWorkspace((w) => ({ ...w, active: route.db, meta: m }));
      });
  }, [route.db, workspace?.active, busy]);
  useEffect(() => {
    if (
      !workspace ||
      !table ||
      route.view !== "data" ||
      (route.db && route.db !== workspace.active)
    )
      return;
    const version = ++loadVersion.current;
    const timer = setTimeout(
      () => {
        rpc("browse", {
          table,
          page,
          pageSize,
          search,
          sort: sort.column,
          direction: sort.direction,
          filters,
        })
          .then((d) => {
            if (version === loadVersion.current) {
              setData({
                ...d,
                context: tableViewKey({
                  table,
                  db: workspace.active,
                  page: d.page,
                  pageSize,
                  search,
                  sort,
                  filters,
                }),
              });
              setPage(d.page);
              setSelected([]);
            }
          })
          .catch((e) => {
            if (version === loadVersion.current) setError(e.message);
          });
      },
      search ? 180 : 0,
    );
    return () => {
      clearTimeout(timer);
      loadVersion.current++;
    };
  }, [
    table,
    workspace?.active,
    route.db,
    route.view,
    page,
    pageSize,
    search,
    sort,
    filters,
    refresh,
    workspace?.meta,
  ]);
  useEffect(() => {
    if (data && pendingTableFocus.current) {
      pendingTableFocus.current = false;
      (
        document.querySelector("main .data-scroll") ||
        document.querySelector("main .table-panel")
      )?.focus({ preventScroll: true });
    }
  }, [data]);
  const reload = async () => {
    setData(null);
    const w = await rpc("workspace");
    setWorkspace(w);
    setRefresh((n) => n + 1);
  };
  const importFiles = (files) => {
    if (!files.length || busyRef.current) return;
    const start = () =>
      perform("Opening workspace…", async () => {
        const w = await rpc(
          "importFiles",
          Array.from(files, (file) => ({
            file,
            path: file.webkitRelativePath || file.name,
          })),
        );
        setWorkspace(w);
        setQueryResult(null);
        setRowEditor(null);
        setModal(null);
        const t =
          w.meta.objects.find((o) => o.type === "table" || o.type === "view")
            ?.name || "";
        navigate("data", t, w.active);
        notify(
          `Opened ${w.databases.length} database${w.databases.length === 1 ? "" : "s"}`,
        );
      });
    if (workspace?.dirty.length || Object.keys(fileDrafts).length)
      setModal({ type: "replace", action: start });
    else start();
  };
  const exportWorkspace = (databaseOnly, ignoreDrafts = false) => {
    if (!ignoreDrafts && Object.keys(fileDrafts).length) {
      setModal({ type: "textDrafts", databaseOnly });
      return;
    }
    return perform("Preparing download…", async () => {
      const result = await rpc("export", { databaseOnly });
      download(result.bytes, result.name, result.mime);
      notify(databaseOnly ? "Database downloaded" : "Workspace ZIP downloaded");
      setModal(null);
    });
  };
  const executeQuery = async (sqlText, review) => {
    const expectedContext = contextRef.current.queryContext;
    setQueryError("");
    setQueryResult(null);
    try {
      const r = await rpc("query", { sql: sqlText, ...review });
      if (contextRef.current.queryContext === expectedContext)
        setQueryResult(r);
      setHistory((h) =>
        [
          { sql: sqlText, time: new Date().toLocaleTimeString(), ms: r.ms },
          ...h,
        ].slice(0, 30),
      );
      await reload();
      notify(`Query completed in ${r.ms} ms`);
    } catch (e) {
      if (contextRef.current.queryContext === expectedContext)
        setQueryError(e.message);
      await reload();
    }
  };
  const runQuery = (sqlText) =>
    perform("Reviewing query…", async () => {
      const expectedPath = workspace.active,
        expectedContext = queryContext;
      const review = await rpc("queryReview", {
        sql: sqlText,
        databasePath: expectedPath,
      });
      if (
        contextRef.current.path !== expectedPath ||
        contextRef.current.view !== "query" ||
        contextRef.current.queryContext !== expectedContext
      )
        return;
      if (review.requiresConfirmation) {
        setModal({ type: "sqlConfirm", sql: sqlText, review });
        return;
      }
      await executeQuery(sqlText, review);
    });
  const openSQL = (text) => {
    setSql(text);
    setQueryError("");
    navigate("query");
  };
  const saveQuery = (text) => {
    if (text.trim()) setModal({ type: "saveQuery", sql: text });
  };
  const editRow = (row, key, index) => {
    if (busyRef.current || !data) return;
    setError("");
    setRowEditor({
      row,
      key,
      index,
      action: "update",
      table,
      databasePath: workspace.active,
      object,
      columns: data.columns,
      editable: data.editable,
    });
  };
  const openInsert = () => {
    if (busyRef.current) return;
    setError("");
    setRowEditor({
      action: "insert",
      row: null,
      key: null,
      table,
      databasePath: workspace.active,
      object,
      columns: object.columns.map((c) => c.name),
      editable: true,
    });
  };
  const saveRow = (values) => {
    const snapshot = rowEditor;
    return perform("Saving changes…", async () => {
      await rpc("edit", {
        table: snapshot.table,
        key: snapshot.key,
        values,
        action: snapshot.action,
        databasePath: snapshot.databasePath,
      });
      setSelected([]);
      setRowEditor(null);
      await reload();
      notify(snapshot.action === "insert" ? "Row added" : "Changes saved");
    });
  };
  const requestDeletion = (keys, source = "selection") => {
    const snapshot =
      source === "row"
        ? {
            table: rowEditor.table,
            databasePath: rowEditor.databasePath,
            keys: [rowEditor.key],
            source,
          }
        : {
            table,
            databasePath: workspace.active,
            keys: keys.map((k) => ({ ...k })),
            source,
          };
    const expectedView = viewKey;
    return perform("Checking deletion…", async () => {
      const plan = await rpc("deletionPlan", snapshot);
      if (
        contextRef.current.viewKey !== expectedView ||
        contextRef.current.path !== snapshot.databasePath
      )
        return;
      setModal({ type: "deleteRows", snapshot, plan });
    });
  };
  const deleteSelected = () => {
    if (!data || !selected.length || busyRef.current) return;
    requestDeletion(selected.map((i) => data.keys[i]));
  };
  const reviewDeletion = () => {
    const snapshot = modal.snapshot;
    return perform("Checking deletion…", async () => {
      const plan = await rpc("deletionPlan", snapshot);
      setModal({ type: "deleteRows", snapshot, plan });
    });
  };
  const confirmDeletion = () => {
    const snapshot = modal.snapshot,
      token = modal.plan.token;
    return perform("Deleting rows…", async () => {
      const result = await rpc("deleteRows", {
        ...snapshot,
        token,
        confirmed: true,
      });
      setSelected([]);
      pendingTableFocus.current = true;
      setRowEditor(null);
      setModal(null);
      await reload();
      notify(`${result.changed} row${result.changed === 1 ? "" : "s"} deleted`);
    });
  };
  const removeSaved = (item) => {
    setError("");
    setModal({ type: "deleteSaved", item });
  };
  const showSample = () => {
    const start = () =>
      perform("Loading sample…", async () => {
        const w = await rpc("demo");
        setWorkspace(w);
        setQueryResult(null);
        navigate("data", "customers", "commerce.db");
        setModal(null);
        notify("Sample workspace loaded");
      });
    if (workspace?.dirty.length || Object.keys(fileDrafts).length)
      setModal({ type: "replace", action: start });
    else start();
  };
  const setSchemaBusy = useCallback((value) => {
    busyRef.current = value;
    setBusy(value ? "Updating workspace…" : "");
  }, []);
  const openSchema = (kind, object, action, options = {}) => {
    if (busyRef.current) return;
    setError("");
    setModal({
      type: "schema",
      kind,
      object,
      action,
      databasePath: workspace.active,
      ...options,
    });
  };
  const schemaChanged = async (result) => {
    setSelected([]);
    setRowEditor(null);
    setQueryResult(null);
    setQueryError("");
    setError("");
    await reload();
    setModal(null);
    if (["table", "view"].includes(result.kind) && result.action !== "drop")
      navigate("structure", result.name);
    else navigate("schema");
    notify("Schema updated · export to keep your changes");
  };
  const visible =
      data?.columns.filter(
        (c) => !visibleColumns || visibleColumns.includes(c),
      ) || [],
    colIndexes = visible.map((c) => data.columns.indexOf(c));
  useShortcuts((e) => {
    if (document.querySelector("[role=dialog][aria-modal=true]")) return false;
    if (commandEnter(e) && route.view !== "query") {
      if (!busy && workspace) {
        pendingQueryFocus.current = true;
        navigate("query");
      }
      return true;
    }
    if (!plainCharacter(e) || textEntry(e)) return false;
    if (e.key === "/") {
      if (sidebar) {
        tableSearchRef.current?.focus();
        tableSearchRef.current?.select();
      } else {
        pendingSearchFocus.current = true;
        setSidebar(true);
      }
      return true;
    }
    if (e.key === "?") {
      setModal({ type: "help" });
      return true;
    }
    return false;
  });
  useEffect(() => {
    if (sidebar && pendingSearchFocus.current) {
      pendingSearchFocus.current = false;
      tableSearchRef.current?.focus();
      tableSearchRef.current?.select();
    }
  }, [sidebar]);
  useEffect(() => {
    if (route.view === "query" && pendingQueryFocus.current) {
      pendingQueryFocus.current = false;
      document
        .querySelector('[aria-label="SQL query editor"]')
        ?.focus({ preventScroll: true });
    }
  }, [route.view]);
  const hasChanges =
    !!workspace?.dirty.length || Object.keys(fileDrafts).length > 0;
  return (
    <div
      className="app"
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        importFiles(e.dataTransfer.files);
      }}
    >
      <input
        type="file"
        ref={fileRef}
        multiple
        accept=".zip,.db,.sqlite,.sqlite3,.db3,*/*"
        hidden
        onChange={(e) => {
          importFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        type="file"
        ref={folderRef}
        webkitdirectory=""
        directory=""
        multiple
        hidden
        onChange={(e) => {
          importFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {sidebar && (
        <button
          className="sidebar-shade"
          aria-label="Close navigation"
          onClick={() => setSidebar(false)}
        />
      )}
      <aside className={`sidebar ${sidebar ? "mobile-open" : ""}`}>
        <a className="brand" href="#/data">
          <Logo />
          <strong>
            squeaklite<span>.</span>
          </strong>
          <span className="edition">BETA</span>
        </a>
        <div className="sidebar-content">
          <div className="workspace-heading">
            <span>WORKSPACE</span>
            <button
              className="icon-button"
              aria-label="Open workspace options"
              onClick={() => setModal({ type: "files" })}
            >
              <Ellipsis size={17} />
            </button>
          </div>
          <button
            className="database-select"
            onClick={() => setModal({ type: "databases" })}
          >
            <span className="database-icon">
              <Database size={18} />
            </span>
            <span>
              <strong>
                {workspace?.active.split("/").pop() || "Opening…"}
              </strong>
              <small>
                {workspace?.databases.length > 1
                  ? `${workspace.databases.length} databases`
                  : "Local database"}
              </small>
            </span>
            <ChevronDown size={14} />
          </button>
          <div className="nav-search">
            <Search size={14} />
            <input
              ref={tableSearchRef}
              aria-keyshortcuts="/"
              aria-label="Find a table"
              placeholder="Find a table…"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
            />
            <kbd>/</kbd>
          </div>
          <button
            className={`nav-item ${route.view === "query" ? "active-tool" : ""}`}
            aria-keyshortcuts={
              route.view === "query" ? undefined : shortcut.ariaRun
            }
            title={`Open query workspace · ${shortcut.run}`}
            onClick={() => navigate("query")}
          >
            <Code2 size={17} />
            <span>Query workspace</span>
            <span className="shortcut">{shortcut.run}</span>
          </button>
          <button
            className={`nav-item ${route.view === "relationships" ? "active-tool" : ""}`}
            onClick={() => navigate("relationships")}
          >
            <Network size={17} />
            <span>Relationships</span>
          </button>
          <button
            className={`nav-item ${route.view === "schema" ? "active-tool" : ""}`}
            onClick={() => navigate("schema")}
          >
            <Columns3 size={17} />
            <span>Schema explorer</span>
          </button>
          <button
            className={`nav-item ${route.view === "files" ? "active-tool" : ""}`}
            onClick={() => navigate("files")}
          >
            <FileText size={17} />
            <span>Workspace files</span>
          </button>
          <div className="schema-sidebar-add">
            <Button
              icon={Plus}
              variant="quiet small"
              disabled={!!busy}
              onClick={() => openSchema("table")}
            >
              Add Table
            </Button>
            <Button
              icon={Plus}
              variant="quiet small"
              disabled={!!busy}
              onClick={() => openSchema("view")}
            >
              Add View
            </Button>
          </div>
          <div className="nav-section">
            <button
              className="nav-section-title"
              onClick={() => setTabOpen(!tabOpen)}
            >
              {tabOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              TABLES <span>{tables.length}</span>
            </button>
            {tabOpen && (
              <div className="table-list">
                {tables
                  .filter((t) =>
                    t.name.toLowerCase().includes(tableSearch.toLowerCase()),
                  )
                  .map((t) => (
                    <button
                      key={t.name}
                      className={`nav-item table-item ${table === t.name && ["data", "structure"].includes(route.view) ? "selected" : ""}`}
                      onClick={() => navigate("data", t.name)}
                    >
                      <Table2 size={15} />
                      <span>{t.name}</span>
                      {table === t.name && <span className="active-dot" />}
                    </button>
                  ))}
                {!tables.length && (
                  <p className="sidebar-hint">No tables in this database</p>
                )}
              </div>
            )}
          </div>
          <div className="nav-section">
            <button
              className="nav-section-title"
              onClick={() => setViewsOpen(!viewsOpen)}
            >
              {viewsOpen ? (
                <ChevronDown size={13} />
              ) : (
                <ChevronRight size={13} />
              )}
              VIEWS <span>{views.length}</span>
            </button>
            {viewsOpen &&
              views
                .filter((t) =>
                  t.name.toLowerCase().includes(tableSearch.toLowerCase()),
                )
                .map((t) => (
                  <button
                    key={t.name}
                    className={`nav-item table-item ${table === t.name && route.view === "data" ? "selected" : ""}`}
                    onClick={() => navigate("data", t.name)}
                  >
                    <Eye size={15} />
                    <span>{t.name}</span>
                  </button>
                ))}
          </div>
          <div className="nav-section saved-section">
            <div className="nav-section-title">
              <Bookmark size={13} />
              SAVED QUERIES{" "}
              <button
                className="icon-button"
                aria-label="Save current query"
                disabled={!sql.trim()}
                onClick={() => saveQuery(sql)}
              >
                <Plus size={14} />
              </button>
            </div>
            {workspace?.active === "commerce.db" && (
              <>
                <button
                  className="nav-item saved-query"
                  onClick={() =>
                    openSQL(
                      "SELECT name, email, country, lifetime_value\nFROM customers\nWHERE lifetime_value > 5000\nORDER BY lifetime_value DESC;",
                    )
                  }
                >
                  <FileText size={14} />
                  <span>High-value customers</span>
                </button>
                <button
                  className="nav-item saved-query"
                  onClick={() =>
                    openSQL("SELECT * FROM monthly_revenue\nORDER BY month;")
                  }
                >
                  <FileText size={14} />
                  <span>Monthly revenue</span>
                </button>
              </>
            )}
            {saved.map((s, i) => (
              <div className="saved-row" key={i}>
                <button
                  className="nav-item saved-query"
                  onClick={() => openSQL(s.sql)}
                >
                  <FileText size={14} />
                  <span>{s.name}</span>
                </button>
                <button
                  className="icon-button delete-saved"
                  aria-label={`Edit saved query ${s.name}`}
                  onClick={() => setModal({ type: "editQuery", item: s })}
                >
                  <SquarePen size={12} />
                </button>
                <button
                  className="icon-button delete-saved"
                  aria-label={`Delete saved query ${s.name}`}
                  onClick={() => removeSaved(s)}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="sidebar-bottom">
          <button
            className="nav-item"
            onClick={() => setModal({ type: "help" })}
          >
            <BookOpen size={16} />
            <span>Guide & shortcuts</span>
            <ArrowUpRight size={14} />
          </button>
          <div className="sidebar-version">
            <div className="sidebar-app-meta">
              <span className="status-dot" />
              <span>SQLite in your browser</span>
              <span className="sidebar-app-version">v1.6.0</span>
            </div>
            <div className="app-download">
              <span>Static Web App</span>
              <a
                href={appDownloadHref(
                  location.href,
                  import.meta.env?.MODE === "singlefile",
                )}
                download="squeaklite.html"
                title="Download the app for offline use. Export workspace data separately."
              >
                Download HTML →
              </a>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setSidebar(true)}
            >
              <Menu size={20} />
            </button>
            <span className="breadcrumb-workspace">Workspace</span>
            <ChevronRight size={13} />
            <Database size={14} />
            <strong>
              {workspace?.active.split("/").pop() || "commerce.db"}
            </strong>
            <span className="local-tag">LOCAL</span>
          </div>
          <div className="topbar-actions">
            <details
              className="storage-menu"
              data-state={storage?.state || "unavailable"}
            >
              <summary
                aria-label="Storage status"
                title={
                  storage?.message || "Memory only · export to keep changes"
                }
              >
                <span className="storage-status" role="status">
                  {storage?.state === "error" ? (
                    <AlertCircle size={14} aria-hidden="true" />
                  ) : storage?.mode === "opfs" ? (
                    <ShieldCheck size={14} aria-hidden="true" />
                  ) : (
                    <Database size={14} aria-hidden="true" />
                  )}
                  <span className="storage-status-text">
                    {storage?.message || "Memory only · export to keep changes"}
                  </span>
                </span>
              </summary>
              <div className="storage-popover">
                <p>
                  {storage?.message || "Memory only · export to keep changes"}
                </p>
                {storage?.canRecover && (
                  <button
                    type="button"
                    className="text-button"
                    disabled={!!busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Reload to restore the saved workspace and enable autosave? Current memory-only changes and unsaved text drafts will be discarded. Export them first.",
                        )
                      )
                        location.reload();
                    }}
                  >
                    Reload to restore autosave
                  </button>
                )}
                {storage?.savedAt && (
                  <div>
                    Last saved: {new Date(storage.savedAt).toLocaleTimeString()}
                  </div>
                )}
                {storage?.mode === "opfs" && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() =>
                      rpc("storageSave").catch((e) => setError(e.message))
                    }
                  >
                    Save now
                  </button>
                )}
                {storage?.mode === "opfs" && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={async () => {
                      try {
                        const granted = await navigator.storage?.persist?.();
                        notify(
                          granted
                            ? "Persistent storage granted. Keep exports as backups."
                            : "Storage remains best effort; the browser may remove it.",
                        );
                      } catch {
                        notify(
                          "Persistent storage unavailable. Keep exports as backups.",
                        );
                      }
                    }}
                  >
                    Keep browser storage
                  </button>
                )}
              </div>
            </details>
            <IconButton
              icon={History}
              label="Query history"
              onClick={() => setModal({ type: "history" })}
            />
            <span className="separator" />
            <Button
              icon={Upload}
              onClick={() => setModal({ type: "import" })}
              disabled={!!busy}
            >
              Import<span className="desktop-text"> workspace</span>
            </Button>
            <Button
              icon={Download}
              variant="primary"
              onClick={() => exportWorkspace(false)}
              disabled={!!busy || !workspace}
            >
              Export ZIP
            </Button>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                DATABASE EXPLORER <span>/</span>{" "}
                {["relationships", "schema", "files"].includes(route.view)
                  ? "OVERVIEW"
                  : object?.type === "view"
                    ? "VIEW"
                    : "TABLE"}
              </div>
              <h1>
                <span className="title-icon">
                  {route.view === "files" ? (
                    <FileText size={23} />
                  ) : route.view === "schema" ? (
                    <Columns3 size={23} />
                  ) : route.view === "relationships" ? (
                    <Network size={23} />
                  ) : route.view === "query" ? (
                    <Code2 size={23} />
                  ) : (
                    <Table2 size={23} />
                  )}
                </span>
                {route.view === "files"
                  ? "Workspace files"
                  : route.view === "schema"
                    ? "Schema explorer"
                    : route.view === "relationships"
                      ? "Relationships"
                      : route.view === "query"
                        ? "Query workspace"
                        : table || "Database explorer"}
                {object &&
                  !["relationships", "query", "schema", "files"].includes(
                    route.view,
                  ) && <span className="table-type">{object.type}</span>}
              </h1>
              <p>
                {route.view === "files"
                  ? "Your databases, companion text, and folder paths in one place."
                  : route.view === "schema"
                    ? "Create, inspect, and manage your database objects."
                    : route.view === "relationships"
                      ? "A connected view of your database. Follow the relationships."
                      : route.view === "query"
                        ? "Ask better questions. Find the story in your data."
                        : `Explore, understand, and work with your ${object?.type === "view" ? "view" : "table"} data.`}
              </p>
            </div>
            <div className="page-heading-right">
              {isView && ["data", "structure"].includes(route.view) && (
                <Button
                  icon={SquarePen}
                  variant="primary"
                  onClick={() => openSchema("view", object)}
                >
                  Edit view definition
                </Button>
              )}
              <Badge color={hasChanges ? "amber" : "green"}>
                {hasChanges
                  ? storage?.state === "saved"
                    ? "Saved locally · not exported"
                    : "Changes in memory"
                  : "Workspace ready"}
              </Badge>
              <button
                className="text-button"
                onClick={() => setModal({ type: "files" })}
              >
                <FolderOpen size={13} />
                {workspace?.files.length || 0} workspace files{" "}
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
          <nav className="view-tabs" aria-label="Database views">
            {[
              { id: "data", icon: Table2, label: "Data" },
              { id: "structure", icon: Columns3, label: "Structure" },
              { id: "query", icon: Code2, label: "Query" },
              { id: "relationships", icon: Network, label: "Relationships" },
              { id: "schema", icon: Columns3, label: "Schema" },
              { id: "files", icon: FileText, label: "Files" },
            ].map((t) => (
              <button
                key={t.id}
                className={route.view === t.id ? "active" : ""}
                onClick={() => navigate(t.id)}
              >
                <t.icon size={16} />
                {t.label}
                {t.id === "data" && data && table === object?.name && (
                  <span>{Number(data.count).toLocaleString()}</span>
                )}
              </button>
            ))}
            <span className="tabs-end">
              <ShieldCheck size={13} /> Private by design
            </span>
          </nav>
          {error && (
            <div className="error-banner global-error" role="alert">
              <AlertCircle size={17} />
              <span>{error}</span>
              <IconButton
                icon={X}
                label="Dismiss error"
                onClick={() => setError("")}
              />
            </div>
          )}
          <div className="view-content">
            {!workspace ? (
              <div className="loading-state">
                <LoaderCircle className="spin" size={28} />
                <h3>Opening your workspace</h3>
                <p>Preparing SQLite on your device…</p>
              </div>
            ) : route.view === "files" ? (
              <FileBrowser
                workspace={workspace}
                path={filePath}
                onSelect={setFilePath}
                drafts={fileDrafts}
                setDrafts={setFileDrafts}
                onChanged={async (w) => (w ? setWorkspace(w) : reload())}
                onBusyChange={setSchemaBusy}
                onOpenDatabase={(db) =>
                  navigate("data", workspace.active === db ? table : "", db)
                }
              />
            ) : route.view === "schema" ? (
              <SchemaExplorer
                objects={objects}
                onColumn={(o, c, operation) =>
                  openSchema("table", o, "alter", {
                    initialOperation: operation,
                    initialColumn: c.name,
                  })
                }
                onAddColumn={(o) =>
                  openSchema("table", o, "alter", {
                    initialOperation: "addColumn",
                  })
                }
                onOpen={(t) => navigate("data", t)}
                onEdit={(o, a) => openSchema(o.type, o, a)}
                onCreate={(k) => openSchema(k)}
                onQuery={openSQL}
                busy={!!busy}
              />
            ) : route.view === "data" ? (
              table ? (
                <>
                  <div className="stats-strip">
                    <div>
                      <span className="stat-label">Total rows</span>
                      <strong>
                        {data ? Number(data.count).toLocaleString() : "—"}
                        <span className="stat-unit">records</span>
                      </strong>
                    </div>
                    <div>
                      <span className="stat-label">Columns</span>
                      <strong>
                        {object?.columns.filter((c) => Number(c.hidden) !== 1)
                          .length || 0}
                        <span className="stat-unit">fields</span>
                      </strong>
                    </div>
                    <div>
                      <span className="stat-label">Primary key</span>
                      <strong className="stat-key">
                        <KeyRound size={15} />
                        {object?.columns
                          .filter((c) => Number(c.pk) > 0)
                          .map((c) => c.name)
                          .join(", ") || "None"}
                      </strong>
                    </div>
                    <div>
                      <span className="stat-label">Database size</span>
                      <strong>
                        {formatBytes(
                          Number(meta.pageCount) * Number(meta.pageSize),
                        )}
                        <HardDrive size={15} />
                      </strong>
                    </div>
                  </div>
                  <section
                    className="table-panel"
                    tabIndex={-1}
                    aria-label="Table rows panel"
                  >
                    <div className="table-toolbar">
                      <div className="toolbar-left">
                        <div className="row-search">
                          <Search size={15} />
                          <input
                            aria-label="Search table rows"
                            placeholder="Search rows…"
                            value={search}
                            onChange={(e) => {
                              setSearch(e.target.value);
                              setPage(0);
                            }}
                          />
                          {search && (
                            <button
                              aria-label="Clear search"
                              onClick={() => setSearch("")}
                            >
                              <X size={13} />
                            </button>
                          )}
                          <span className="search-key">⌕</span>
                        </div>
                        <Button
                          icon={SlidersHorizontal}
                          variant={filters.length ? "filter-active" : ""}
                          onClick={() => setModal({ type: "filter" })}
                        >
                          Filter
                          {filters.length > 0 && (
                            <span className="count-tag">{filters.length}</span>
                          )}
                        </Button>
                        <div className="popover-anchor">
                          <Button
                            icon={Columns3}
                            onClick={() => setColumnsOpen(!columnsOpen)}
                          >
                            Columns
                            <ChevronDown size={12} />
                          </Button>
                          {columnsOpen && (
                            <>
                              <button
                                className="popover-dismiss"
                                aria-label="Close column selection"
                                onClick={() => setColumnsOpen(false)}
                              />
                              <div className="columns-popover">
                                <strong>Visible columns</strong>
                                {data?.columns.map((c) => (
                                  <label key={c}>
                                    <input
                                      type="checkbox"
                                      checked={visible.includes(c)}
                                      onChange={(e) => {
                                        const next = e.target.checked
                                          ? [...visible, c]
                                          : visible.filter((n) => n !== c);
                                        if (next.length)
                                          setVisibleColumns(next);
                                      }}
                                    />
                                    {c}
                                  </label>
                                ))}
                                <button
                                  className="text-button"
                                  onClick={() => setVisibleColumns(null)}
                                >
                                  Show all columns
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="toolbar-right">
                        {selected.length > 0 ? (
                          <Button
                            icon={Trash2}
                            variant="danger-quiet"
                            onClick={deleteSelected}
                            disabled={!!busy}
                          >
                            Delete {selected.length}
                          </Button>
                        ) : (
                          <IconButton
                            icon={RefreshCw}
                            label="Refresh table"
                            onClick={() => setRefresh((n) => n + 1)}
                            disabled={!!busy}
                          />
                        )}
                        <Button
                          icon={Download}
                          variant="quiet export-csv"
                          onClick={() =>
                            csvDownload(
                              {
                                columns: visible,
                                rows: data.rows.map((r) =>
                                  colIndexes.map((i) => r[i]),
                                ),
                              },
                              `${table}-page.csv`,
                            )
                          }
                          disabled={!data?.rows.length}
                        >
                          CSV
                        </Button>
                        {object?.type === "table" && (
                          <Button
                            icon={Plus}
                            variant="primary"
                            onClick={openInsert}
                            disabled={!!busy}
                          >
                            Add row
                          </Button>
                        )}
                      </div>
                    </div>
                    {(search || filters.length > 0) && (
                      <div className="filter-strip">
                        <Filter size={12} />
                        <span>
                          {search ? `Search: “${search}”` : ""}
                          {filters
                            .map((f) => ` ${f.column} = ${display(f.value)}`)
                            .join(" · ")}
                        </span>
                        <button
                          className="text-button"
                          onClick={() => {
                            setFilters([]);
                            setSearch("");
                            setPage(0);
                          }}
                        >
                          Clear all <X size={12} />
                        </button>
                      </div>
                    )}
                    {!data ? (
                      <div className="table-loading">
                        <LoaderCircle size={22} className="spin" />
                        Loading rows…
                      </div>
                    ) : (
                      <DataGrid
                        disabled={!!busy}
                        columns={visible}
                        rows={data.rows.map((r) => colIndexes.map((i) => r[i]))}
                        keys={data.keys}
                        schema={object?.columns}
                        sort={sort}
                        onSort={(c) => {
                          setSort({
                            column: c,
                            direction:
                              sort.column === c && sort.direction === "ASC"
                                ? "DESC"
                                : "ASC",
                          });
                          setPage(0);
                        }}
                        selected={selected}
                        onSelect={data.editable ? setSelected : undefined}
                        onRow={(_, key, i) => editRow(data.rows[i], key, i)}
                      />
                    )}
                    <footer className="pagination">
                      <span>
                        {selected.length
                          ? `${selected.length} selected · `
                          : ""}
                        {data
                          ? Number(data.count)
                            ? `${data.page * data.pageSize + 1}–${Math.min((data.page + 1) * data.pageSize, Number(data.count))} of ${Number(data.count).toLocaleString()} rows`
                            : "0 rows"
                          : "Loading…"}
                      </span>
                      <div>
                        <label>
                          Rows per page{" "}
                          <select
                            aria-label="Rows per page"
                            value={pageSize}
                            onChange={(e) => {
                              setPageSize(Number(e.target.value));
                              setPage(0);
                            }}
                          >
                            {[25, 50, 100, 200].map((n) => (
                              <option key={n}>{n}</option>
                            ))}
                          </select>
                        </label>
                        <span className="page-label">
                          Page {(data?.page || 0) + 1} of{" "}
                          {Math.max(
                            1,
                            Math.ceil(Number(data?.count || 0) / pageSize),
                          )}
                        </span>
                        <IconButton
                          icon={ChevronLeft}
                          label="Previous page"
                          disabled={!data || data.page === 0}
                          onClick={() => setPage(data.page - 1)}
                        />
                        <IconButton
                          icon={ChevronRight}
                          label="Next page"
                          disabled={
                            !data ||
                            (data.page + 1) * pageSize >= Number(data.count)
                          }
                          onClick={() => setPage(data.page + 1)}
                        />
                      </div>
                    </footer>
                  </section>
                  <div className="view-tip">
                    <span>
                      <SquarePen size={13} /> Click a row to inspect or edit its
                      values.
                    </span>
                    <a
                      className="source-link"
                      href="https://github.com/strlns/very-serious-vibecoding/tree/main/squeaklite"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View source on GitHub <ExternalLink size={12} />
                    </a>
                  </div>
                </>
              ) : (
                <Empty title="This database is empty">
                  <Button icon={Plus} onClick={() => openSchema("table")}>
                    Add Table
                  </Button>{" "}
                  <Button onClick={() => navigate("schema")}>
                    Explore schema
                  </Button>
                </Empty>
              )
            ) : route.view === "structure" ? (
              <Structure
                object={object}
                onQuery={openSQL}
                onEdit={() => openSchema(object.type, object)}
                onDelete={() => openSchema(object.type, object, "drop")}
                onCreateIndex={() => openSchema("index")}
                onAddColumn={() =>
                  openSchema("table", object, "alter", {
                    initialOperation: "addColumn",
                  })
                }
                onColumn={(c, operation) =>
                  openSchema("table", object, "alter", {
                    initialOperation: operation,
                    initialColumn: c.name,
                  })
                }
                onIndex={(i, action) => {
                  const index = objects.find(
                    (o) => o.type === "index" && o.name === i.name,
                  );
                  if (index) openSchema("index", index, action);
                }}
              />
            ) : route.view === "query" ? (
              <Query
                key={queryContext}
                viewDefinition={
                  isView ? { name: object.name, select: viewSourceSql } : null
                }
                onEditView={() => openSchema("view", object)}
                table={table}
                objects={objects}
                sql={sql}
                setSql={setSql}
                run={runQuery}
                busy={!!busy}
                result={queryResult}
                error={queryError}
                onSave={saveQuery}
              />
            ) : (
              <Graph objects={objects} onTable={(t) => navigate("data", t)} />
            )}
          </div>
        </main>
        <footer className="statusbar">
          <div>
            <span className="status-dot" />
            {busy || `SQLite ${meta?.version || "…"}`}
            <span className="statusbar-divider" />
            <span>{tables.length} tables</span>
            <span>{views.length} views</span>
          </div>
          <div>
            {hasChanges ? (
              <>
                <span className="status-dot amber" />
                {storage?.state === "saved"
                  ? "Saved locally · export for backup"
                  : "Unsaved changes · Export to keep your work"}
              </>
            ) : (
              <>
                <ShieldCheck size={12} /> Everything stays on this device
              </>
            )}
            <span className="statusbar-divider" />
            <span>WebAssembly</span>
          </div>
        </footer>
      </div>
      {busy && (
        <div className="busy-indicator" role="status">
          <LoaderCircle size={16} className="spin" />
          {busy}
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
      {rowEditor && (
        <RowEditor
          error={error}
          editor={rowEditor}
          object={rowEditor.object}
          data={{ columns: rowEditor.columns, editable: rowEditor.editable }}
          busy={!!busy}
          onClose={() => setRowEditor(null)}
          onSave={saveRow}
          onRequestDelete={() => requestDeletion([], "row")}
          onRelated={(f) => {
            setRowEditor(null);
            const keys = object.foreignKeys
              .filter((k) => k.id === f.id)
              .sort((a, b) => Number(a.seq) - Number(b.seq));
            const target =
              objects
                .find((o) => o.name === f.table)
                ?.columns.filter((c) => Number(c.pk) > 0)
                .sort((a, b) => Number(a.pk) - Number(b.pk)) || [];
            const match = keys.map((k, i) => ({
              column: k.to || target[i]?.name,
              value: rowEditor.row[data.columns.indexOf(k.from)],
            }));
            navigate("data", f.table, workspace.active, match);
          }}
        />
      )}
      {modal?.type === "textDrafts" && (
        <Modal
          title="Save text drafts before exporting"
          subtitle="Text drafts are retained in this workspace but are not yet saved as file bytes."
          onClose={() => setModal(null)}
        >
          <div className="schema-review">
            <p>
              Save each edited text file in Workspace files to include it in the
              ZIP. You can also export the currently saved files and keep
              editing your drafts.
            </p>
          </div>
          <footer className="modal-footer">
            <Button
              onClick={() => {
                setModal(null);
                navigate("files");
              }}
            >
              Open text drafts
            </Button>
            <Button
              variant="primary"
              onClick={() => exportWorkspace(modal.databaseOnly, true)}
            >
              Export saved files only
            </Button>
          </footer>
        </Modal>
      )}
      {modal?.type === "databaseEdit" && (
        <DatabaseDialog
          {...modal}
          onBusyChange={setSchemaBusy}
          onClose={() => setModal({ type: "databases" })}
          onChanged={(w) => {
            setWorkspace(w);
            setRowEditor(null);
            setSelected([]);
            setQueryResult(null);
            setError("");
            setModal(null);
            navigate(
              "schema",
              w.meta.objects.find(
                (o) => o.type === "table" || o.type === "view",
              )?.name || "",
              w.active,
            );
            notify("Workspace updated · export to keep your changes");
          }}
        />
      )}
      {modal?.type === "schema" && (
        <SchemaDialog
          key={
            modal.databasePath +
            ":" +
            modal.kind +
            ":" +
            (modal.object?.name || "new")
          }
          {...modal}
          onBusyChange={setSchemaBusy}
          defaultTable={
            object?.type === "table" ? object.name : tables[0]?.name
          }
          objects={objects}
          onClose={() => setModal(null)}
          onChanged={schemaChanged}
        />
      )}
      {modal?.type === "import" && (
        <Modal
          title="Open a workspace"
          subtitle="Your files stay on this device, from import to export."
          onClose={() => setModal(null)}
        >
          {error && (
            <div className="error-banner form-error" role="alert">
              {error}
            </div>
          )}
          <div
            className="import-drop"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              importFiles(e.dataTransfer.files);
            }}
          >
            <span className="upload-illustration">
              <FolderArchive size={34} />
            </span>
            <h3>A fresh place to dig in.</h3>
            <p>
              Drop a ZIP or SQLite database here.
              <br />
              We’ll keep your folder structure and companion files.
            </p>
            <div className="flex center">
              <Button
                icon={Upload}
                variant="primary"
                onClick={() => fileRef.current.click()}
              >
                Choose files
              </Button>
              <Button
                icon={FolderOpen}
                onClick={() => folderRef.current.click()}
              >
                Choose folder
              </Button>
            </div>
            <small>.zip · .db · .sqlite · .sqlite3 · folders</small>
          </div>
          <div className="import-notes">
            <ShieldCheck size={18} />
            <p>
              SQLite runs in a background worker. Workspace imports are capped
              at 768 MiB expanded; practical limits depend on your device’s
              memory. Checkpoint WAL databases before importing.
            </p>
          </div>
          <footer className="modal-footer">
            <button className="text-button" onClick={showSample}>
              Explore sample database <ArrowUpRight size={13} />
            </button>
            <span className="muted small-text">No account. No upload.</span>
          </footer>
        </Modal>
      )}
      {modal?.type === "files" && (
        <Modal
          title="Workspace files"
          subtitle="All original files are included in the exported ZIP."
          onClose={() => setModal(null)}
        >
          <div className="file-list">
            {workspace?.files.map((f) => (
              <button
                key={f.path}
                className="workspace-file-link"
                onClick={() => {
                  setFilePath(f.path);
                  setModal(null);
                  navigate("files");
                }}
              >
                <File size={17} />
                <span>{f.path}</span>
                <small>{formatBytes(f.size)}</small>
              </button>
            ))}
          </div>
          <footer className="modal-footer">
            <Button
              icon={FolderOpen}
              onClick={() => {
                setModal(null);
                navigate("files");
              }}
            >
              Browse files
            </Button>
            <Button
              icon={Download}
              onClick={() => exportWorkspace(true)}
              disabled={!!busy}
            >
              Download active database
            </Button>
            <Button
              icon={Download}
              variant="primary"
              onClick={() => exportWorkspace(false)}
              disabled={!!busy}
            >
              Export ZIP
            </Button>
          </footer>
        </Modal>
      )}
      {modal?.type === "databases" && (
        <Modal
          title="Databases"
          subtitle="Select a database in this workspace."
          onClose={() => setModal(null)}
        >
          <div className="database-list">
            {workspace?.databases.map((d) => (
              <div className="database-manager-row" key={d.path}>
                <button
                  onClick={() =>
                    perform("Opening database…", async () => {
                      const m = await rpc("open", d.path);
                      setWorkspace((w) => ({ ...w, active: d.path, meta: m }));
                      navigate(
                        "data",
                        m.objects.find(
                          (o) => o.type === "table" || o.type === "view",
                        )?.name || "",
                        d.path,
                      );
                      setModal(null);
                    })
                  }
                >
                  <Database size={20} />
                  <span>
                    <strong>{d.path}</strong>
                    <small>
                      {formatBytes(d.size)}
                      {workspace.dirty.includes(d.path) ? " · Modified" : ""}
                    </small>
                  </span>
                  {d.path === workspace.active ? (
                    <Check size={17} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>
                <IconButton
                  icon={SquarePen}
                  label={`Rename database ${d.path}`}
                  onClick={() =>
                    setModal({
                      type: "databaseEdit",
                      action: "rename",
                      path: d.path,
                    })
                  }
                />
                <IconButton
                  icon={Trash2}
                  label={`Delete database ${d.path}`}
                  onClick={() =>
                    setModal({
                      type: "databaseEdit",
                      action: "drop",
                      path: d.path,
                    })
                  }
                />
              </div>
            ))}
          </div>
          <footer className="modal-footer">
            <Button
              icon={Plus}
              onClick={() =>
                setModal({ type: "databaseEdit", action: "create" })
              }
            >
              Add Database
            </Button>
            <Button icon={Upload} onClick={() => setModal({ type: "import" })}>
              Open another workspace
            </Button>
          </footer>
        </Modal>
      )}
      {modal?.type === "filter" && (
        <FilterModal
          columns={object?.columns || []}
          filters={filters}
          onClose={() => setModal(null)}
          onApply={(f) => {
            setFilters(f);
            setPage(0);
            setModal(null);
          }}
        />
      )}
      {modal?.type === "editQuery" && (
        <SavedQueryEditor
          item={modal.item}
          objects={objects}
          table={table}
          onClose={() => setModal(null)}
          onSave={(item) => {
            const next = saved.map((s) => (s === modal.item ? item : s));
            setSaved(next);
            try {
              localStorage.setItem("quarry-queries", JSON.stringify(next));
            } catch {
              notify(
                "Browser storage unavailable. Query changes last for this session.",
              );
            }
            setModal(null);
            notify("Saved query updated");
          }}
        />
      )}
      {modal?.type === "saveQuery" && (
        <SaveQueryModal
          onClose={() => setModal(null)}
          onSave={(name) => {
            const next = [...saved, { name, sql: modal.sql }];
            setSaved(next);
            try {
              localStorage.setItem("quarry-queries", JSON.stringify(next));
            } catch {
              notify(
                "Browser storage unavailable. Query changes last for this session.",
              );
            }
            setModal(null);
            notify("Query saved on this device");
          }}
        />
      )}
      {modal?.type === "history" && (
        <Modal
          title="Query history"
          subtitle="Queries run during this session."
          onClose={() => setModal(null)}
          wide
        >
          <div className="history-list">
            {history.length ? (
              history.map((h, i) => (
                <button
                  key={i}
                  onClick={() => {
                    openSQL(h.sql);
                    setModal(null);
                  }}
                >
                  <span>
                    <Clock3 size={13} />
                    {h.time} · {h.ms} ms
                  </span>
                  <pre>{h.sql}</pre>
                  <span className="text-button">
                    Open in editor <ArrowUpRight size={12} />
                  </span>
                </button>
              ))
            ) : (
              <Empty title="A clean slate">
                Run a query to start your session history.
              </Empty>
            )}
          </div>
        </Modal>
      )}
      {modal?.type === "help" && (
        <Modal
          title="A little guide to Squeaklite"
          subtitle="Your database. Your device. Your workspace."
          onClose={() => setModal(null)}
          wide
        >
          <div className="help-content">
            <div>
              <span>01</span>
              <h3>Bring your workspace</h3>
              <p>
                Import one or more SQLite databases, a ZIP, or a folder. Switch
                databases by clicking the database name in the sidebar.
                Companion files and paths are preserved.
              </p>
            </div>
            <div>
              <span>02</span>
              <h3>Follow your curiosity</h3>
              <p>
                Browse and search paginated rows, inspect schemas and indexes,
                or follow foreign key relationships. Click a row to open its
                form. Use the SQL editor or visual builder for deeper questions.
              </p>
            </div>
            <div>
              <span>03</span>
              <h3>Take your work with you</h3>
              <p>
                Where available, autosave keeps the workspace in this browser.
                Check the storage status; export ZIPs for backups. Unsaved text
                drafts and open SQL transactions are not autosaved. For a single
                database, use Workspace files → Download active database. Saved
                query text remains in this browser.
              </p>
            </div>
            <div className="help-details">
              <h3>Keyboard shortcuts</h3>
              <table className="shortcut-guide">
                <tbody>
                  <tr>
                    <th>
                      <kbd>{shortcut.run}</kbd>
                    </th>
                    <td>
                      Open the query workspace; press again to run the current
                      SQL or visual query.
                    </td>
                  </tr>
                  <tr>
                    <th>
                      <kbd>/</kbd>
                    </th>
                    <td>
                      Focus table search when you are not typing in a field.
                    </td>
                  </tr>
                  <tr>
                    <th>
                      <kbd>?</kbd>
                    </th>
                    <td>Open this guide when you are not typing in a field.</td>
                  </tr>
                  <tr>
                    <th>
                      <kbd>Escape</kbd>
                    </th>
                    <td>Close a dialog or leave graph fullscreen.</td>
                  </tr>
                  <tr>
                    <th>
                      <kbd>↓ / Tab</kbd>
                    </th>
                    <td>
                      In SQL editors, request suggestions with Arrow Down and
                      accept with Tab. Keywords suggest automatically after one
                      letter.
                    </td>
                  </tr>
                  <tr>
                    <th>
                      <kbd>↑ ↓ ← →</kbd>
                    </th>
                    <td>
                      Pan the focused graph viewport. Use + / − to zoom and 0 to
                      fit.
                    </td>
                  </tr>
                </tbody>
              </table>
              <p>
                Shortcuts pause while a dialog is open. Query execution requires
                a nonempty, valid query. Browser and system shortcuts keep their
                usual behavior.
              </p>
              <h3>Good to know</h3>
              <p>
                Use Ctrl / ⌘ + Enter to run SQL. Results are capped at 1,000
                rows per statement and share a size budget. Data-changing SQL
                requires confirmation. Query result graphs have bounded
                nodes/links and support read-only inspection. SQL statements
                execute in order; earlier statements can succeed if a later one
                fails. Use explicit transactions for atomic scripts. Row edits
                use primary keys or rowid; views are read-only in forms. Large
                databases and ZIP exports require enough available memory.
                Workers keep the UI responsive but do not remove these memory
                limits. Extension loading and encrypted databases are not
                supported.
              </p>
              <p>
                Serve the built static files over HTTP(S), including the local
                worker and WebAssembly assets. No database backend or Node APIs
                are used by the app.
              </p>
            </div>
          </div>
          <footer className="modal-footer">
            <Button onClick={showSample} icon={Database}>
              Load sample workspace
            </Button>
            <Button variant="primary" onClick={() => setModal(null)}>
              Got it
            </Button>
          </footer>
        </Modal>
      )}
      {modal?.type === "deleteRows" && (
        <DeleteDialog
          plan={modal.plan}
          error={error}
          busy={!!busy}
          onClose={() => setModal(null)}
          onConfirm={confirmDeletion}
          onReview={reviewDeletion}
          onOpenRelated={(t) => {
            setModal(null);
            setRowEditor(null);
            navigate("data", t);
          }}
        />
      )}
      {modal?.type === "deleteSaved" && (
        <Modal
          title="Delete saved query?"
          subtitle={modal.item.name}
          onClose={() => setModal(null)}
        >
          <div className="delete-review">
            <p>This removes the saved query text from this browser.</p>
          </div>
          <footer className="modal-footer">
            <Button onClick={() => setModal(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                const next = saved.filter((s) => s !== modal.item);
                setSaved(next);
                try {
                  localStorage.setItem("quarry-queries", JSON.stringify(next));
                } catch {
                  notify(
                    "Browser storage unavailable. Query changes last for this session.",
                  );
                }
                setModal(null);
              }}
            >
              Delete saved query
            </Button>
          </footer>
        </Modal>
      )}
      {modal?.type === "sqlConfirm" && (
        <Modal
          title="Review SQL execution"
          subtitle="This script may change data, schema or database state. Earlier statements can succeed if a later one fails."
          onClose={() => setModal(null)}
          wide
        >
          <pre className="definition-code sql-confirm-code">{modal.sql}</pre>
          <footer className="modal-footer">
            <Button onClick={() => setModal(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                const snapshot = modal;
                setModal(null);
                perform("Running query…", () =>
                  executeQuery(snapshot.sql, {
                    ...snapshot.review,
                    confirmed: true,
                  }),
                );
              }}
            >
              Confirm and run
            </Button>
          </footer>
        </Modal>
      )}
      {modal?.type === "replace" && (
        <Modal
          title="Replace this workspace?"
          subtitle="There are changes or text drafts in memory. Save drafts and export before opening another workspace."
          onClose={() => setModal(null)}
        >
          <footer className="modal-footer">
            <Button onClick={() => setModal(null)}>Cancel</Button>
            <Button icon={Download} onClick={() => exportWorkspace(false)}>
              Export ZIP
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const action = modal.action;
                setModal(null);
                action();
              }}
            >
              Replace workspace
            </Button>
          </footer>
        </Modal>
      )}
    </div>
  );
}
function Structure({
  object,
  onQuery,
  onEdit,
  onDelete,
  onCreateIndex,
  onAddColumn,
  onColumn,
  onIndex,
}) {
  if (!object) return <Empty title="No table selected" />;
  const notNull = (c) =>
    Number(c.notnull) > 0 ||
    (Number(c.pk) > 0 &&
      (object.withoutRowid ||
        (object.columns.filter((x) => Number(x.pk) > 0).length === 1 &&
          c.type.toUpperCase() === "INTEGER" &&
          !object.indexes.some((i) => i.origin === "pk"))));
  return (
    <div className="structure-view">
      <div className="structure-actions">
        <Button icon={SquarePen} onClick={onEdit}>
          Edit {object.type}
        </Button>
        <Button
          icon={Plus}
          onClick={onCreateIndex}
          disabled={object.type !== "table"}
        >
          Add Index
        </Button>
        <Button icon={Trash2} variant="danger-quiet" onClick={onDelete}>
          Delete {object.type}
        </Button>
      </div>
      <section className="schema-panel">
        <div className="panel-bar">
          <div className="flex">
            <strong>Columns</strong>
            <span className="count-tag">{object.columns.length}</span>
          </div>
          {object.type === "table" && (
            <Button icon={Plus} variant="quiet small" onClick={onAddColumn}>
              Add column
            </Button>
          )}
          <Button
            icon={Code2}
            variant="quiet small"
            onClick={() =>
              onQuery(`PRAGMA table_xinfo(${ident(object.name)});`)
            }
          >
            Inspect with SQL
          </Button>
        </div>
        <TableViewport label="Table schema">
          <table className="schema-grid">
            <thead>
              <tr>
                <th>Column</th>
                <th>Type</th>
                <th>Nullable</th>
                <th>Default value</th>
                <th>Constraints</th>
                {object.type === "table" && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {object.columns.map((c) => (
                <tr key={c.name}>
                  <td>
                    <span className="flex">
                      {Number(c.pk) > 0 ? (
                        <KeyRound size={14} className="key-color" />
                      ) : (
                        <Columns3 size={14} />
                      )}
                      <strong>{c.name}</strong>
                    </span>
                  </td>
                  <td>
                    <code className="type-tag">{c.type || "ANY"}</code>
                  </td>
                  <td>
                    {notNull(c) ? (
                      <span className="muted">Not null</span>
                    ) : (
                      "Nullable"
                    )}
                  </td>
                  <td>
                    <code className={c.dflt_value == null ? "null" : ""}>
                      {c.dflt_value ?? "NULL"}
                    </code>
                  </td>
                  <td>
                    <span className="flex">
                      {Number(c.pk) > 0 && (
                        <span className="constraint">
                          Primary key {Number(c.pk) > 1 ? c.pk : ""}
                        </span>
                      )}
                      {object.foreignKeys.some((f) => f.from === c.name) && (
                        <span className="constraint foreign">Foreign key</span>
                      )}
                      {Number(c.hidden) > 0 && (
                        <span className="constraint">Generated</span>
                      )}
                    </span>
                  </td>
                  {object.type === "table" && (
                    <td>
                      <span className="schema-row-actions">
                        <IconButton
                          icon={SquarePen}
                          label={`Edit column ${c.name}`}
                          onClick={() => onColumn(c, "renameColumn")}
                        />
                        <IconButton
                          icon={Trash2}
                          label={`Delete column ${c.name}`}
                          onClick={() => onColumn(c, "dropColumn")}
                        />
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </TableViewport>
      </section>
      <div className="schema-bottom">
        <section className="schema-panel">
          <div className="panel-bar">
            <strong>Indexes</strong>
            <span className="count-tag">{object.indexes.length}</span>
          </div>
          {object.indexes.length ? (
            <div className="index-list">
              {object.indexes.map((i) => (
                <div key={i.name}>
                  <KeyRound size={15} />
                  <code>{i.name}</code>
                  <span className="type-tag">
                    {Number(i.unique) ? "UNIQUE" : "INDEX"}
                  </span>
                  {i.origin === "c" && (
                    <span className="schema-row-actions">
                      <IconButton
                        icon={SquarePen}
                        label={`Edit index ${i.name}`}
                        onClick={() => onIndex(i)}
                      />
                      <IconButton
                        icon={Trash2}
                        label={`Delete index ${i.name}`}
                        onClick={() => onIndex(i, "drop")}
                      />
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="panel-empty">No indexes defined.</p>
          )}
        </section>
        <section className="schema-panel">
          <div className="panel-bar">
            <strong>Foreign keys</strong>
            <span className="count-tag">{object.foreignKeys.length}</span>
          </div>
          {object.foreignKeys.length ? (
            <div className="index-list">
              {object.foreignKeys.map((f, i) => (
                <div key={i}>
                  <Link2 size={15} />
                  <code>
                    {f.from} → {f.table}.{f.to || "primary key"}
                  </code>
                </div>
              ))}
            </div>
          ) : (
            <p className="panel-empty">This table has no foreign keys.</p>
          )}
        </section>
      </div>
      <section className="schema-panel">
        <div className="panel-bar">
          <strong>
            {object.type === "view" ? "View definition" : "Table definition"}
          </strong>
          <Button
            icon={Code2}
            variant="quiet small"
            onClick={() => onQuery(object.sql + ";")}
          >
            Open in editor
          </Button>
        </div>
        <pre className="definition-code">{object.sql};</pre>
      </section>
    </div>
  );
}
export function RowEditor({
  editor,
  object,
  data,
  onSave,
  onClose,
  busy,
  onRelated,
  onRequestDelete,
  error,
}) {
  const insert = editor.action === "insert",
    readOnly = object.type === "view" || (!insert && !data?.editable);
  const cols = object.columns.filter((c) => Number(c.hidden) !== 1);
  const initial = Object.fromEntries(
    cols.map((c) => {
      const v = editor.row?.[data?.columns.indexOf(c.name)];
      return [
        c.name,
        {
          value: v == null ? "" : display(v),
          null: v === null,
          useDefault: insert,
          original: v,
        },
      ];
    }),
  );
  const [fields, setFields] = useState(initial),
    [localError, setLocalError] = useState("");
  const update = (name, patch) =>
    setFields((f) => ({ ...f, [name]: { ...f[name], ...patch } }));
  const submit = (e) => {
    e.preventDefault();
    setLocalError("");
    const values = {};
    for (const c of cols) {
      const f = fields[c.name];
      if (
        Number(c.hidden) > 0 ||
        f.original instanceof Uint8Array ||
        f.original?.__quarryBlob ||
        (insert && f.useDefault)
      )
        continue;
      if (
        !insert &&
        f.value === initial[c.name].value &&
        f.null === initial[c.name].null
      )
        continue;
      if (f.null) values[c.name] = null;
      else if (/INT/i.test(c.type) && /^-?\d+$/.test(f.value)) {
        const b = BigInt(f.value);
        values[c.name] =
          b <= BigInt(Number.MAX_SAFE_INTEGER) &&
          b >= BigInt(Number.MIN_SAFE_INTEGER)
            ? Number(f.value)
            : f.value;
      } else if (
        /REAL|FLOAT|DOUBLE|NUMERIC|DECIMAL/i.test(c.type) &&
        f.value.trim() !== "" &&
        Number.isFinite(Number(f.value))
      )
        values[c.name] = Number(f.value);
      else values[c.name] = f.value;
    }
    onSave(values);
  };
  return (
    <Modal
      title={insert ? "Add a row" : readOnly ? "Inspect row" : "Edit row"}
      subtitle={`${object.name} · ${
        insert
          ? "Defaults are used for untouched fields"
          : Object.entries(editor.key || {})
              .map(([k, v]) => `${k}: ${display(v)}`)
              .join(" · ") || "Read-only view"
      }`}
      onClose={onClose}
      dismissible={!busy}
    >
      <form onSubmit={submit}>
        <div className="row-form">
          {cols.map((c) => {
            const f = fields[c.name],
              fk = object.foreignKeys.find((k) => k.from === c.name),
              disabled =
                busy ||
                readOnly ||
                Number(c.hidden) > 0 ||
                f.original instanceof Uint8Array ||
                f.original?.__quarryBlob;
            return (
              <div className="form-field" key={c.name}>
                <div className="form-field-heading">
                  <label htmlFor={`field-${c.name}`}>
                    {Number(c.pk) > 0 && <KeyRound size={12} />} {c.name}{" "}
                    <small>{c.type.toLowerCase()}</small>
                  </label>
                  <div>
                    {insert && (
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={f.useDefault}
                          disabled={disabled}
                          onChange={(e) =>
                            update(c.name, { useDefault: e.target.checked })
                          }
                        />
                        Default
                      </label>
                    )}
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={f.null}
                        disabled={disabled}
                        onChange={(e) =>
                          update(c.name, {
                            null: e.target.checked,
                            useDefault: false,
                          })
                        }
                      />
                      NULL
                    </label>
                  </div>
                </div>
                <input
                  id={`field-${c.name}`}
                  disabled={disabled || (f.null && !f.useDefault)}
                  placeholder={
                    insert
                      ? c.dflt_value != null
                        ? `Default: ${c.dflt_value}`
                        : "Leave untouched for default / NULL"
                      : f.null
                        ? "NULL"
                        : ""
                  }
                  value={f.value}
                  onChange={(e) =>
                    update(c.name, {
                      value: e.target.value,
                      useDefault: false,
                      null: false,
                    })
                  }
                />
                {fk &&
                  f.original != null &&
                  !insert &&
                  !(
                    f.original instanceof Uint8Array || f.original?.__quarryBlob
                  ) && (
                    <button
                      type="button"
                      className="text-button relation-link"
                      onClick={() => onRelated(fk, f.original)}
                    >
                      <Link2 size={12} />
                      View in {fk.table} <ArrowUpRight size={12} />
                    </button>
                  )}
                {Number(c.hidden) > 0 && (
                  <small className="muted">Generated by SQLite</small>
                )}
                {(f.original instanceof Uint8Array ||
                  f.original?.__quarryBlob) && (
                  <small className="muted">
                    BLOB values are preserved. Use SQL to modify binary data.
                  </small>
                )}
              </div>
            );
          })}
          {insert && (
            <p className="form-note">
              Untouched fields use SQLite defaults. Clear “Default” to enter an
              empty string, or check NULL explicitly. Required fields must have
              a value.
            </p>
          )}
          {error && (
            <div className="error-banner form-error" role="alert">
              {error}
            </div>
          )}
          {localError && <p className="error-text">{localError}</p>}
        </div>
        <footer className="modal-footer">
          {!insert && !readOnly ? (
            <Button
              icon={Trash2}
              variant="danger-quiet"
              type="button"
              onClick={onRequestDelete}
              disabled={busy}
            >
              Delete row
            </Button>
          ) : (
            <span />
          )}
          <div className="flex">
            <Button type="button" disabled={busy} onClick={onClose}>
              {readOnly ? "Close" : "Cancel"}
            </Button>
            {!readOnly && (
              <Button
                icon={Check}
                variant="primary"
                type="submit"
                disabled={busy}
              >
                {insert ? "Add row" : "Save changes"}
              </Button>
            )}
          </div>
        </footer>
      </form>
    </Modal>
  );
}
function FilterModal({ columns, filters, onApply, onClose }) {
  const [col, setCol] = useState(filters[0]?.column || columns[0]?.name || ""),
    [value, setValue] = useState(
      filters[0]?.value == null ? "" : String(filters[0].value),
    ),
    [isNull, setIsNull] = useState(filters[0]?.value === null);
  return (
    <Modal
      title="Filter rows"
      subtitle="Match an exact value. Use the visual query builder for advanced conditions."
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onApply([{ column: col, value: isNull ? null : value }]);
        }}
      >
        <div className="filter-form">
          <label>
            Column
            <select value={col} onChange={(e) => setCol(e.target.value)}>
              {columns.map((c) => (
                <option key={c.name}>{c.name}</option>
              ))}
            </select>
          </label>
          <label>
            Equals
            <input
              placeholder="Enter a value…"
              value={value}
              disabled={isNull}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={isNull}
              onChange={(e) => setIsNull(e.target.checked)}
            />
            Match NULL values
          </label>
        </div>
        <footer className="modal-footer">
          <Button type="button" onClick={() => onApply([])}>
            Clear filters
          </Button>
          <Button variant="primary" type="submit">
            Apply filter
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
function SaveQueryModal({ onSave, onClose }) {
  const [name, setName] = useState("");
  return (
    <Modal
      title="Save query"
      subtitle="Saved query text is stored in this browser."
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onSave(name.trim());
        }}
      >
        <div className="filter-form">
          <label>
            Query name
            <input
              autoFocus
              required
              maxLength={80}
              placeholder="e.g. Customers by country"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        </div>
        <footer className="modal-footer">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={!name.trim()}>
            Save query
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

function SavedQueryEditor({ item, objects, table, onClose, onSave }) {
  const [name, setName] = useState(item.name),
    [text, setText] = useState(item.sql);
  return (
    <Modal title="Edit saved query" onClose={onClose} wide>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim() && text.trim())
            onSave({ name: name.trim(), sql: text });
        }}
      >
        <div className="schema-edit-fields">
          <label>
            Query name
            <input
              value={name}
              required
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <SqlEditor
            value={text}
            onChange={setText}
            objects={objects}
            table={table}
            label="Saved query editor"
          />
        </div>
        <footer className="modal-footer">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!name.trim() || !text.trim()}
          >
            Save query changes
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
