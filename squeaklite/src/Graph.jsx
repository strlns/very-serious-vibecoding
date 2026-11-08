import React, {
  useState,
  useRef,
  useMemo,
  useLayoutEffect,
  useEffect,
  useId,
} from "react";
import {
  Plus,
  Minus,
  Maximize,
  Minimize,
  Scan,
  Table2,
  KeyRound,
  Link2,
  MousePointer2,
  Search,
} from "lucide-react";
import { IconButton, Empty, Button } from "./ui.jsx";
import { GraphCamera, fitView, zoomAt } from "./graph-camera.mjs";
import { schemaScene, visibleGraph, GRAPH_LIMITS } from "./graph-scene.mjs";

export default function Graph({
  objects = [],
  onTable,
  scene: providedScene,
  onNode,
  title = "Database relationships",
  initial = "fit",
}) {
  const schema = useMemo(() => schemaScene(objects), [objects]),
    scene = providedScene || schema,
    layout = scene.bounds;
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 }),
    [selected, setSelected] = useState(null),
    [expanded, setExpanded] = useState(false),
    [search, setSearch] = useState(""),
    [focused, setFocused] = useState(null),
    [findError, setFindError] = useState("");
  const panelRef = useRef(),
    viewportRef = useRef(),
    camera = useRef(new GraphCamera()),
    dimensions = useRef({ width: 0, height: 0 }),
    suppressClick = useRef(false),
    nativeEntered = useRef(false),
    priorFocus = useRef(null),
    markerId = useId();
  const commit = (next) => {
    camera.current.set(next);
    setView({ ...next });
  };
  const fit = () => {
    const el = viewportRef.current;
    if (el)
      commit(
        fitView(layout, { width: el.clientWidth, height: el.clientHeight }),
      );
  };
  const zoom = (factor, anchor) =>
    commit(
      zoomAt(
        camera.current.view,
        camera.current.view.scale * factor,
        anchor || {
          x: dimensions.current.width / 2,
          y: dimensions.current.height / 2,
        },
      ),
    );
  const closeFullScreen = () => {
    setExpanded(false);
    if (document.fullscreenElement === panelRef.current)
      document.exitFullscreen?.().catch(() => {});
  };
  const toggleFullScreen = () => {
    if (expanded) {
      closeFullScreen();
      return;
    }
    setExpanded(true);
    try {
      panelRef.current.requestFullscreen?.().catch(() => {});
    } catch {}
  };
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    dimensions.current = { width: el.clientWidth, height: el.clientHeight };
    if (initial === "start" && scene.nodes.length) {
      const first = scene.nodes[0],
        scale = Math.max(0.1, Math.min(1, (el.clientWidth - 48) / 280));
      commit({ scale, x: 24 - first.x * scale, y: 24 - first.y * scale });
    } else fit();
    const resize = () => {
      const next = { width: el.clientWidth, height: el.clientHeight },
        prior = dimensions.current;
      dimensions.current = next;
      if (!prior.width || !prior.height) fit();
      else
        commit({
          ...camera.current.view,
          x: camera.current.view.x + (next.width - prior.width) / 2,
          y: camera.current.view.y + (next.height - prior.height) / 2,
        });
    };
    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    observer?.observe(el);
    window.addEventListener("resize", resize);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [scene, initial]);
  useEffect(() => {
    if (expanded) {
      priorFocus.current = document.activeElement;
      viewportRef.current?.focus({ preventScroll: true });
    } else if (priorFocus.current) {
      priorFocus.current.focus?.({ preventScroll: true });
      priorFocus.current = null;
    }
    const change = () => {
      if (document.fullscreenElement === panelRef.current)
        nativeEntered.current = true;
      else if (nativeEntered.current) {
        nativeEntered.current = false;
        setExpanded(false);
      }
    };
    const key = (e) => {
      if (e.key === "Tab" && expanded) {
        const controls = [
            ...panelRef.current.querySelectorAll('button,input,[tabindex="0"]'),
          ],
          first = controls[0],
          last = controls.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
      if (e.key === "Escape" && expanded) {
        e.preventDefault();
        closeFullScreen();
      }
    };
    document.addEventListener("fullscreenchange", change);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("fullscreenchange", change);
      document.removeEventListener("keydown", key);
    };
  }, [expanded]);
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const wheel = (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const r = el.getBoundingClientRect();
        zoom(Math.exp(-e.deltaY * 0.008), {
          x: e.clientX - r.left,
          y: e.clientY - r.top,
        });
      } else
        commit({
          ...camera.current.view,
          x: camera.current.view.x - e.deltaX,
          y: camera.current.view.y - e.deltaY,
        });
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);
  const point = (e) => {
    const r = viewportRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const capture = (e) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };
  const down = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (!e.target.closest("button,input,select,textarea"))
      viewportRef.current?.focus({ preventScroll: true });
    if (!camera.current.points.size) suppressClick.current = false;
    camera.current.start(e.pointerId, point(e));
    if (camera.current.points.size > 1) suppressClick.current = true;
    if (camera.current.points.size > 1 || !e.target.closest("button"))
      capture(e);
  };
  const move = (e) => {
    if (!camera.current.points.has(e.pointerId)) return;
    const next = camera.current.move(e.pointerId, point(e));
    if (camera.current.moved) {
      suppressClick.current = true;
      capture(e);
    }
    setView({ ...next });
  };
  const end = (e) => camera.current.end(e.pointerId);
  const visible = useMemo(
    () => visibleGraph(scene, view, dimensions.current, focused),
    [scene, view, focused],
  );
  const find = (e) => {
    e.preventDefault();
    const query = search.trim().toLowerCase(),
      node = scene.nodes.find((n) => n.title.toLowerCase().includes(query));
    if (!query || !node) {
      setFindError("No matching node in this graph.");
      return;
    }
    setFindError("");
    setFocused(node.id);
    setSelected(node.id);
    const scale = 0.9;
    commit({
      scale,
      x: dimensions.current.width / 2 - (node.x + node.width / 2) * scale,
      y: dimensions.current.height / 2 - (node.y + node.height / 2) * scale,
    });
  };
  useEffect(() => {
    if (focused) {
      const node = [
        ...panelRef.current.querySelectorAll("[data-graph-node]"),
      ].find((n) => n.dataset.graphNode === focused);
      node?.querySelector("button")?.focus({ preventScroll: true });
    }
  }, [focused]);
  const open = (node) => {
    if (expanded) closeFullScreen();
    if (onNode) onNode(node);
    else onTable?.(node.table);
  };
  return (
    <section
      className={`graph-panel ${expanded ? "graph-expanded" : ""}`}
      ref={panelRef}
      role={expanded ? "dialog" : undefined}
      aria-modal={expanded ? true : undefined}
      aria-label={
        providedScene ? "Query result graph panel" : "Relationship graph panel"
      }
    >
      <div className="panel-bar">
        <div className="flex">
          <strong>{title}</strong>
          <span className="count-tag">
            {scene.nodes.length} {providedScene ? "nodes" : "tables"}
          </span>
          <span className="muted small-text">{scene.edges.length} links</span>
        </div>
        <div className="flex graph-controls">
          <IconButton
            icon={Minus}
            label="Zoom out"
            onClick={() => zoom(1 / 1.2)}
          />
          <output className="zoom-label" aria-label="Graph zoom">
            {view.scale < 0.01 ? "<1" : Math.round(view.scale * 100)}%
          </output>
          <IconButton icon={Plus} label="Zoom in" onClick={() => zoom(1.2)} />
          <IconButton icon={Scan} label="Fit graph" onClick={fit} />
          <IconButton
            icon={expanded ? Minimize : Maximize}
            label={expanded ? "Exit full screen" : "Enter full screen"}
            aria-pressed={expanded}
            onClick={toggleFullScreen}
          />
        </div>
      </div>
      <form className="graph-find" onSubmit={find}>
        <Search size={13} />
        <input
          aria-label="Find graph node"
          placeholder="Find a node…"
          maxLength={128}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button variant="quiet small" type="submit" disabled={!search.trim()}>
          Find
        </Button>
        <span role="status">
          {findError ||
            `${visible.nodes.length} detailed cards in view${visible.overview.length ? " · zoom in for more detail" : ""}${visible.omittedEdges ? ` · ${visible.omittedEdges} links hidden at this zoom` : ""}`}
        </span>
      </form>
      <div
        className="graph-scroll"
        ref={viewportRef}
        role="region"
        tabIndex={0}
        aria-label="Graph viewport. Drag to pan, pinch to zoom, or use the zoom controls."
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={(e) => {
          if (e.target === e.currentTarget) end(e);
        }}
        onClickCapture={(e) => {
          if (suppressClick.current && e.detail !== 0) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onKeyDown={(e) => {
          if (
            e.target !== e.currentTarget ||
            e.ctrlKey ||
            e.metaKey ||
            e.altKey ||
            e.nativeEvent.isComposing
          )
            return;
          const delta = {
            ArrowLeft: [40, 0],
            ArrowRight: [-40, 0],
            ArrowUp: [0, 40],
            ArrowDown: [0, -40],
          }[e.key];
          if (delta) {
            e.preventDefault();
            commit({
              ...camera.current.view,
              x: camera.current.view.x + delta[0],
              y: camera.current.view.y + delta[1],
            });
          } else if (e.key === "+" || e.key === "=") {
            e.preventDefault();
            zoom(1.2);
          } else if (e.key === "-") {
            e.preventDefault();
            zoom(1 / 1.2);
          } else if (e.key === "0") {
            e.preventDefault();
            fit();
          }
        }}
      >
        {!scene.nodes.length ? (
          <Empty
            title={providedScene ? "No graph nodes" : "No tables to connect"}
          >
            {scene.stats.error ||
              "Choose valid source/target columns or narrow the query to records you want to explore."}
          </Empty>
        ) : (
          <div
            className="graph-canvas"
            style={{
              width: layout.width,
              height: layout.height,
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            }}
          >
            <svg
              width={layout.width}
              height={layout.height}
              className="graph-edges"
            >
              <defs>
                <marker
                  id={markerId}
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#597b67" />
                </marker>
              </defs>
              {visible.overview.map((n) => (
                <rect
                  key={n.id}
                  x={n.x}
                  y={n.y}
                  width={n.width}
                  height={n.height}
                  rx="8"
                  fill="#e3ecdc"
                  stroke="#738c65"
                  aria-hidden="true"
                />
              ))}
              {visible.edges.map((e, edgeIndex) => (
                <g key={e.id}>
                  <title>
                    {e.label}
                    {e.count > 1 ? ` · ${e.count} rows` : ""}
                  </title>
                  <path
                    d={`M${e.x1},${e.y1} C${e.x1 + 100},${e.y1} ${e.x2 - 100},${e.y2} ${e.x2},${e.y2}`}
                    fill="none"
                    stroke={
                      selected === e.from || selected === e.to
                        ? "#1b7358"
                        : "#78967e"
                    }
                    strokeWidth={
                      selected === e.from || selected === e.to ? 2.5 : 1.5
                    }
                    markerEnd={`url(#${markerId})`}
                  />
                  <circle cx={e.x1} cy={e.y1} r="3" fill="#49744f" />
                  {providedScene &&
                    view.scale >= 0.35 &&
                    edgeIndex < 100 &&
                    (e.label || e.count > 1) && (
                      <text
                        className="result-edge-label"
                        x={(e.x1 + e.x2) / 2}
                        y={(e.y1 + e.y2) / 2 - 6}
                        textAnchor="middle"
                      >
                        {e.label.slice(0, 40)}
                        {e.count > 1 ? ` ×${e.count}` : ""}
                      </text>
                    )}
                </g>
              ))}
            </svg>
            {visible.nodes.map((n) => (
              <div
                key={n.id}
                data-graph-node={n.id}
                className={`graph-node ${selected === n.id ? "selected" : ""}`}
                style={{ left: n.x, top: n.y, width: n.width }}
                onMouseEnter={() => setSelected(n.id)}
                onMouseLeave={() => setSelected(null)}
              >
                <button className="graph-node-title" onClick={() => open(n)}>
                  <Table2 size={16} />
                  <strong>{n.title}</strong>
                  <span>↗</span>
                </button>
                <div className="graph-fields">
                  {n.fields.map((f, i) => (
                    <div key={i}>
                      <span title={f.name}>
                        {f.kind === "key" ? (
                          <KeyRound size={12} />
                        ) : f.kind === "link" ? (
                          <Link2 size={12} />
                        ) : (
                          <i />
                        )}
                        {f.name}
                      </span>
                      <small
                        className={f.value !== undefined ? "graph-value" : ""}
                        title={f.value ?? f.type}
                      >
                        {f.value ?? f.type}
                      </small>
                    </div>
                  ))}
                </div>
                {n.extraFields > 0 && (
                  <div className="graph-more">
                    + {n.extraFields} more fields · open to inspect
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <footer className="graph-footer">
        <span>
          <MousePointer2 size={13} /> Drag to pan · Pinch to zoom ·{" "}
          {providedScene
            ? "Click a node to inspect"
            : "Click a table to explore"}
        </span>
        <span>
          {scene.stats.skippedRows > 0
            ? `${scene.stats.skippedRows} omitted by graph limits`
            : `Up to ${GRAPH_LIMITS.visibleNodes} detailed cards · ${GRAPH_LIMITS.visibleEdges} visible links`}
        </span>
      </footer>
    </section>
  );
}
