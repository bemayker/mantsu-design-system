import type { HTMLAttributes, KeyboardEvent, ReactNode } from 'react';

import { cn } from './cn';

/**
 * ListTable — the Make list table (UI-20.3, promoted from the Order Cockpit).
 *
 * Chrome only: a white sticky header, rows that position and style cells, a
 * row click that is also reachable by Enter and Space, and a selected row
 * tinted `bg-frost` and marked `data-selected`. It holds no state and never
 * sorts or filters; that is `DataTable` (Core's adapter over `Table`), which
 * is a different design, not a heavier version of this one.
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

const BODY_CELL: Readonly<Record<ListTableDensity, string>> = {
  picker: 'px-6 py-2 text-[14px] leading-6',
  compact: 'overflow-hidden text-ellipsis whitespace-nowrap px-4 py-2 text-[14px] leading-6',
  modal: 'px-2 py-2 text-[14px] leading-6',
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
}: ListTableProps<Row>) {
  const clickable = onRowClick !== undefined;

  const onRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, row: Row) => {
    if (!clickable) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    // Space scrolls the container otherwise, which moves the row the
    // operator was about to activate out from under the pointer.
    event.preventDefault();
    onRowClick(row);
  };

  return (
    <div data-testid={testId} className="flex-1 overflow-auto bg-white">
      <table className="w-full lining-nums tabular-nums" aria-label={ariaLabel}>
        <thead className={cn('sticky top-0 z-10 bg-white', HEADER_BORDER[density])}>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'text-left text-primary-neutral',
                  HEADER_CELL[density],
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
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
                  'bg-white transition-colors hover:bg-slate-50',
                  ROW_BORDER[density],
                  clickable &&
                    'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-blue',
                  selected && 'bg-frost',
                  extraClassName,
                )}
                {...extra}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn('text-slate-950', BODY_CELL[density], column.className)}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
