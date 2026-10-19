import type { SortState } from './Table';

/**
 * The pure core behind `useClientTable` (UI-32): what a column's value is,
 * how two values compare, how a column search matches, and the header's
 * sort cycle. No React here, so every rule is tested as a plain function.
 */

/** A value a column sorts and filters on. */
export type ClientTableValue = string | number | Date | null | undefined;

/**
 * The part of a column the client-side sort and filter read. A
 * `ListTableColumn`, a `DataTableColumn` or a `Table` `Column` all fit.
 */
export interface ClientTableColumn<Row> {
  key: keyof Row | string;
  /** The value to sort and filter on. Defaults to `row[key]`. */
  accessor?: (row: Row) => ClientTableValue;
}

/** The search text per column key. */
export type ColumnFilters = Readonly<Record<string, string>>;

/**
 * Empty is `null`, `undefined`, a string that is blank after trimming, `NaN`
 * and an invalid `Date`. An empty value sorts last in both directions.
 */
export function isEmptyClientTableValue(value: ClientTableValue): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (typeof value === 'number') return Number.isNaN(value);
  return Number.isNaN(value.getTime());
}

/** The text a column search matches against; `''` for an empty value. */
export function clientTableValueText(value: ClientTableValue): string {
  if (isEmptyClientTableValue(value)) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

/**
 * Compare two non-empty values: numbers by value, dates by time, strings
 * with a numeric-aware `localeCompare` (the rule `Table` uses), and mixed
 * types by their text with the same `localeCompare`.
 */
export function compareClientTableValues(a: ClientTableValue, b: ClientTableValue): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  return clientTableValueText(a).localeCompare(clientTableValueText(b), undefined, { numeric: true });
}

/**
 * A column's value for a row: its `accessor`, or `row[key]`. A raw value of
 * another type (a boolean, an object) is read as its text, so a column without
 * an accessor never throws.
 */
export function clientTableValueOf<Row>(column: ClientTableColumn<Row>, row: Row): ClientTableValue {
  if (column.accessor) return column.accessor(row);
  const raw = (row as Record<string, unknown>)[String(column.key)];
  if (raw === null || raw === undefined) return raw;
  if (typeof raw === 'string' || typeof raw === 'number' || raw instanceof Date) return raw;
  return String(raw);
}

/**
 * Filter (every column search must match, case-insensitive substring), then
 * sort. Always returns a new array and never mutates `rows`. With no sort, the
 * rows keep their input order; ties keep it too (the sort is stable). A filter
 * or sort key that names no column is ignored.
 */
export function applyClientTable<Row>(
  rows: readonly Row[],
  columns: readonly ClientTableColumn<Row>[],
  sort: SortState | null | undefined,
  filters: ColumnFilters | null | undefined,
): Row[] {
  const columnOf = (key: string) => columns.find((column) => String(column.key) === key);

  const active = Object.entries(filters ?? {})
    .map(([key, query]) => ({ column: columnOf(key), query: query.trim().toLowerCase() }))
    .filter((entry): entry is { column: ClientTableColumn<Row>; query: string } =>
      entry.column !== undefined && entry.query !== '');

  const filtered = rows.filter((row) =>
    active.every(({ column, query }) =>
      clientTableValueText(clientTableValueOf(column, row)).toLowerCase().includes(query)),
  );

  const sortColumn = sort ? columnOf(sort.key) : undefined;
  if (!sort || !sortColumn) return filtered;

  const direction = sort.direction === 'asc' ? 1 : -1;
  return filtered.sort((left, right) => {
    const a = clientTableValueOf(sortColumn, left);
    const b = clientTableValueOf(sortColumn, right);
    const aEmpty = isEmptyClientTableValue(a);
    const bEmpty = isEmptyClientTableValue(b);
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1;
    if (bEmpty) return -1;
    return compareClientTableValues(a, b) * direction;
  });
}

/** A header click: none → ascending → descending → none; another column starts at ascending. */
export function cycleSortState(current: SortState | null | undefined, key: string): SortState | null {
  if (!current || current.key !== key) return { key, direction: 'asc' };
  if (current.direction === 'asc') return { key, direction: 'desc' };
  return null;
}
