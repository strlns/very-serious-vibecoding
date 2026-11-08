export const MIN_ZOOM = 0.001,
  MAX_ZOOM = 2.5;
export const clampZoom = (scale) =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function zoomAt(view, scale, anchor) {
  scale = clampZoom(scale);
  const ratio = scale / view.scale;
  return {
    scale,
    x: anchor.x - (anchor.x - view.x) * ratio,
    y: anchor.y - (anchor.y - view.y) * ratio,
  };
}
export function fitView(bounds, viewport, padding = 24) {
  const scale = clampZoom(
    Math.min(
      1,
      (viewport.width - padding * 2) / bounds.width,
      (viewport.height - padding * 2) / bounds.height,
    ),
  );
  return {
    scale,
    x: (viewport.width - bounds.width * scale) / 2,
    y: (viewport.height - bounds.height * scale) / 2,
  };
}
export function graphLayout(tables) {
  const columns = Math.min(3, Math.max(1, tables.length)),
    positions = [];
  let y = 28;
  for (let start = 0; start < tables.length; start += columns) {
    let rowHeight = 0;
    for (let i = start; i < Math.min(start + columns, tables.length); i++) {
      positions[i] = { x: 28 + (i % columns) * 340, y };
      rowHeight = Math.max(rowHeight, 67 + tables[i].columns.length * 27);
    }
    y += rowHeight + 76;
  }
  return {
    positions,
    width: columns * 340 - 80 + 56,
    height: Math.max(260, y - 48),
  };
}
export class GraphCamera {
  constructor(view = { x: 0, y: 0, scale: 1 }) {
    this.view = view;
    this.points = new Map();
    this.moved = false;
  }
  baseline() {
    this.base = { view: { ...this.view }, points: new Map(this.points) };
  }
  start(id, point) {
    if (!this.points.size) this.moved = false;
    this.points.set(id, point);
    if (this.points.size > 1) this.moved = true;
    this.baseline();
  }
  move(id, point) {
    if (!this.points.has(id)) return this.view;
    this.points.set(id, point);
    const ids = [...this.base.points.keys()].slice(0, 2),
      a = this.base.points.get(ids[0]),
      nextA = this.points.get(ids[0]);
    if (ids.length === 1) {
      const dx = nextA.x - a.x,
        dy = nextA.y - a.y;
      if (Math.hypot(dx, dy) > 4) this.moved = true;
      if (this.moved)
        this.view = {
          ...this.base.view,
          x: this.base.view.x + dx,
          y: this.base.view.y + dy,
        };
    } else {
      const b = this.base.points.get(ids[1]),
        nextB = this.points.get(ids[1]),
        origin = midpoint(a, b),
        next = midpoint(nextA, nextB);
      const view = zoomAt(
        this.base.view,
        (this.base.view.scale * distance(nextA, nextB)) /
          Math.max(1, distance(a, b)),
        origin,
      );
      this.view = {
        ...view,
        x: view.x + next.x - origin.x,
        y: view.y + next.y - origin.y,
      };
    }
    return this.view;
  }
  end(id) {
    this.points.delete(id);
    this.baseline();
  }
  set(view) {
    this.view = view;
    this.baseline();
    return view;
  }
}
