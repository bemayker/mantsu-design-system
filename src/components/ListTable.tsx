import { useCallback, useState } from 'react';
import type { HTMLAttributes, KeyboardEvent, MouseEvent, ReactNode } from 'react';

import { cycleSortState, type ClientTableValue, type ColumnFilters } from './clientTable';
import {
  ColumnMenu,
  ColumnOptionsButton,
  DEFAULT_COLUMN_MENU_LABELS,
  SortHeaderButton,
  columnMenuAnchor,
  type ColumnMenuLabels,
} from './ColumnMenu';
import { cn } from './cn';
import type { SortState } from './Table';

export { DEFAULT_COLUMN_MENU_LABELS, type ColumnMenuLabels } from './ColumnMenu';

/**
 * ListTable — the Make list table (UI-20.3, promoted from the Order Cockpit).
 *
 * Chrome only: a white sticky header, rows that position and style cells, a
 * row click that is also reachable by Enter and Space, and a selected row
 * tinted `bg-selected-blue`, with a `primary-blue` bar on its first cell, and
 * marked `data-selected`. It never sorts or filters the
 * rows it is given: a screen pages its rows first, so a table that reordered
 * them would only ever reorder one page. `DataTable` (Core's adapter over
 * `Table`) is a different design, not a heavier version of this one.
 *
 * Sort and column search, opt-in per column (UI-32): a column with `sortable`
 * gets a header button that cycles ascending, descending, off, and a column
 * with `sortable` or `filterable` gets `Table`'s options button and column
 * menu (sort ascending / descending / clear, search in column). Both are
 * controlled only: the table reports through `onSortChange` and
 * `onColumnFiltersChange` and shows `sort` and `columnFilters`. The state and
 * the sorting itself live in `useClientTable`, which runs on the full row set
 * before pagination; spread its `listTableProps` here and pass one page of
 * its `rows`. A flagged column with no handlers renders its controls and
 * changes nothing. A flagged column should set `accessor`, because the
 * default `row[key]` rarely matches a `render`-only column's synthetic key.
 * `aria-sort` is set on the sorted header only. The only state held here is
 * which column menu is open. A column with neither flag renders exactly as
 * before.
 *
 * Three densities, one per recorded surface: `picker` (px 24, 16px bold
 * header), `compact` (px 16, 14px bold header, truncated cells) and `modal`
 * (px 8, 16px bold header). A new recorded surface adds a density here.
 *
 * `rowProps` merges attributes over each row; its `className` is appended,
 * so a consumer adds a highlight (an active-run accent) without losing the
 * borders and hover.
 */
export interface ListTableColumn<Row> {
  /** Stable per column; the React key and nothing else. */
  key: string;
  header: string;
  render: (row: Row) => ReactNode;
  /** Applied to the header and the body cell alike: widths, alignment. */
  className?: string;
  /** Header sort button and the menu's sort items. Default off. */
  sortable?: boolean;
  /** The menu's "search in column" field. Default off. */
  filterable?: boolean;
  /**
   * The value `useClientTable` sorts and filters on; this table never reads
   * it. Defaults to `row[key]`.
   */
  accessor?: (row: Row) => ClientTableValue;
}

/**
 * Extra attributes for one row, merged over the base ones. `className` is
 * appended rather than replaced, so a consumer adds a highlight without
 * losing the recorded borders and hover.
 */
export type ListTableRowProps = HTMLAttributes<HTMLTableRowElement> &
  Record<`data-${string}`, string | undefined>;

export type ListTableDensity = 'picker' | 'compact' | 'modal';

export interface ListTableProps<Row> {
  columns: readonly ListTableColumn<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  rowTestId: (row: Row) => string;
  onRowClick?: (row: Row) => void;
  /** The row matching this key renders the selected tint and `data-selected`. */
  selectedKey?: string | null;
  rowProps?: (row: Row) => ListTableRowProps;
  density?: ListTableDensity;
  testId: string;
  ariaLabel?: string;
  /** The sorted column, shown by its arrow and `aria-sort`. */
  sort?: SortState | null;
  /** The next sort after a header click or a menu choice; `null` clears it. */
  onSortChange?: (sort: SortState | null) => void;
  /** The search text per column key. */
  columnFilters?: ColumnFilters;
  /** The whole next record; a column whose text becomes `''` is removed from it. */
  onColumnFiltersChange?: (filters: Record<string, string>) => void;
  /** Merged over `DEFAULT_COLUMN_MENU_LABELS`, for a translated screen. */
  columnMenuLabels?: Partial<ColumnMenuLabels>;
}

