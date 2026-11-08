import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useId,
} from "react";
import { ChevronLeft, ChevronRight, Hand } from "lucide-react";
import { TableDrag, tableTouchAction } from "./table-drag.mjs";
const mediaQueries = ["(any-pointer: coarse)", "(max-width: 760px)"];
const readMode = () => {
  try {
    return localStorage.getItem("quarry-table-scroll") === "native"
      ? "native"
      : "steady";
  } catch {
    return "steady";
  }
};

export default function TableViewport({
  children,
  compact = false,
  label = "Table data",
  onViewportChange,
  resetKey,
}) {
  const ref = useRef(),
    drag = useRef(new TableDrag()),
    hintId = useId();
  const [touchLayout, setTouchLayout] = useState(
      () =>
        typeof window.PointerEvent === "function" &&
        mediaQueries.some((query) => window.matchMedia?.(query).matches),
    ),
    [mode, setMode] = useState(readMode),
    [dragging, setDragging] = useState(false);
  const [bounds, setBounds] = useState({ left: 0, top: 0, maxX: 0, maxY: 0 });
  const steady = touchLayout && mode === "steady";
  const measure = () => {
    const el = ref.current;
    if (!el) return;
    onViewportChange?.({ top: el.scrollTop, height: el.clientHeight });
    const next = {
      left: el.scrollLeft,
      top: el.scrollTop,
      maxX: Math.max(0, el.scrollWidth - el.clientWidth),
      maxY: Math.max(0, el.scrollHeight - el.clientHeight),
    };
    setBounds((b) =>
      Object.keys(next).every((k) => b[k] === next[k]) ? b : next,
    );
  };
  useLayoutEffect(measure, [children]);
  useLayoutEffect(() => {
    if (resetKey !== undefined && ref.current) {
      ref.current.scrollTop = 0;
      ref.current.scrollLeft = 0;
      measure();
    }
  }, [resetKey]);
  useEffect(() => {
    const media = mediaQueries.map((query) => window.matchMedia?.(query));
    const layout = () =>
        setTouchLayout(
          typeof window.PointerEvent === "function" &&
            media.some((m) => m?.matches),
        ),
      sync = (e) =>
        setMode(
          e.detail === "native" || e.detail === "steady"
            ? e.detail
            : readMode(),
        );
    media.forEach((m) => m?.addEventListener("change", layout));
    window.addEventListener("quarry-table-scroll", sync);
    window.addEventListener("storage", sync);
    window.addEventListener("resize", measure);
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null;
    observer?.observe(ref.current);
    if (ref.current?.firstElementChild)
      observer?.observe(ref.current.firstElementChild);
    return () => {
      media.forEach((m) => m?.removeEventListener("change", layout));
      window.removeEventListener("quarry-table-scroll", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, []);
  useEffect(() => {
    drag.current.reset();
    setDragging(false);
  }, [steady]);
  const down = (e) => {
    if (e.pointerType !== "touch" && e.pointerType !== "pen") {
      drag.current.reset();
      setDragging(false);
      return;
    }
    if (!steady) {
      drag.current.reset();
      return;
    }
    const el = ref.current;
    drag.current.start(
      e.pointerId,
      { x: e.clientX, y: e.clientY },
      {
        left: el.scrollLeft,
        top: el.scrollTop,
        maxX: Math.max(0, el.scrollWidth - el.clientWidth),
        maxY: Math.max(0, el.scrollHeight - el.clientHeight),
      },
    );
    if (drag.current.blocked) {
      setDragging(false);
      for (const id of drag.current.points) {
        try {
          if (el.hasPointerCapture?.(id)) el.releasePointerCapture(id);
        } catch {}
      }
    }
  };
  const move = (e) => {
    if (!steady || (e.pointerType !== "touch" && e.pointerType !== "pen"))
      return;
    const next = drag.current.move(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!next) return;
    const el = ref.current;
    el.scrollLeft = next.left;
    el.scrollTop = next.top;
    setDragging(true);
    measure();
    // Capturing only after movement preserves ordinary row/button taps.
    try {
      if (!el.hasPointerCapture?.(e.pointerId))
        el.setPointerCapture?.(e.pointerId);
    } catch {}
  };
  const end = (e) => {
    drag.current.end(e.pointerId);
    if (!drag.current.active) setDragging(false);
  };
  const toggle = () => {
    const next = mode === "steady" ? "native" : "steady";
    setMode(next);
    try {
      localStorage.setItem("quarry-table-scroll", next);
    } catch {}
    window.dispatchEvent(
      new window.CustomEvent("quarry-table-scroll", { detail: next }),
    );
  };
  const step = (direction) => {
    const el = ref.current;
    el.scrollLeft = Math.max(
      0,
      Math.min(
        bounds.maxX,
        el.scrollLeft + direction * Math.max(80, el.clientWidth * 0.65),
      ),
    );
    measure();
  };
  return (
    <div className="table-viewport">
      {touchLayout && (
        <div className="table-scroll-tools">
          <button
            type="button"
            className="scroll-mode"
            aria-label={
              mode === "steady"
                ? "Use native table scrolling"
                : "Use steady table scrolling"
            }
            aria-pressed={mode === "steady"}
            onClick={toggle}
          >
            <Hand size={12} />
            {mode === "steady" ? "Steady scroll" : "Native scroll"}
          </button>
          <span id={hintId}>
            {mode === "steady"
              ? "One direction at a time"
              : "Browser scrolling"}{" "}
            · pinch to zoom
          </span>
          {bounds.maxX > 1 && (
            <div className="table-step-controls">
              <button
                type="button"
                aria-label="Scroll table left"
                disabled={bounds.left <= 1}
                onClick={() => step(-1)}
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                aria-label="Scroll table right"
                disabled={bounds.left >= bounds.maxX - 1}
                onClick={() => step(1)}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      )}
      <div
        ref={ref}
        className={`data-scroll ${compact ? "compact" : ""} ${steady ? "steady-scroll" : ""}`}
        role="region"
        tabIndex={0}
        aria-label={label}
        aria-describedby={touchLayout ? hintId : undefined}
        style={{
          touchAction: tableTouchAction(steady, bounds.maxX, bounds.maxY),
          overscrollBehaviorX: bounds.maxX > 1 ? "contain" : "auto",
          overscrollBehaviorY: bounds.maxY > 1 ? "contain" : "auto",
        }}
        data-dragging={dragging || undefined}
        onScroll={measure}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={(e) => {
          if (e.target === e.currentTarget) end(e);
        }}
        onClickCapture={(e) => {
          if (drag.current.moved && e.detail !== 0) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
