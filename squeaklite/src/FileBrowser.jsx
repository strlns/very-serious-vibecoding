import React, { useEffect, useRef, useState } from "react";
import {
  FileText,
  Database,
  File,
  FolderOpen,
  Plus,
  SquarePen,
  Trash2,
  RefreshCw,
  Check,
  Search,
} from "lucide-react";
import { rpc } from "./client.ts";
import { Button, IconButton, Empty, Modal, formatBytes } from "./ui.jsx";
export default function FileBrowser({
  workspace,
  path,
  onSelect,
  drafts,
  setDrafts,
  onChanged,
  onOpenDatabase,
  onBusyChange,
}) {
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(0),
    [info, setInfo] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [saving, setSaving] = useState(false),
    [editing, setEditing] = useState(false),
    [action, setAction] = useState(null),
    [reload, setReload] = useState(0);
  const version = useRef(0),
    mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );
  useEffect(() => {
    onBusyChange?.(saving);
    return () => onBusyChange?.(false);
  }, [saving, onBusyChange]);
  const files = workspace.files,
    dbs = new Set(workspace.databases.map((d) => d.path)),
    filtered = files.filter((f) =>
      f.path.toLowerCase().includes(search.toLowerCase()),
    ),
    pages = Math.max(1, Math.ceil(filtered.length / 200)),
    currentPage = Math.min(page, pages - 1);
  useEffect(() => {
    if (!files.some((f) => f.path === path))
      onSelect(
        files.find((f) => !dbs.has(f.path) && !f.path.endsWith("/"))?.path ||
          files[0]?.path ||
          "",
      );
  }, [files, path]);
  useEffect(() => {
    const id = ++version.current;
    setError("");
    setInfo(null);
    setEditing(!!drafts[path]);
    if (!path) return;
    setLoading(true);
    rpc("readFile", { path })
      .then((r) => {
        if (version.current === id) setInfo(r);
      })
      .catch((e) => {
        if (version.current === id) setError(e.message);
      })
      .finally(() => {
        if (version.current === id) setLoading(false);
      });
    return () => {
      version.current++;
    };
  }, [path, workspace.workspaceId, reload]);
  const draft = drafts[path],
    text = draft?.text ?? info?.text ?? "",
    dirty = info?.kind === "text" && text !== info.text;
  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const r = await rpc("saveText", {
        path,
        text,
        token: draft?.token || info.token,
      });
      if (!mounted.current) return;
      setInfo(r);
      setDrafts((d) => {
        const next = { ...d };
        delete next[path];
        return next;
      });
      await onChanged();
    } catch (e) {
      if (mounted.current) setError(e.message);
    } finally {
      if (mounted.current) setSaving(false);
    }
  };
  const discard = () => {
    setDrafts((d) => {
      const next = { ...d };
      delete next[path];
      return next;
    });
    setReload((n) => n + 1);
  };
  const applied = async (result) => {
    setAction(null);
    setDrafts((d) => {
      const next = { ...d };
      delete next[path];
      return next;
    });
    await onChanged(result.workspace);
    onSelect(result.path);
    setReload((n) => n + 1);
    setEditing(false);
  };
  return (
    <section className="workspace-file-browser">
      <div className="panel-bar">
        <div>
          <strong>Workspace files</strong>
          <p className="muted small-text">
            {files.length} files and directory entries · paths preserved in ZIP
          </p>
        </div>
        <Button
          icon={Plus}
          variant="primary"
          onClick={() => setAction({ action: "create" })}
        >
          Add Text File
        </Button>
      </div>
      <div className="schema-search">
        <Search size={15} />
        <input
          aria-label="Search workspace files"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Find a path or filename…"
        />
      </div>
      <div className="file-browser-columns">
        <div className="workspace-file-list" aria-label="Workspace file list">
          {filtered
            .slice(currentPage * 200, currentPage * 200 + 200)
            .map((f) => {
              const Icon = dbs.has(f.path)
                ? Database
                : f.path.endsWith("/")
                  ? FolderOpen
                  : FileText;
              return (
                <button
                  key={f.path}
                  className={path === f.path ? "active" : ""}
                  onClick={() => onSelect(f.path)}
                  disabled={saving}
                >
                  <Icon size={16} />
                  <span>
                    <strong>{f.path}</strong>
                    <small>
                      {formatBytes(f.size)}
                      {drafts[f.path]
                        ? " · draft"
                        : workspace.dirty.includes(f.path)
                          ? " · modified"
                          : ""}
                    </small>
                  </span>
                </button>
              );
            })}
          {!filtered.length && <Empty title="No matching files" />}
          {pages > 1 && (
            <div className="file-list-paging">
              <Button
                disabled={currentPage === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span>
                {currentPage + 1} / {pages}
              </span>
              <Button
                disabled={currentPage === pages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
        <div className="workspace-file-detail">
          {loading ? (
            <p className="muted small-text">Reading file preview…</p>
          ) : info ? (
            <>
              <div className="schema-detail-heading">
                <div>
                  <span className="type-tag">
                    {info.kind === "text"
                      ? info.encoding
                      : info.kind.toUpperCase()}
                  </span>
                  <h2>{path.split("/").pop()}</h2>
                  <p className="muted small-text">
                    {path} · {formatBytes(info.size)}
                  </p>
                </div>
                <div className="flex">
                  {info.kind === "text" && !info.truncated && (
                    <Button
                      icon={SquarePen}
                      onClick={() => setEditing((v) => !v)}
                      disabled={saving}
                    >
                      {editing ? "Read view" : "Edit text"}
                    </Button>
                  )}
                  {!["database", "directory"].includes(info.kind) && (
                    <>
                      <IconButton
                        icon={SquarePen}
                        label="Rename file"
                        disabled={saving || dirty}
                        onClick={() => setAction({ action: "rename", path })}
                      />
                      <IconButton
                        icon={Trash2}
                        label="Delete file"
                        disabled={saving}
                        onClick={() => setAction({ action: "drop", path })}
                      />
                    </>
                  )}
                </div>
              </div>
              {info.kind === "database" ? (
                <Empty title="SQLite database">
                  Open it in the database explorer.{" "}
                  <Button
                    icon={Database}
                    variant="primary"
                    onClick={() => onOpenDatabase(path)}
                  >
                    Open database
                  </Button>
                </Empty>
              ) : info.kind === "text" ? (
                <>
                  {info.truncated && (
                    <p className="result-notice">
                      Preview of the first 256 KiB. This large file stays
                      read-only and is preserved in full in your ZIP.
                    </p>
                  )}
                  {editing && !info.truncated ? (
                    <>
                      <textarea
                        className="companion-editor"
                        aria-label="Text file content"
                        spellCheck={false}
                        disabled={saving}
                        value={text}
                        onChange={(e) =>
                          setDrafts((d) => ({
                            ...d,
                            [path]: {
                              text: e.target.value,
                              token: d[path]?.token || info.token,
                            },
                          }))
                        }
                      />
                      <div className="file-editor-actions">
                        <span className="muted small-text">
                          {dirty
                            ? "Unsaved draft · retained while navigating this workspace"
                            : "Text is saved in this workspace"}
                        </span>
                        <Button
                          onClick={() => setAction({ action: "discard" })}
                          disabled={!draft || saving}
                        >
                          Discard draft
                        </Button>
                        <Button
                          icon={Check}
                          variant="primary"
                          onClick={save}
                          disabled={!dirty || saving}
                        >
                          {saving ? "Saving…" : "Save text"}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <pre
                      className="companion-preview"
                      tabIndex={0}
                      aria-label="Text file preview"
                    >
                      {text || "(empty text file)"}
                    </pre>
                  )}
                  <p className="schema-footnote">
                    Text is displayed as text, including HTML and scripts. Edits
                    preserve UTF-8/UTF-16 encoding and byte-order marks. Export
                    the ZIP to keep your saved changes.
                  </p>
                </>
              ) : (
                <Empty
                  title={
                    info.kind === "directory"
                      ? "Directory entry"
                      : "Binary file"
                  }
                >
                  {info.kind === "directory"
                    ? "This directory entry is preserved when exporting."
                    : "No text preview is available. Binary or unsupported-encoding bytes are preserved unchanged in your ZIP."}
                </Empty>
              )}
            </>
          ) : (
            <Empty title="Choose a workspace file">
              SQLite databases, companion text files and original folder paths
              stay together.
            </Empty>
          )}
          {error && (
            <div className="error-banner" role="alert">
              {error}
              {draft && (
                <Button
                  icon={RefreshCw}
                  variant="quiet small"
                  onClick={() => {
                    setReload((n) => n + 1);
                    setAction({ action: "rebase" });
                  }}
                >
                  Review current file
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      {action?.action === "rebase" ? (
        <Modal
          title="Review saved file before applying your draft"
          subtitle={path}
          onClose={() => setAction(null)}
          wide
        >
          <div className="schema-review">
            <p>
              The workspace changed since this draft began. The current saved
              text is shown below. Your draft is retained separately.
            </p>
            <pre className="companion-preview">
              {info?.text || "(empty file)"}
            </pre>
          </div>
          <footer className="modal-footer">
            <Button onClick={() => setAction(null)}>Cancel</Button>
            <Button
              disabled={loading || info?.kind !== "text" || info?.truncated}
              variant="primary"
              onClick={() => {
                setDrafts((d) => ({
                  ...d,
                  [path]: { ...d[path], token: info.token },
                }));
                setError("");
                setAction(null);
              }}
            >
              Keep draft for reviewed version
            </Button>
          </footer>
        </Modal>
      ) : action?.action === "discard" ? (
        <Modal
          title="Discard text draft?"
          subtitle={path}
          onClose={() => setAction(null)}
        >
          <div className="schema-review">
            <p>Return to the file bytes currently saved in this workspace.</p>
          </div>
          <footer className="modal-footer">
            <Button onClick={() => setAction(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                discard();
                setAction(null);
              }}
            >
              Discard draft
            </Button>
          </footer>
        </Modal>
      ) : (
        action && (
          <FileActionDialog
            {...action}
            onClose={() => setAction(null)}
            onChanged={applied}
            onBusyChange={onBusyChange}
          />
        )
      )}
    </section>
  );
}
function FileActionDialog({
  action,
  path = "",
  onClose,
  onChanged,
  onBusyChange,
}) {
  const [name, setName] = useState(action === "create" ? "notes.txt" : path),
    [text, setText] = useState(""),
    [plan, setPlan] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
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
    setBusy(true);
    setError("");
    try {
      const p = await rpc("fileReview", { action, path, newPath: name, text });
      if (mounted.current) setPlan(p);
    } catch (e) {
      if (mounted.current) setError(e.message);
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  const apply = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await rpc("fileApply", { ...plan, confirmed: true });
      if (mounted.current) await onChanged(r);
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
          ? "Add Text File"
          : action === "rename"
            ? "Rename file"
            : "Delete file?"
      }
      subtitle={path || "Create a companion file inside the workspace ZIP."}
      onClose={onClose}
      dismissible={!busy}
      wide
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
                ? `Remove ${path} and any text draft from the next ZIP export?`
                : action === "rename"
                  ? `${path} → ${name}`
                  : `Create ${name}?`}
            </p>
            <p className="small-text muted">
              Original files on your device are untouched.
            </p>
          </div>
          <footer className="modal-footer">
            <Button disabled={busy} onClick={() => setPlan(null)}>
              Back
            </Button>
            <Button
              disabled={busy}
              variant={action === "drop" ? "danger" : "primary"}
              onClick={apply}
            >
              {action === "drop" ? "Confirm deletion" : "Confirm file change"}
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
              <p>Review removal of this companion file.</p>
            ) : (
              <label>
                File path
                <input
                  autoFocus
                  required
                  maxLength={512}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            )}
            {action === "create" && (
              <label>
                Text content
                <textarea
                  className="companion-editor"
                  aria-label="New text content"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  spellCheck={false}
                />
              </label>
            )}
          </fieldset>
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
