import React from 'react';
import { createPortal } from 'react-dom';
import { cn } from './cn';
import { useEscapeKey } from './useEscapeKey';

/**
 * Table — data table with optional empty state.
 *
 * Header interactions:
 *  - Click a (sortable) header to cycle its sort: ascending → descending → off.
 *    An up/down arrow shows the active direction.
 *  - A small options button on the right of each header opens a context menu to
 *    set the sort explicitly and to search/filter within that column.
 *
 * Sorting and column search are uncontrolled by default; pass `sort` / `onSortChange`
 * (and read `onColumnFiltersChange`) to control them from the outside.
 */
export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  /** Allow clicking the header / menu to sort by this column. Defaults to the table's `sortable`. */
  sortable?: boolean;
  /** Show a "search in column" field in this column's menu. Defaults to the table's `filterable`. */
  filterable?: boolean;
  /** Value used for sorting / filtering. Defaults to `row[key]`. Use for computed columns. */
  accessor?: (row: T) => string | number | null | undefined;
}

export type SortDirection = 'asc' | 'desc';
export interface SortState {
  key: string;
  direction: SortDirection;
}

export type TableDensity = 'compact' | 'large';

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyState?: React.ReactNode;
  className?: string;
  /** Row spacing / font size. `compact` (default) fits more rows per page; `large` is roomier. */
  density?: TableDensity;
  /** Enable header sorting for every column (per-column `sortable` overrides). Default true. */
  sortable?: boolean;
  /** Enable the per-column search field in the header menu (per-column `filterable` overrides). Default true. */
  filterable?: boolean;
  /** Controlled sort. Omit for uncontrolled. */
  sort?: SortState | null;
  defaultSort?: SortState | null;
  onSortChange?: (sort: SortState | null) => void;
  /** Notified whenever the per-column search values change. */
  onColumnFiltersChange?: (filters: Record<string, string>) => void;
}

/* ------------------------------------------------------------------ icons */

const ArrowUp: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m18 15-6-6-6 6" />
  </svg>
);
const ArrowDown: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
const Options: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <line x1="4" y1="6" x2="20" y2="6" /><line x1="7" y1="12" x2="17" y2="12" /><line x1="10" y1="18" x2="14" y2="18" />
  </svg>
);
const SearchIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-400" aria-hidden>
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
);
const Check: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

/* -------------------------------------------------------------- column menu */

interface ColumnMenuProps {
  x: number;
  y: number;
  header: string;
  sortable: boolean;
  filterable: boolean;
  direction: SortDirection | null;
  filterValue: string;
  onSort: (direction: SortDirection | null) => void;
  onFilter: (value: string) => void;
  onClose: () => void;
}