const HEADER_CELL: Readonly<Record<ListTableDensity, string>> = {
  picker: 'px-6 py-3 text-[16px] font-bold leading-5',
  compact: 'px-4 py-3 text-[14px] font-bold leading-5',
  modal: 'px-2 py-3 text-[16px] font-bold leading-5',
};

const HEADER_BORDER: Readonly<Record<ListTableDensity, string>> = {
  picker: 'border-b border-[#d9d9d9]',
  compact: 'border-b border-slate-200',
  modal: 'border-b border-slate-200',
};

const ROW_BORDER: Readonly<Record<ListTableDensity, string>> = {
  picker: 'border-b border-[#d9d9d9]',
  compact: 'border-b border-slate-200',
  modal: 'border-b border-slate-200',
};

/** The selected row's accent: an inset bar, so it shifts no column. */
const SELECTED_BAR = 'shadow-[inset_4px_0_0_theme(colors.primary-blue)]';

/** The options button is paired with the header text size, as in `Table`. */
const OPTIONS_SIZE: Readonly<Record<ListTableDensity, string>> = {
  picker: 'size-6',
  compact: 'size-5',
  modal: 'size-6',
};

const NO_FILTERS: ColumnFilters = {};

const BODY_CELL: Readonly<Record<ListTableDensity, string>> = {
  picker: 'px-6 py-2 text-[14px] leading-6',
  compact: 'overflow-hidden text-ellipsis whitespace-nowrap px-4 py-2 text-[14px] leading-6',
  modal: 'px-2 py-2 text-[14px] leading-6',
};

/**
 * One body row's height (px) per density, for `useDynamicPageSize` (UI-33):
 * `py-2` plus a 24px line, plus the 1px row rule. A cell whose content wraps
 * makes its row taller; the body then scrolls rather than clips.
 */
export const LIST_TABLE_ROW_HEIGHT: Readonly<Record<ListTableDensity, number>> = {
  picker: 41,
  compact: 41,
  modal: 41,
};

/**
 * The sticky header's height (px) per density, the `reservePx` to pass to
 * `useDynamicPageSize`: `py-3` plus the taller of the 20px line and the
 * column options button (24px, 20px in `compact`), plus the 1px rule, with
 * one pixel of slack for the inline button's baseline.
 */
export const LIST_TABLE_HEADER_HEIGHT: Readonly<Record<ListTableDensity, number>> = {
  picker: 50,
  compact: 46,
  modal: 50,
};

