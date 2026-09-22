import type { ReactNode } from 'react';

/**
 * A column as the `DataTable` ADAPTER takes it, which is not the same shape as
 * `Table`'s own `Column`.
 *
 * `Table` describes a column in terms of its own behaviour (`sortable`,
 * `filterable`, `cellClassName`). The adapter describes it in terms of the
 * screen's intent: `secondary` says "this column is not identifying, so hide it
 * when a detail drawer takes the width", and `sortKey` says "sorting this
 * column is a request to the SERVER, under this name". The adapter translates
 * one into the other.
 *
 * Named `DataTableColumn` rather than `Column` because both are exported from
 * this package and a consumer has to be able to say which one it means.
 *
 * Promoted at UI-6 from the two copies that had gone their own way in
 * `mantsu-core` and `mantsu-downtimes`. They turned out to be structurally
 * identical: same fields, same order, same optionality, differing only in which
 * ticket each doc comment cited.
 */
export interface DataTableColumn<T> {
  /** Property key on the row, or a synthetic string key when `render` is used. */
  key: keyof T | string;
  header: string;
  render?: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  /**
   * Marks the column as non-identifying: it is hidden while a detail drawer is
   * open. Columns without this flag, or explicitly listed in
   * `primaryColumnKeys`, always remain visible.
   */
  secondary?: boolean;
  /**
   * Fixed column width in px. When any visible column declares a `width`, the
   * adapter renders a `<colgroup>` and switches to `table-fixed`; columns
   * without `width` keep their natural flex sizing. Omitting it everywhere
   * reproduces the `table-auto` layout.
   */
  width?: number;
  /**
   * When set, the header renders as a sort button emitting this key through
   * `onSortChange`, with an asc/desc indicator when it is the active sort
   * column. Columns without a `sortKey` render a plain, non-interactive header,
   * so a consumer that never sorts is unaffected.
   */
  sortKey?: string;
  /**
   * Value used for the in-column search and the client-side sort. Defaults to
   * `row[key]`. Supply it on columns rendered via `render` — a translated name,
   * a formatted duration — so the per-column search matches the string the
   * operator can actually see rather than a non-primitive object.
   */
  accessor?: (row: T) => string | number | null | undefined;
}

/** The active sort, as the adapter reports and accepts it. */
export interface DataTableSort {
  key: string;
  dir: 'asc' | 'desc';
}
