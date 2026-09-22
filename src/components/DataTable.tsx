/**
 * DataTable — the opinionated adapter over `Table` that the screens actually use.
 *
 * ## Why this is in the package as well as `Table`
 *
 * `Table` is the primitive: columns, sorting, filtering, skeleton rows.
 * `DataTable` is the set of decisions two apps made ON TOP of it, and made
 * identically: row selection and its tint, archived dimming, hiding secondary
 * columns while a detail drawer takes the width, the responsive collapse, and
 * the `data-table-row-{id}` test ids screens' specs key on. Two apps arriving
 * at the same adapter independently is the case a design system exists for.
 *
 * ## Provenance, and what was folded in
 *
 * Core wrote it (`mantsu-core/frontend/src/components/shared/DataTable`) and
 * Downtimes vendored it (DT-FND-11), adding four things its VENDORED.md
 * documents as general rather than app-specific: `onRowDoubleClick`,
 * `rowTestId`, `rowClassName` and `rowProps`. This is Downtimes' superset,
 * which is the UI-4 rule applied again — fold the divergence in rather than
 * arbitrate between the copies.
 *
 * UI-5 measured that `DataTable` was the only component two apps shared and
 * this package did not have, and deliberately did NOT promote it: from Core's
 * side alone the shell could not tell whether the two were one component or
 * two that share a name. UI-6 is where both sides are visible, and they are one
 * component — identical prop names in identical order, over the same body.
 */
import type { ReactNode } from 'react';

import { cn } from './cn';
import { Table, type Column as DsColumn, type SortState } from './Table';
import type { DataTableColumn, DataTableSort } from './DataTable.types';

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  idKey?: keyof T;
  onRowClick?: (row: T) => void;
  onRowContextMenu?: (row: T, event: React.MouseEvent) => void;
  /** DT-FND-11 extension: forwarded to the DS `Table`'s `onRowDoubleClick`. */
  onRowDoubleClick?: (row: T) => void;
  selectedId?: string | number;
  /**
   * When true, columns marked `secondary` (or absent from
   * `primaryColumnKeys` when it is provided) are hidden, keeping only the
   * identifying columns visible alongside the open `DetailDrawer` (AC3).
   */
  drawerOpen?: boolean;
  primaryColumnKeys?: Array<keyof T | string>;
  emptyState?: ReactNode;
  className?: string;
  /**
   * Dense header variant (CORE-EQ-3). Maps to the vendored DS Table's
   * `density='compact'` (12px bold, tighter `px-3 py-1.5`); the default maps to
   * `density='large'`. Default `false`.
   */
  denseHeader?: boolean;
  /**
   * When it returns `true` for a row, that row renders dimmed and italicised
   * (CORE-EQ-3, AC5). Omitted (the default) leaves row styling unaffected.
   */
  isRowArchived?: (row: T) => boolean;
  /**
   * Renders `skeletonRowCount` placeholder rows instead of `data` (CORE-EQ-3,
   * AC9). `emptyState` is only shown once loading is `false` and `data` is
   * empty. Default `false`.
   */
  loading?: boolean;
  /** Number of skeleton rows to render while `loading` is `true`. */
  skeletonRowCount?: number;
  /**
   * When `true` (CORE-EQ-3, AC10), `secondary` columns also collapse at the
   * tablet breakpoint (`md:hidden lg:table-cell`) regardless of `drawerOpen`.
   * Default `false`.
   */
  responsiveSecondaryCollapse?: boolean;
  /**
   * The active sort (CORE-PO-1 / CORE-FB-14). Keyed by the API sort column
   * (each column's `sortKey`). When provided together with `onSortChange`,
   * columns carrying a `sortKey` render as DS sort buttons; the active column
   * shows an asc/desc indicator. Omitting both reproduces the previous,
   * non-sortable header behaviour.
   */
  sort?: DataTableSort;
  /**
   * Fired when the DS header sort changes (CORE-FB-14). The payload's `key` is
   * the column's `sortKey` (the API sort column) and `dir` the explicit
   * direction; `null` means the sort was cleared (map it back to the screen's
   * default sort). Supersedes the old key-only, direction-flipping signature.
   */
  onSortChange?: (sort: DataTableSort | null) => void;
  /**
   * Enable the DS in-column search field per column (CORE-FB-14). Defaults to
   * `true`, except columns that have a `render` but no `accessor` (their cell
   * value is not a searchable primitive), for which it is disabled.
   */
  filterable?: boolean;
  /** Notified whenever the per-column search values change (CORE-FB-14). */
  onColumnFiltersChange?: (filters: Record<string, string>) => void;
  /**
   * DT-FND-11 extension: override the per-row `data-testid`. Defaults to
   * `data-table-row-${id}`. `coding_standards.md` §3.6 makes a `data-testid`
   * part of a component's public contract for testing, so a screen migrating
   * ONTO this adapter must be able to keep the row ids its specs already use
   * instead of rewriting every spec. The underlying DS `Table` already accepts
   * `rowTestId`; this only stops the adapter from hardcoding it.
   */
  rowTestId?: (row: T) => string;
  /**
   * DT-FND-11 extension: extra per-row classes, merged AFTER the adapter's own
   * (cursor, selected tint, archived dimming) so a screen can add a row accent
   * the adapter does not know about, e.g. the records table's left border on an
   * undeclared downtime. Returning `undefined` adds nothing.
   */
  rowClassName?: (row: T) => string | undefined;
  /**
   * DT-FND-11 extension: extra attributes on each body row, forwarded to the DS
   * `Table`'s own `rowProps`. Exists for `aria-selected`: the hand-written
   * tables this adapter replaces set it on the selected row, and dropping it
   * would leave selection conveyed by a background tint alone.
   */
  rowProps?: (row: T) => Record<string, string | boolean | undefined> | undefined;
}

