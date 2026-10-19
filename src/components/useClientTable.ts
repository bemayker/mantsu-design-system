import { useCallback, useMemo, useState } from 'react';

import { applyClientTable, type ClientTableColumn, type ColumnFilters } from './clientTable';
import type { SortState } from './Table';

export type { ClientTableColumn, ClientTableValue, ColumnFilters } from './clientTable';

/**
 * useClientTable — client-side sort and column search over the FULL row set,
 * before the screen paginates (UI-32).
 *
 * A screen pages its rows before handing them to a table, so a table that
 * sorted or filtered by itself would only ever cover the visible page. This
 * hook runs first instead:
 *
 *   screen's own filters (pane search, status) → useClientTable → paginate → ListTable
 *
 * Column searches combine (AND) with each other and, by composition, with
 * whatever the screen filtered before passing `rows`. Spread `listTableProps`
 * onto `ListTable`; a `DataTable` or `Table` consumer passes `rows` as its data
 * and wires sort and filters through its own props.
 *
 * Sort and column filters are each controlled when their prop is passed and
 * uncontrolled otherwise. `onPageReset` is called after every column filter
 * change, so the screen goes back to page 1; a sort change does not call it.
 */
export interface UseClientTableOptions<Row> {
  /** The full set, after the screen's own filters, before pagination. */
  rows: readonly Row[];
  /** Memoise these (or declare them outside the component): a new array re-sorts on every render. */
  columns: readonly ClientTableColumn<Row>[];
  /** Controlled sort. Omit for uncontrolled. */
  sort?: SortState | null;
  defaultSort?: SortState | null;
  onSortChange?: (sort: SortState | null) => void;
  /** Controlled column searches. Omit for uncontrolled. */
  columnFilters?: ColumnFilters;
  defaultColumnFilters?: ColumnFilters;
  onColumnFiltersChange?: (filters: Record<string, string>) => void;
  /** Called after every column filter change. */
  onPageReset?: () => void;
}

/** The props `useClientTable` hands to `ListTable`. */
export interface ClientTableListProps {
  sort: SortState | null;
  onSortChange: (sort: SortState | null) => void;
  columnFilters: ColumnFilters;
  onColumnFiltersChange: (filters: Record<string, string>) => void;
}

export interface UseClientTableResult<Row> {
  /** Filtered, then sorted; the input order when unsorted. Paginate these. */
  rows: Row[];
  sort: SortState | null;
  columnFilters: ColumnFilters;
  /**
   * Some column search is non-blank. A screen that shows an empty state instead
   * of the table at zero rows keeps the table up while this is true, so the
   * header menu that clears the search stays reachable.
   */
  hasColumnFilters: boolean;
  listTableProps: ClientTableListProps;
}

const NO_FILTERS: ColumnFilters = {};

export function useClientTable<Row>({
  rows,
  columns,
  sort: sortProp,
  defaultSort = null,
  onSortChange,
  columnFilters: filtersProp,
  defaultColumnFilters = NO_FILTERS,
  onColumnFiltersChange,
  onPageReset,
}: UseClientTableOptions<Row>): UseClientTableResult<Row> {
  const sortControlled = sortProp !== undefined;
  const [internalSort, setInternalSort] = useState<SortState | null>(defaultSort);
  const sort = sortControlled ? sortProp : internalSort;

  const filtersControlled = filtersProp !== undefined;
  const [internalFilters, setInternalFilters] = useState<ColumnFilters>(defaultColumnFilters);
  const columnFilters = filtersControlled ? filtersProp : internalFilters;

  const changeSort = useCallback(
    (next: SortState | null) => {
      if (!sortControlled) setInternalSort(next);
      onSortChange?.(next);
    },
    [sortControlled, onSortChange],
  );

  const changeColumnFilters = useCallback(
    (next: Record<string, string>) => {
      if (!filtersControlled) setInternalFilters(next);
      onColumnFiltersChange?.(next);
      onPageReset?.();
    },
    [filtersControlled, onColumnFiltersChange, onPageReset],
  );

  const sortedRows = useMemo(
    () => applyClientTable(rows, columns, sort, columnFilters),
    [rows, columns, sort, columnFilters],
  );

  const hasColumnFilters = Object.values(columnFilters).some((query) => query.trim() !== '');

  const listTableProps = useMemo<ClientTableListProps>(
    () => ({ sort, onSortChange: changeSort, columnFilters, onColumnFiltersChange: changeColumnFilters }),
    [sort, changeSort, columnFilters, changeColumnFilters],
  );

  return { rows: sortedRows, sort, columnFilters, hasColumnFilters, listTableProps };
}