export function ListTable<Row>({
  columns,
  rows,
  rowKey,
  rowTestId,
  onRowClick,
  selectedKey = null,
  rowProps,
  density = 'picker',
  testId,
  ariaLabel,
  sort = null,
  onSortChange,
  columnFilters = NO_FILTERS,
  onColumnFiltersChange,
  columnMenuLabels,
}: ListTableProps<Row>) {
  const clickable = onRowClick !== undefined;
  const labels: ColumnMenuLabels = columnMenuLabels
    ? { ...DEFAULT_COLUMN_MENU_LABELS, ...columnMenuLabels }
    : DEFAULT_COLUMN_MENU_LABELS;

  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [menu, setMenu] = useState<{ key: string; anchor: HTMLElement; x: number; y: number } | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  // The header is sticky, so a vertical scroll leaves the anchor in place and
  // only a horizontal one moves it.
  const reanchorMenu = useCallback(
    () => setMenu((current) => current && { ...current, ...columnMenuAnchor(current.anchor) }),
    [],
  );

  const openMenu = (event: MouseEvent<HTMLButtonElement>, key: string) => {
    event.stopPropagation(); // the window listener would close the menu again
    const anchor = event.currentTarget;
    setMenu({ key, anchor, ...columnMenuAnchor(anchor) });
  };

  const setSort = (key: string, direction: SortState['direction'] | null) =>
    onSortChange?.(direction ? { key, direction } : null);

  const setFilter = (key: string, value: string) => {
    const next: Record<string, string> = { ...columnFilters };
    if (value) next[key] = value;
    else delete next[key];
    onColumnFiltersChange?.(next);
  };

  const renderHeader = (column: ListTableColumn<Row>) => {
    const headerClassName = cn(
      'text-left text-primary-neutral',
      HEADER_CELL[density],
      column.className,
    );
    if (!column.sortable && !column.filterable) {
      return (
        <th key={column.key} scope="col" className={headerClassName}>
          {column.header}
        </th>
      );
    }

    const active = sort?.key === column.key ? sort.direction : null;
    const hasFilter = !!columnFilters[column.key]?.trim();
    return (
      <th
        key={column.key}
        scope="col"
        aria-sort={active === 'asc' ? 'ascending' : active === 'desc' ? 'descending' : undefined}
        className={headerClassName}
      >
        {/* Inline, so `column.className` alignment (`text-right`) still applies. */}
        <span className="inline-flex items-center gap-1">
          {column.sortable ? (
            <SortHeaderButton
              label={<span>{column.header}</span>}
              name={column.header}
              active={active}
              onClick={() => onSortChange?.(cycleSortState(sort, column.key))}
              testId={`${testId}-sort-${column.key}`}
              labels={labels}
            />
          ) : (
            column.header
          )}
          <ColumnOptionsButton
            name={column.header}
            sizeClass={OPTIONS_SIZE[density]}
            highlighted={menu?.key === column.key || hasFilter}
            onClick={(event) => openMenu(event, column.key)}
            testId={`${testId}-options-${column.key}`}
            labels={labels}
          />
        </span>
      </th>
    );
  };

  const menuColumn = menu ? columns.find((column) => column.key === menu.key) : undefined;

  const onRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, row: Row) => {
    if (!clickable) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    // Space scrolls the container otherwise, which moves the row the
    // operator was about to activate out from under the pointer.
    event.preventDefault();
    onRowClick(row);
  };

  return (
    <div ref={setContainer} data-testid={testId} className="flex-1 overflow-auto bg-white">
      <table className="w-full lining-nums tabular-nums" aria-label={ariaLabel}>
        <thead className={cn('sticky top-0 z-10 bg-white', HEADER_BORDER[density])}>
          <tr>
            {columns.map(renderHeader)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = rowKey(row);
            const selected = selectedKey !== null && selectedKey === key;
            const { className: extraClassName, ...extra } = rowProps?.(row) ?? {};

            return (
              <tr
                key={key}
                data-testid={rowTestId(row)}
                data-selected={selected ? 'true' : undefined}
                tabIndex={clickable ? 0 : undefined}
                onClick={clickable ? () => onRowClick(row) : undefined}
                onKeyDown={(event) => onRowKeyDown(event, row)}
                className={cn(
                  'transition-colors',
                  // One background per state: `cn` does not merge classes, so a
                  // selected row that also carried `bg-white` would leave the
                  // winner to stylesheet order.
                  selected ? 'bg-selected-blue' : 'bg-white hover:bg-slate-50',
                  ROW_BORDER[density],
                  clickable &&
                    'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-blue',
                  extraClassName,
                )}
                {...extra}
              >
                {columns.map((column, index) => (
                  <td
                    key={column.key}
                    className={cn(
                      'text-slate-950',
                      BODY_CELL[density],
                      // The tint alone is too close to white to find on a
                      // shop-floor screen; the bar on the first cell is what
                      // the eye catches. A `tr` takes no box-shadow reliably.
                      selected && index === 0 && SELECTED_BAR,
                      column.className,
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      {menu && menuColumn && (
        <ColumnMenu
          x={menu.x}
          y={menu.y}
          header={menuColumn.header}
          sortable={!!menuColumn.sortable}
          filterable={!!menuColumn.filterable}
          direction={sort?.key === menu.key ? sort.direction : null}
          filterValue={columnFilters[menu.key] ?? ''}
          onSort={(direction) => setSort(menu.key, direction)}
          onFilter={(value) => setFilter(menu.key, value)}
          onClose={closeMenu}
          labels={labels}
          scrollContainer={container}
          onContainerScroll={reanchorMenu}
        />
      )}
    </div>
  );
}
