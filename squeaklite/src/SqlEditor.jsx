import React, { useState, useRef, useMemo, useId } from "react";
import { completions } from "./sql-completion.mjs";
export default function SqlEditor({
  value,
  onChange,
  objects = [],
  table = "",
  label = "SQL query editor",
  editorRef,
  placeholder = "Write a SQL query…",
  disabled = false,
}) {
  const hintId = useId();
  const local = useRef(),
    ref = editorRef || local,
    ghost = useRef(),
    [cursor, setCursor] = useState(value.length),
    [focused, setFocused] = useState(false),
    [selection, setSelection] = useState(false),
    [dismissed, setDismissed] = useState(false),
    [composing, setComposing] = useState(false),
    [index, setIndex] = useState(0),
    [manual, setManual] = useState(false);
  const options = useMemo(
    () =>
      completions(value, Math.min(cursor, value.length), objects, table, {
        manual,
      }),
    [value, cursor, objects, table, manual],
  );
  const active =
    focused && !selection && !dismissed && !composing && !disabled
      ? options[Math.min(index, options.length - 1)]
      : null;
  const sync = (el) => {
    setCursor(el.selectionStart);
    setSelection(el.selectionStart !== el.selectionEnd);
    if (ghost.current) {
      ghost.current.scrollTop = el.scrollTop;
      ghost.current.scrollLeft = el.scrollLeft;
    }
  };
  const accept = () => {
    if (!active) return;
    const pos = active.from + active.insert.length;
    onChange(
      value.slice(0, active.from) + active.insert + value.slice(active.to),
    );
    setCursor(pos);
    setIndex(0);
    setManual(false);
    setDismissed(true);
    requestAnimationFrame(() => {
      ref.current?.focus({ preventScroll: true });
      ref.current?.setSelectionRange(pos, pos);
    });
  };
  return (
    <div className="editor sql-autocomplete">
      <div className="line-numbers" aria-hidden="true">
        {value.split("\n").map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <div className="sql-input-layer">
        <div className="sql-ghost" ref={ghost} aria-hidden="true">
          <span className="sql-ghost-prefix">{value.slice(0, cursor)}</span>
          {active && (
            <span className="sql-ghost-suggestion">
              {active.replaces ? " ▸ " + active.insert : active.suffix}
            </span>
          )}
        </div>
        <textarea
          ref={ref}
          placeholder={active ? "" : placeholder}
          aria-label={label}
          aria-describedby={active ? hintId : undefined}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          disabled={disabled}
          value={value}
          onFocus={(e) => {
            setFocused(true);
            sync(e.target);
          }}
          onBlur={() => {
            setFocused(false);
            setManual(false);
          }}
          onSelect={(e) => sync(e.target)}
          onKeyUp={(e) => sync(e.target)}
          onMouseUp={(e) => sync(e.target)}
          onClick={() => setDismissed(false)}
          onScroll={(e) => sync(e.target)}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={(e) => {
            setComposing(false);
            sync(e.target);
          }}
          onChange={(e) => {
            onChange(e.target.value);
            sync(e.target);
            setDismissed(false);
            setIndex(0);
            setManual(false);
          }}
          onKeyDown={(e) => {
            if (
              e.nativeEvent.isComposing ||
              composing ||
              e.ctrlKey ||
              e.metaKey ||
              e.altKey
            )
              return;
            if (
              !active &&
              !e.shiftKey &&
              e.key === "ArrowDown" &&
              e.target.selectionStart === e.target.selectionEnd
            ) {
              const requested = completions(
                value,
                e.target.selectionStart,
                objects,
                table,
                { manual: true },
              );
              if (requested.length) {
                e.preventDefault();
                setManual(true);
                setDismissed(false);
                setIndex(0);
                return;
              }
            }
            if (active && e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              setDismissed(true);
              setManual(false);
              return;
            }
            if (
              active &&
              !e.shiftKey &&
              (e.key === "ArrowDown" || e.key === "ArrowUp")
            ) {
              e.preventDefault();
              setIndex(
                (i) =>
                  (i + (e.key === "ArrowDown" ? 1 : options.length - 1)) %
                  options.length,
              );
              return;
            }
            if (e.key === "Tab" && !e.shiftKey) {
              e.preventDefault();
              if (active) {
                accept();
                return;
              }
              const el = e.target,
                start = el.selectionStart,
                end = el.selectionEnd;
              onChange(value.slice(0, start) + "  " + value.slice(end));
              setCursor(start + 2);
              setDismissed(true);
              requestAnimationFrame(() =>
                ref.current?.setSelectionRange(start + 2, start + 2),
              );
            }
          }}
        />
        {active && (
          <div className="sql-completion-bar" id={hintId}>
            <span>
              <strong>{active.label}</strong> · {active.kind}
              {active.detail ? " · " + active.detail : ""}
            </span>
            <span>Tab to accept · ↑↓ alternatives · Esc dismiss</span>
          </div>
        )}
      </div>
      <span className="editor-language">SQLite</span>
    </div>
  );
}
