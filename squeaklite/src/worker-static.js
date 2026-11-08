export default () =>
  new Worker(new URL("./db.worker.js", import.meta.url), { type: "module" });
