import initSqlJs from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm-browser.wasm?url&inline";
import { Engine } from "./engine.mjs";
import { handle } from "./worker-handler.mjs";
handle(initSqlJs({ locateFile: () => wasmUrl }).then((SQL) => new Engine(SQL)));
