import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button, IconButton } from "./ui.jsx";
import { joinRelations } from "./join-relations.ts";

export default function JoinAssistant({
  tables,
  base,
  joins,
  onAdd,
  disabled,
}) {
  const sources = [base, ...joins.map((j) => j.table)];
  const candidates = tables.filter((t) => !sources.includes(t.name));
  const [source, setSource] = useState(base);
  const [target, setTarget] = useState(() => {
    const forward = tables
      .find((t) => t.name === base)
      ?.foreignKeys?.find((f) => candidates.some((t) => t.name === f.table));
    return (
      forward?.table ||
      candidates.find((t) => joinRelations(tables, base, t.name).length)
        ?.name ||
      candidates[0]?.name ||
      ""
    );
  });
  const [type, setType] = useState("LEFT");
  const columns = (name) =>
    tables
      .find((t) => t.name === name)
      ?.columns.filter((c) => Number(c.hidden) !== 1) || [];
  const relations = joinRelations(tables, source, target);
  const [choice, setChoice] = useState(relations.length ? "0" : "manual");
  const [pairs, setPairs] = useState(
    relations[0]?.pairs || [
      {
        from: columns(source)[0]?.name || "",
        to: columns(target)[0]?.name || "",
      },
    ],
  );
  const chooseTables = (nextSource, nextTarget) => {
    setSource(nextSource);
    setTarget(nextTarget);
    const options = joinRelations(tables, nextSource, nextTarget);
    setChoice(options.length ? "0" : "manual");
    setPairs(
      options[0]?.pairs || [
        {
          from: columns(nextSource)[0]?.name || "",
          to: columns(nextTarget)[0]?.name || "",
        },
      ],
    );
  };
  const valid =
    target &&
    sources.includes(source) &&
    candidates.some((t) => t.name === target) &&
    pairs.length &&
    pairs.every(
      (p) =>
        columns(source).some((c) => c.name === p.from) &&
        columns(target).some((c) => c.name === p.to),
    );
  if (!candidates.length)
    return (
      <p className="muted small-text">
        No more tables to join. Use SQL for aliases or self joins.
      </p>
    );
  return (
    <fieldset className="join-assistant" disabled={disabled}>
      <legend>JOIN assistant</legend>
      <div className="join-options">
        <label>
          Join table
          <select
            aria-label="Join table"
            value={target}
            onChange={(e) => chooseTables(source, e.target.value)}
          >
            {candidates.map((t) => (
              <option key={t.name}>{t.name}</option>
            ))}
          </select>
        </label>
        <label>
          Join from
          <select
            aria-label="Join from"
            value={source}
            onChange={(e) => chooseTables(e.target.value, target)}
          >
            {sources.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          Join type
          <select
            aria-label="Join type"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="LEFT">LEFT · keep all source rows</option>
            <option value="INNER">INNER · matching rows only</option>
          </select>
        </label>
      </div>
      <label>
        Relationship
        <select
          aria-label="Join relationship"
          value={choice}
          onChange={(e) => {
            setChoice(e.target.value);
            if (e.target.value !== "manual")
              setPairs(relations[Number(e.target.value)].pairs);
          }}
        >
          <option value="manual">Custom columns</option>
          {relations.map((r, i) => (
            <option key={i} value={String(i)}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
      {!relations.length && (
        <p className="muted small-text">
          No declared foreign key between these tables. Choose matching columns
          below.
        </p>
      )}
      {pairs.map((p, i) => (
        <div className="join-pair" key={i}>
          <select
            aria-label={`Join source column ${i + 1}`}
            value={p.from}
            onChange={(e) => {
              setChoice("manual");
              setPairs(
                pairs.map((x, j) =>
                  j === i ? { ...x, from: e.target.value } : x,
                ),
              );
            }}
          >
            {columns(source).map((c) => (
              <option key={c.name}>{c.name}</option>
            ))}
          </select>
          <span>=</span>
          <select
            aria-label={`Join target column ${i + 1}`}
            value={p.to}
            onChange={(e) => {
              setChoice("manual");
              setPairs(
                pairs.map((x, j) =>
                  j === i ? { ...x, to: e.target.value } : x,
                ),
              );
            }}
          >
            {columns(target).map((c) => (
              <option key={c.name}>{c.name}</option>
            ))}
          </select>
          <IconButton
            icon={X}
            label={`Remove join column pair ${i + 1}`}
            disabled={pairs.length === 1}
            onClick={() => {
              setChoice("manual");
              setPairs(pairs.filter((_, j) => j !== i));
            }}
          />
        </div>
      ))}
      <div className="join-actions">
        <Button
          variant="quiet small"
          icon={Plus}
          onClick={() => {
            setChoice("manual");
            setPairs([
              ...pairs,
              {
                from: columns(source)[0]?.name || "",
                to: columns(target)[0]?.name || "",
              },
            ]);
          }}
        >
          Add column pair
        </Button>
        <Button
          variant="small"
          icon={Plus}
          disabled={!valid}
          onClick={() =>
            onAdd({
              source,
              table: target,
              type,
              from: pairs[0].from,
              to: pairs[0].to,
              pairs,
            })
          }
        >
          Add join
        </Button>
      </div>
      <small>
        A one-to-many join repeats source rows. COUNT counts joined rows; SUM
        and AVG include those repetitions.
      </small>
    </fieldset>
  );
}
