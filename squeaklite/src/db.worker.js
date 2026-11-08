import initSqlJs from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm-browser.wasm?url";
import { Engine } from "./engine.mjs";
import { handle } from "./worker-handler.mjs";
const engine = initSqlJs({ locateFile: () => wasmUrl }).then(
  (SQL) => new Engine(SQL),
);
handle(engine);