const ColumnMenu: React.FC<ColumnMenuProps> = ({
  x, y, header, sortable, filterable, direction, filterValue, onSort, onFilter, onClose,
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [pos, setPos] = React.useState({ x, y });

  // Flip / clamp so the menu never overflows the viewport.
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const pad = 8;
    const nx = x + width > window.innerWidth - pad ? Math.max(pad, window.innerWidth - width - pad) : x;
    const ny = y + height > window.innerHeight - pad ? Math.max(pad, window.innerHeight - height - pad) : y;
    setPos({ x: nx, y: ny });
  }, [x, y]);

  // Focus the search field once, when the menu opens.
  React.useEffect(() => {
    if (filterable) inputRef.current?.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // This menu is mounted only while it is open, so it is always an active
  // registrant. The stack is what keeps Escape from also closing a `Modal` or
  // `SideDrawer` the menu was opened inside.
  useEscapeKey(true, onClose);

  React.useEffect(() => {
    const close = () => onClose();
    window.addEventListener('click', close);
    window.addEventListener('contextmenu', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('contextmenu', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [onClose]);

  const item = (label: string, active: boolean, icon: React.ReactNode, onClick: () => void) => (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-left text-body-sm hover:bg-frost',
        active ? 'text-primary-blue' : 'text-midnight'
      )}
    >
      <span className="flex size-3.5 shrink-0 items-center justify-center">{icon}</span>
      {label}
    </button>
  );

  // Portal to <body> so no ancestor transform/overflow shifts or clips the fixed menu.
  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={`${header} options`}
      className="fixed z-50 min-w-[220px] overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-mantsu-lg"
      style={{ top: pos.y, left: pos.x }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {sortable && (
        <>
          {item('Sort ascending', direction === 'asc', direction === 'asc' ? <Check /> : <ArrowUp />,
            () => { onSort('asc'); onClose(); })}
          {item('Sort descending', direction === 'desc', direction === 'desc' ? <Check /> : <ArrowDown />,
            () => { onSort('desc'); onClose(); })}
          {item('Clear sort', false, null, () => { onSort(null); onClose(); })}
        </>
      )}

      {sortable && filterable && <div className="my-1 h-px bg-slate-200" />}

      {filterable && (
        <div className="px-2 py-1.5">
          <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 focus-within:border-primary-blue focus-within:ring-2 focus-within:ring-primary-blue/30">
            <SearchIcon />
            <input
              ref={inputRef}
              type="text"
              value={filterValue}
              onChange={(e) => onFilter(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onClose(); }}
              placeholder={`Search ${header}…`}
              aria-label={`Search ${header}`}
              className="w-full bg-transparent text-body-sm text-midnight outline-none placeholder:text-slate-400"
            />
            {filterValue && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => onFilter('')}
                className="shrink-0 text-slate-400 hover:text-midnight"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

/* ---------------------------------------------------------------------- table */

const alignClass = (align?: Column<any>['align']) =>
  align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

const DENSITY = {
  compact: { th: 'px-3 py-1.5 text-body-xs-emphasis', td: 'px-3 py-1.5 text-body-sm', options: 'size-5' },
  large: { th: 'px-4 py-3 text-body-sm-emphasis', td: 'px-4 py-3 text-body', options: 'size-6' },
} as const;

export function Table<T extends Record<string, any>>({
  columns, data, emptyState, className,
  sortable = true, filterable = true, density = 'compact',
  sort: sortProp, defaultSort = null, onSortChange, onColumnFiltersChange,
}: TableProps<T>) {
  const d = DENSITY[density];
  const sortControlled = sortProp !== undefined;
  const [internalSort, setInternalSort] = React.useState<SortState | null>(defaultSort);
  const sort = sortControlled ? sortProp : internalSort;

  const [filters, setFilters] = React.useState<Record<string, string>>({});
  const [menu, setMenu] = React.useState<{ key: string; x: number; y: number } | null>(null);
  const closeMenu = React.useCallback(() => setMenu(null), []);

  const colOf = React.useCallback(
    (key: string) => columns.find((c) => String(c.key) === key),
    [columns]
  );
  const isSortable = (c: Column<T>) => c.sortable ?? sortable;
  const isFilterable = (c: Column<T>) => c.filterable ?? filterable;

  const commitSort = (next: SortState | null) => {
    if (sortControlled) onSortChange?.(next);
    else { setInternalSort(next); onSortChange?.(next); }
  };
  // Cycle a column header: none → asc → desc → none.
  const cycleSort = (key: string) => {
    if (!sort || sort.key !== key) commitSort({ key, direction: 'asc' });
    else if (sort.direction === 'asc') commitSort({ key, direction: 'desc' });
    else commitSort(null);
  };
  const setSort = (key: string, direction: SortDirection | null) =>
    commitSort(direction ? { key, direction } : null);

  const setFilter = (key: string, value: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (value) next[key] = value; else delete next[key];
      onColumnFiltersChange?.(next);
      return next;
    });
  };

  const valueOf = React.useCallback((col: Column<T>, row: T) => {
    if (col.accessor) return col.accessor(row);
    return row[col.key as keyof T];
  }, []);

  // filter → sort (derived view)
  const view = React.useMemo(() => {
    let rows = data;

    const active = Object.entries(filters).filter(([, v]) => v.trim());
    if (active.length) {
      rows = rows.filter((row) =>
        active.every(([key, q]) => {
          const col = colOf(key);
          if (!col) return true;
          const v = valueOf(col, row);
          return String(v ?? '').toLowerCase().includes(q.trim().toLowerCase());
        })
      );
    }

    if (sort) {
      const col = colOf(sort.key);
      if (col) {
        const dir = sort.direction === 'asc' ? 1 : -1;
        rows = [...rows].sort((a, b) => {
          const av = valueOf(col, a);
          const bv = valueOf(col, b);
          if (av == null && bv == null) return 0;
          if (av == null) return 1;   // nullish always sink to the bottom
          if (bv == null) return -1;
          if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
          return String(av).localeCompare(String(bv), undefined, { numeric: true }) * dir;
        });
      }
    }
    return rows;
  }, [data, filters, sort, colOf, valueOf]);

  const openMenu = (e: React.MouseEvent, key: string) => {
    e.stopPropagation(); // don't also toggle the header sort / close via window listener
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenu({ key, x: rect.right - 220, y: rect.bottom + 4 });
  };

  return (
    <div className={cn('overflow-hidden rounded-lg border border-slate-200 bg-white', className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-frost">
            {columns.map((c) => {
              const key = String(c.key);
              const canSort = isSortable(c);
              const canFilter = isFilterable(c);
              const active = sort?.key === key ? sort.direction : null;
              const hasFilter = !!filters[key]?.trim();
              return (
                <th
                  key={key}
                  aria-sort={active === 'asc' ? 'ascending' : active === 'desc' ? 'descending' : 'none'}
                  className={cn(
                    'border-b border-slate-200 text-slate-600',
                    d.th,
                    alignClass(c.align)
                  )}
                >
                  <div className="flex items-center gap-1">
                    {/* Label area takes all remaining width so the options button sits flush right. */}
                    <span
                      className={cn(
                        'flex min-w-0 flex-1 items-center gap-1',
                        c.align === 'right' ? 'justify-end' : c.align === 'center' ? 'justify-center' : 'justify-start'
                      )}
                    >
                      {canSort ? (
                        <button
                          type="button"
                          onClick={() => cycleSort(key)}
                          className="group inline-flex items-center gap-1 rounded-sm outline-none hover:text-midnight focus-visible:ring-2 focus-visible:ring-primary-blue/40"
                          aria-label={`Sort by ${c.header}`}
                        >
                          <span>{c.header}</span>
                          <span className={cn('text-primary-blue transition-opacity', !active && 'opacity-0 group-hover:opacity-40')}>
                            {active === 'desc' ? <ArrowDown /> : <ArrowUp />}
                          </span>
                        </button>
                      ) : (
                        <span>{c.header}</span>
                      )}
                    </span>

                    {(canSort || canFilter) && (
                      <button
                        type="button"
                        onClick={(e) => openMenu(e, key)}
                        aria-label={`${c.header} options`}
                        aria-haspopup="menu"
                        className={cn(
                          'flex shrink-0 items-center justify-center rounded-sm text-slate-400',
                          d.options,
                          'hover:bg-slate-200/70 hover:text-midnight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue/40',
                          (menu?.key === key || hasFilter) && 'bg-slate-200/70 text-primary-blue'
                        )}
                      >
                        <Options />
                      </button>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {view.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center">
                {emptyState ?? <span className="text-body text-slate-500">No data</span>}
              </td>
            </tr>
          ) : (
            view.map((row, i) => (
              <tr key={i} className="transition-colors hover:bg-slate-50">
                {columns.map((c) => (
                  <td
                    key={String(c.key)}
                    className={cn(
                      'border-b border-slate-200 text-midnight',
                      d.td,
                      alignClass(c.align)
                    )}
                  >
                    {c.render ? c.render(row) : String(row[c.key as keyof T] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {menu && (() => {
        const col = colOf(menu.key);
        if (!col) return null;
        return (
          <ColumnMenu
            x={menu.x}
            y={menu.y}
            header={col.header}
            sortable={isSortable(col)}
            filterable={isFilterable(col)}
            direction={sort?.key === menu.key ? sort.direction : null}
            filterValue={filters[menu.key] ?? ''}
            onSort={(dir) => setSort(menu.key, dir)}
            onFilter={(v) => setFilter(menu.key, v)}
            onClose={closeMenu}
          />
        );
      })()}
    </div>
  );
}
export default Table;