function getCellValue<T>(row: T, key: keyof T | string): unknown {
  return (row as Record<string, unknown>)[key as string];
}

function isColumnVisible<T>(
  column: DataTableColumn<T>,
  drawerOpen: boolean | undefined,
  primaryColumnKeys: Array<keyof T | string> | undefined,
): boolean {
  if (!drawerOpen) return true;
  if (primaryColumnKeys) return primaryColumnKeys.includes(column.key);
  return !column.secondary;
}

/**
 * Config-driven data table. A thin adapter over the vendored design-system
 * `Table<T>` (`../dsTable/Table`), preserving `DataTable`'s external prop and
 * testid contract (`data-table`, `data-table-row-${id}`,
 * `data-table-header-${key}`, `data-table-skeleton-row-${i}`) while gaining the
 * DS per-column header sort and in-column search. Drawer-open column hiding,
 * `bg-frost` selected-row highlighting, archived-row dimming, and the loading
 * skeletons are mapped onto the DS component's extension points.
 */
export function DataTable<T>({
  columns,
  data,
  idKey = 'id' as keyof T,
  onRowClick,
  onRowContextMenu,
  onRowDoubleClick,
  selectedId,
  drawerOpen,
  primaryColumnKeys,
  emptyState,
  className,
  denseHeader = false,
  isRowArchived,
  loading = false,
  skeletonRowCount = 4,
  responsiveSecondaryCollapse = false,
  sort,
  onSortChange,
  filterable = true,
  onColumnFiltersChange,
  rowTestId,
  rowClassName: extraRowClassName,
  rowProps,
}: DataTableProps<T>) {
  const visibleColumns = columns.filter((column) =>
    isColumnVisible(column, drawerOpen, primaryColumnKeys),
  );
  const sortEnabled = Boolean(onSortChange);

  // The DS Table keys its sort by the column key; `DataTable`'s external
  // contract keys sort by the API `sortKey`. Translate in both directions.
  const columnKeyForSortKey = (sortKey: string): string => {
    const column = columns.find((candidate) => candidate.sortKey === sortKey);
    return column ? String(column.key) : sortKey;
  };
  const sortKeyForColumnKey = (columnKey: string): string | undefined =>
    columns.find((candidate) => String(candidate.key) === columnKey)?.sortKey;

  const dsSort: SortState | null | undefined = sortEnabled
    ? sort
      ? { key: columnKeyForSortKey(sort.key), direction: sort.dir }
      : null
    : undefined;

  const handleDsSortChange = (next: SortState | null): void => {
    if (!onSortChange) return;
    if (!next) {
      onSortChange(null);
      return;
    }
    const apiKey = sortKeyForColumnKey(next.key);
    if (!apiKey) return;
    onSortChange({ key: apiKey, dir: next.direction });
  };

  const collapseClass = (column: DataTableColumn<T>): string | undefined =>
    responsiveSecondaryCollapse && column.secondary ? 'md:hidden lg:table-cell' : undefined;

  const dsColumns: DsColumn<T>[] = visibleColumns.map((column) => ({
    key: column.key,
    header: column.header,
    render: column.render,
    align: column.align,
    width: column.width,
    accessor: column.accessor,
    // A column is sortable only when it carries a `sortKey` and the consumer
    // wired `onSortChange`; otherwise headers stay non-interactive as before.
    sortable: sortEnabled ? Boolean(column.sortKey) : false,
    // In-column search needs a searchable primitive: disable it on rendered
    // columns that do not expose an `accessor`.
    filterable: filterable && !(column.render && !column.accessor),
    cellClassName: collapseClass(column),
    headerClassName: collapseClass(column),
  }));

  const rowClassName = (row: T): string | undefined => {
    const rowId = getCellValue(row, idKey) as string | number;
    return (
      cn(
        onRowClick && 'cursor-pointer',
        // DT-FND-11 extension: `!bg-frost`, not `bg-frost`. The DS `Table`
        // applies `hover:bg-slate-50` to EVERY row unconditionally, at the same
        // Tailwind specificity, so a selected row lost its tint while the
        // pointer was over it -- exactly the moment after a click, when the
        // operator is looking at it. The hand-written tables made the two
        // mutually exclusive (`isSelected ? 'bg-frost' : 'hover:bg-slate-50'`)
        // and so never had the problem.
        //
        // `!important` rather than adding `hover:bg-frost`: two utilities
        // setting the same property in the same variant are resolved by CSS
        // SOURCE ORDER, which depends on Tailwind's internal palette ordering
        // and is not something a caller should be betting on. The first attempt
        // did exactly that and still lost to `hover:bg-slate-50`.
        selectedId !== undefined && rowId === selectedId && '!bg-frost',
        (isRowArchived?.(row) ?? false) && 'italic opacity-60',
        // DT-FND-11 extension: caller classes last, so a screen accent wins a
        // conflict with the adapter's defaults rather than losing to them.
        extraRowClassName?.(row),
      ) || undefined
    );
  };

  return (
    <Table<T>
      testId="data-table"
      columns={dsColumns}
      data={data}
      density={denseHeader ? 'compact' : 'large'}
      sortable={false}
      filterable={filterable}
      sort={dsSort}
      onSortChange={sortEnabled ? handleDsSortChange : undefined}
      sortMode={sortEnabled ? 'external' : 'internal'}
      onColumnFiltersChange={onColumnFiltersChange}
      loading={loading}
      skeletonRowCount={skeletonRowCount}
      emptyState={emptyState}
      className={className}
      rowKey={(row) => String(getCellValue(row, idKey))}
      rowTestId={(row) =>
        // DT-FND-11 extension: caller override, same default as before.
        rowTestId?.(row) ?? `data-table-row-${String(getCellValue(row, idKey))}`
      }
      rowClassName={rowClassName}
      rowProps={rowProps}
      onRowClick={onRowClick}
      onRowContextMenu={onRowContextMenu}
      onRowDoubleClick={onRowDoubleClick}
    />
  );
}
