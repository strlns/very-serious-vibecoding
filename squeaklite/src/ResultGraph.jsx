import React, { useState, useMemo, Component } from "react";
import Graph from "./Graph.jsx";
import { resultScene, GRAPH_LIMITS } from "./graph-scene.mjs";
import { Modal, Button, Empty } from "./ui.jsx";
import { display } from "./sql.ts";
export class GraphErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <Empty title="The graph could not be displayed">
        Your results are still available in the table.{" "}
        <button className="text-button" onClick={this.props.onBack}>
          Return to table
        </button>
      </Empty>
    ) : (
      this.props.children
    );
  }
}
export default function ResultGraph({ result }) {
  const columns = result.columns.slice(0, 256),
    from = columns.findIndex((c) =>
      /^(source|source_id|from|from_id)$/i.test(c),
    ),
    to = columns.findIndex((c) => /^(target|target_id|to|to_id)$/i.test(c));
  const [options, setOptions] = useState({
      mode: from >= 0 && to >= 0 ? "links" : "rows",
      source: Math.max(0, from),
      target: to >= 0 ? to : 1,
      label: -1,
      nodeLimit: 250,
    }),
    [inspect, setInspect] = useState(null);
  const scene = useMemo(() => resultScene(result, options), [result, options]);
  const update = (patch) => setOptions((o) => ({ ...o, ...patch }));
  return (
    <div className="result-graph">
      <div className="result-graph-options">
        <label>
          Graph mode
          <select
            value={options.mode}
            onChange={(e) => update({ mode: e.target.value })}
          >
            <option value="rows">Row cards</option>
            <option value="links">Connections</option>
          </select>
        </label>
        {options.mode === "links" && (
          <>
            <label>
              Source column
              <select
                value={options.source}
                onChange={(e) => update({ source: Number(e.target.value) })}
              >
                {columns.map((c, i) => (
                  <option key={i} value={i}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Target column
              <select
                value={options.target}
                onChange={(e) => update({ target: Number(e.target.value) })}
              >
                {columns.map((c, i) => (
                  <option key={i} value={i}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Link label
              <select
                value={options.label}
                onChange={(e) => update({ label: Number(e.target.value) })}
              >
                <option value={-1}>No label</option>
                {columns.map((c, i) => (
                  <option key={i} value={i}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <label>
          Node budget
          <select
            value={options.nodeLimit}
            onChange={(e) => update({ nodeLimit: Number(e.target.value) })}
          >
            {[100, 250, 500].map((n) => (
              <option key={n} value={n}>
                {n} nodes
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="result-graph-notice" role="status">
        {scene.stats.shownRows.toLocaleString()} of{" "}
        {scene.stats.totalRows.toLocaleString()} returned rows represented ·
        maximum {GRAPH_LIMITS.nodes} nodes /{" "}
        {GRAPH_LIMITS.edges.toLocaleString()} links.
        {scene.stats.skippedRows > 0
          ? " Some rows were omitted because of limits or empty/binary endpoints. Narrow the query or adjust the node budget."
          : ""}
        {result.truncated ? " The SQL result was also truncated." : ""}
        {options.mode === "rows"
          ? " Row cards do not infer relationships; choose Connections and map source/target columns to draw links."
          : ""}
      </div>
      <Graph
        scene={scene}
        title="Query result graph"
        initial="start"
        onNode={setInspect}
      />
      {inspect && (
        <Modal
          title="Inspect graph record"
          subtitle="Query results are read-only."
          onClose={() => setInspect(null)}
          wide
        >
          <dl className="result-record">
            {inspect.rowIndex != null ? (
              result.columns.slice(0, 128).map((c, i) => (
                <div key={i}>
                  <dt>{c}</dt>
                  <dd>{display(result.rows[inspect.rowIndex]?.[i])}</dd>
                </div>
              ))
            ) : (
              <div>
                <dt>{inspect.endpoint.column}</dt>
                <dd>{display(inspect.endpoint.value)}</dd>
              </div>
            )}
          </dl>
          {result.columns.length > 128 && inspect.rowIndex != null && (
            <p className="result-notice">
              Showing the first 128 columns. Select fewer columns for complete
              inspection.
            </p>
          )}
          <footer className="modal-footer">
            <Button onClick={() => setInspect(null)}>Close</Button>
          </footer>
        </Modal>
      )}
    </div>
  );
}
