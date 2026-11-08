const clamp = (value, max) => Math.min(Math.max(0, max), Math.max(0, value));
export function tableTouchAction(steady, maxX, maxY) {
  if (!steady || (maxX <= 1 && maxY <= 1)) return "manipulation";
  if (maxX > 1 && maxY > 1) return "pinch-zoom";
  return (maxX > 1 ? "pan-y" : "pan-x") + " pinch-zoom";
}
// Deliberate one-finger movement, with no momentum or animation after release.
// Multi-touch ends the custom drag so the browser can own accessible pinch zoom.
export class TableDrag {
  constructor() {
    this.reset();
  }
  reset() {
    this.points = new Set();
    this.active = null;
    this.blocked = false;
    this.moved = false;
    this.axis = null;
  }
  start(id, point, viewport) {
    if (!this.points.size) {
      this.blocked = false;
      this.moved = false;
      this.axis = null;
    }
    this.points.add(id);
    if (this.points.size > 1) {
      this.active = null;
      this.blocked = true;
      this.moved = true;
      return;
    }
    this.active = { id, point, ...viewport };
  }
  move(id, point) {
    const a = this.active;
    if (!a || a.id !== id || this.blocked) return null;
    const dx = point.x - a.point.x,
      dy = point.y - a.point.y,
      distance = Math.hypot(dx, dy);
    if (distance < 8 && !this.moved) return null;
    this.moved = true;
    if (!this.axis) {
      if (Math.abs(dx) > Math.abs(dy) * 1.2) this.axis = "x";
      else if (Math.abs(dy) > Math.abs(dx) * 1.2) this.axis = "y";
      else if (distance > 16)
        this.axis = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
    }
    if (!this.axis) return null;
    return {
      left: clamp(a.left - (this.axis === "x" ? dx * 0.65 : 0), a.maxX),
      top: clamp(a.top - (this.axis === "y" ? dy * 0.65 : 0), a.maxY),
    };
  }
  end(id) {
    this.points.delete(id);
    if (this.active?.id === id) this.active = null;
    if (!this.points.size) this.blocked = false;
  }
}
