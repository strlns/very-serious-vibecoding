import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  X,
  Search,
  ChevronDown,
  Check,
  ArrowUpDown,
  ChevronUp,
  ArrowDown,
  KeyRound,
  Link2,
  Database,
  Inbox,
} from "lucide-react";
import { display } from "./sql.ts";
import TableViewport from "./TableViewport.jsx";
export function Button({
  children,
  icon: Icon,
  variant = "",
  className = "",
  ...props
}) {
  return (
    <button
      type="button"
      className={`button ${variant} ${className}`}
      {...props}
    >
      {Icon && <Icon size={15} />} {children}
    </button>
  );
}
export function IconButton({ icon: Icon, label, ...props }) {
  return (
    <button
      type="button"
      className="icon-button"
      title={label}
      aria-label={label}
      {...props}
    >
      <Icon size={17} />
    </button>
  );
}
export function Badge({ children, color = "" }) {
  return (
    <span className={`badge ${color}`}>
      <span />
      {children}
    </span>
  );
}
export function Empty({ title = "No rows found", children }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Inbox size={24} />
      </span>
      <h3>{title}</h3>
      <p>{children || "Try another search or add a row to get started."}</p>
    </div>
  );
}
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
  dismissible = true,
}) {
  const ref = useRef(),
    config = useRef();
  config.current = { onClose, dismissible };
  useEffect(() => {
    const prior = document.activeElement,
      previous = [...document.querySelectorAll("[role=dialog]")]
        .filter((el) => el !== ref.current)
        .at(-1),
      wasInert = previous?.inert;
    if (previous) previous.inert = true;
    ref.current?.focus();
    const onKey = (e) => {
      if (
        [...document.querySelectorAll("[role=dialog]")].at(-1) !== ref.current
      )
        return;
      if (e.key === "Escape" && config.current.dismissible) {
        e.preventDefault();
        config.current.onClose();
      }
      if (e.key === "Tab") {
        const elements = [
          ...ref.current.querySelectorAll(
            'button,a[href],input,textarea,select,[tabindex="0"]',
          ),
          ...document.querySelectorAll(".global-error button"),
        ].filter((n) => !n.disabled && !n.closest("[inert]"));
        const first = elements[0],
          last = elements.at(-1);
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (previous) previous.inert = wasInert;
      if (prior?.isConnected) prior.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && dismissible) onClose();
      }}
    >
      <section
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <header>
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <IconButton
            icon={X}
            label="Close dialog"
            disabled={!dismissible}
            onClick={onClose}
          />
        </header>
        {children}
      </section>
    </div>
  );
}
export function DataGrid({
  columns = [],
  rows = [],
  onRow,
  sort,
  onSort,
  selected = [],
  onSelect,
  keys = [],
  schema = [],
  compact = false,
  disabled = false,
  highlightedKey = null,
}) {
  const [viewport, setViewport] = useState({ top: 0, height: 450 });
  const onViewport = useCallback(
    (next) =>
      setViewport((v) =>
        v.top === next.top && v.height === next.height ? v : next,
      ),
    [],
  );
  const virtual = compact && rows.length > 100,
    start = virtual
      ? Math.min(
          Math.max(0, rows.length - 1),
          Math.max(0, Math.floor((viewport.top - 41) / 40) - 8),
        )
      : 0,
    end = virtual
      ? Math.min(
          rows.length,
          start + Math.min(60, Math.ceil(viewport.height / 40) + 17),
        )
      : rows.length,
    span = columns.length + (onSelect ? 1 : 0) + (onRow ? 1 : 0);
  if (!rows.length) return <Empty />;
  return (
    <TableViewport
      compact={compact}
      label="Table rows"
      onViewportChange={onViewport}
      resetKey={compact ? rows : undefined}
    >
      <table className="data-grid" aria-rowcount={rows.length + 1}>
        <thead>
          <tr>
            {onSelect && (
              <th className="select-cell">
                <input
                  aria-label="Select all rows on this page"
                  type="checkbox"
                  disabled={disabled}
                  checked={rows.length > 0 && selected.length === rows.length}
                  onChange={(e) =>
                    onSelect(e.target.checked ? rows.map((_, i) => i) : [])
                  }
                />
              </th>
            )}
            {columns.map((c, i) => {
              const info = schema.find((x) => x.name === c);
              return (
                <th key={i}>
                  <button
                    className="column-heading"
                    onClick={() => onSort?.(c)}
                    disabled={!onSort || disabled}
                  >
                    <span>
                      {Number(info?.pk) > 0 ? <KeyRound size={12} /> : null}
                      {c}
                      <small>{info?.type?.toLowerCase() || ""}</small>
                    </span>
                    {onSort &&
                      (sort?.column === c ? (
                        sort.direction === "ASC" ? (
                          <ChevronUp size={13} />
                        ) : (
                          <ArrowDown size={13} />
                        )
                      ) : (
                        <ArrowUpDown size={12} />
                      ))}
                  </button>
                </th>
              );
            })}
            {onRow && <th className="end-cell" />}
          </tr>
        </thead>
        <tbody>
          {start > 0 && (
            <tr aria-hidden="true">
              <td
                colSpan={span}
                style={{ height: start * 40, padding: 0, border: 0 }}
              />
            </tr>
          )}
          {rows.slice(start, end).map((row, offset) => {
            const ri = start + offset;
            const serialize = (key) =>
              JSON.stringify(key, (_, v) =>
                typeof v === "bigint" ? String(v) : v,
              );
            const rowKey =
              keys[ri] && Object.keys(keys[ri]).length
                ? serialize(keys[ri])
                : undefined;
            const highlighted =
              !!highlightedKey && rowKey === serialize(highlightedKey);
            return (
              <tr
                key={rowKey || ri}
                data-row-key={rowKey}
                data-row-highlight={highlighted ? "true" : undefined}
                tabIndex={onRow ? -1 : undefined}
                aria-rowindex={ri + 2}
                className={`${onRow ? "clickable" : ""} ${selected.includes(ri) ? "selected" : ""} ${highlighted ? "row-highlight" : ""}`}
                onClick={() => {
                  if (!disabled) onRow?.(row, keys[ri], ri);
                }}
              >
                {onSelect && (
                  <td
                    className="select-cell"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      aria-label={`Select row ${ri + 1}`}
                      type="checkbox"
                      disabled={disabled}
                      checked={selected.includes(ri)}
                      onChange={(e) =>
                        onSelect(
                          e.target.checked
                            ? [...selected, ri]
                            : selected.filter((i) => i !== ri),
                        )
                      }
                    />
                  </td>
                )}
                {row.map((v, ci) => (
                  <td
                    key={ci}
                    title={display(v)}
                    className={
                      v == null
                        ? "null"
                        : typeof v === "number" || typeof v === "bigint"
                          ? "numeric"
                          : ""
                    }
                  >
                    {columns[ci] === "status" ? (
                      <Badge
                        color={
                          v === "active" || v === "completed"
                            ? "green"
                            : v === "pending" || v === "processing"
                              ? "amber"
                              : "gray"
                        }
                      >
                        {display(v)}
                      </Badge>
                    ) : columns[ci] === "name" && !compact ? (
                      <span className="name-cell">
                        <span className={`avatar avatar-${ri % 5}`}>
                          {String(v || "?")
                            .split(" ")
                            .slice(0, 2)
                            .map((w) => w[0])
                            .join("")}
                        </span>
                        {display(v)}
                      </span>
                    ) : columns[ci] === "lifetime_value" ? (
                      <span className="money">
                        {Number(v).toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                        })}
                      </span>
                    ) : (
                      display(v)
                    )}
                  </td>
                ))}
                {onRow && (
                  <td className="end-cell">
                    <span className="row-open">↗</span>
                  </td>
                )}
              </tr>
            );
          })}
          {end < rows.length && (
            <tr aria-hidden="true">
              <td
                colSpan={span}
                style={{
                  height: (rows.length - end) * 40,
                  padding: 0,
                  border: 0,
                }}
              />
            </tr>
          )}
        </tbody>
      </table>
    </TableViewport>
  );
}
export function download(bytes, name, mime = "application/octet-stream") {
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function csvDownload(result, name = "query-results.csv") {
  const quote = (v) => '"' + display(v).replaceAll('"', '""') + '"';
  download(
    "\uFEFF" +
      [result.columns, ...result.rows]
        .map((r) => r.map(quote).join(","))
        .join("\r\n"),
    name,
    "text/csv;charset=utf-8",
  );
}
export const formatBytes = (n) => {
  n = Number(n || 0);
  return n < 1024
    ? n + " B"
    : n < 1024 * 1024
      ? (n / 1024).toFixed(1) + " KB"
      : (n / 1024 / 1024).toFixed(1) + " MB";
};
