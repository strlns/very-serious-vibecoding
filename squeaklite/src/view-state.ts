export const tableViewKey = ({
  table,
  db,
  page,
  pageSize,
  search,
  sort,
  filters,
}: {
  table: string;
  db: string;
  page: number;
  pageSize: number;
  search: string;
  sort: unknown;
  filters: unknown;
}) =>
  JSON.stringify(
    { table, db, page, pageSize, search, sort, filters },
    (_, v) => (typeof v === "bigint" ? String(v) : v),
  );
