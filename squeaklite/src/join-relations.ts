interface Column {
  name: string;
  pk: number | bigint;
  hidden?: number | bigint;
}
interface ForeignKey {
  id: number | bigint;
  seq: number | bigint;
  table: string;
  from: string;
  to?: string | null;
}
interface ObjectSchema {
  name: string;
  columns: Column[];
  foreignKeys?: ForeignKey[];
}
export interface Relation {
  label: string;
  pairs: { from: string; to: string }[];
}
// Both directions of a composite FK are one relationship, not separate joins.
export function joinRelations(
  objects: ObjectSchema[],
  source: string,
  target: string,
): Relation[] {
  const a = objects.find((o) => o.name === source),
    b = objects.find((o) => o.name === target);
  if (!a || !b || source === target) return [];
  const results: Relation[] = [];
  const collect = (
    child: ObjectSchema,
    parent: ObjectSchema,
    reverse: boolean,
  ) => {
    const ids = new Set(
      (child.foreignKeys || [])
        .filter((f) => f.table === parent.name)
        .map((f) => String(f.id)),
    );
    const pk = parent.columns
      .filter((c) => Number(c.pk) > 0)
      .sort((a, b) => Number(a.pk) - Number(b.pk));
    for (const id of ids) {
      const keys = (child.foreignKeys || [])
        .filter((f) => String(f.id) === id)
        .sort((a, b) => Number(a.seq) - Number(b.seq));
      const pairs = keys.map((f, i) => ({
        from: f.from,
        to: f.to || pk[i]?.name || "",
      }));
      if (
        !pairs.every(
          (p) =>
            child.columns.some(
              (c) => c.name === p.from && Number(c.hidden) !== 1,
            ) &&
            parent.columns.some(
              (c) => c.name === p.to && Number(c.hidden) !== 1,
            ),
        )
      )
        continue;
      const oriented = reverse
        ? pairs.map((p) => ({ from: p.to, to: p.from }))
        : pairs;
      results.push({
        label: oriented
          .map((p) => `${source}.${p.from} = ${target}.${p.to}`)
          .join(" AND "),
        pairs: oriented,
      });
    }
  };
  collect(a, b, false);
  collect(b, a, true);
  return results;
}
