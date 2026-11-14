interface Column {
  name: string;
  type: string;
  pk: number | bigint;
  notnull: number | bigint;
  dflt_value?: unknown;
  hidden?: number | bigint;
}
interface RowSchema {
  columns: Column[];
  indexes?: { origin: string }[];
  strict?: boolean;
  withoutRowid?: boolean;
}
export function columnPolicy(schema: RowSchema, column: Column) {
  const primary = schema.columns.filter((c) => Number(c.pk) > 0);
  const autoKey =
    Number(column.pk) > 0 &&
    primary.length === 1 &&
    column.type.toUpperCase() === "INTEGER" &&
    !schema.withoutRowid &&
    !schema.indexes?.some((i) => i.origin === "pk");
  const nullable =
    !Number(column.notnull) &&
    !(Number(column.pk) && (schema.withoutRowid || schema.strict || autoKey));
  const generated = Number(column.hidden || 0) > 0;
  return {
    nullable: !!nullable,
    autoKey,
    generated,
    required: !generated && !nullable && !autoKey && column.dflt_value == null,
  };
}
