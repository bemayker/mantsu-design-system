import React from 'react';
import { createPortal } from 'react-dom';

import { cn } from './cn';
import { useEscapeKey } from './useEscapeKey';

/**
 * The header pieces `Table` and `ListTable` share: the sort button, the
 * options button and the column menu it opens (UI-32).
 *
 * Moved out of `Table.tsx` unchanged in markup and classes, so both tables
 * have one menu with one keyboard and screen-reader behaviour and the two
 * cannot drift. Internal: not exported from the package root, except the
 * label type and its defaults, which `ListTable` re-exports.
 */

/** The SortDirection of `Table`, restated here so this module imports nothing from it. */
type Direction = 'asc' | 'desc';

/**
 * Every string the header controls show. The defaults are `Table`'s English
 * text; a translated screen passes its own (`ListTable`'s `columnMenuLabels`).
 */
export interface ColumnMenuLabels {
  sortAscending: string;
  sortDescending: string;
  clearSort: string;
  clearSearch: string;
  /** Accessible name of a header's sort button. */
  sortBy: (name: string) => string;
  /** Accessible name of a header's options button and of its menu. */
  options: (name: string) => string;
  /** Accessible name of the menu's search field. */
  searchLabel: (name: string) => string;
  searchPlaceholder: (name: string) => string;
}

export const DEFAULT_COLUMN_MENU_LABELS: ColumnMenuLabels = {
  sortAscending: 'Sort ascending',
  sortDescending: 'Sort descending',
  clearSort: 'Clear sort',
  clearSearch: 'Clear search',
  sortBy: (name) => `Sort by ${name}`,
  options: (name) => `${name} options`,
  searchLabel: (name) => `Search ${name}`,
  searchPlaceholder: (name) => `Search ${name}…`,
};

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

/* ------------------------------------------------------------ header buttons */

export interface SortHeaderButtonProps {
  /** The visible (or `sr-only`) header content. */
  label: React.ReactNode;
  /** The column's accessible name, used in the button's label. */
  name: string;
  /** The direction this column is sorted in, or `null` when it is not the sorted column. */
  active: Direction | null;
  onClick: () => void;
  testId?: string;
  labels?: ColumnMenuLabels;
}

/** Click to cycle the column's sort; the arrow shows the active direction. */
export const SortHeaderButton: React.FC<SortHeaderButtonProps> = ({
  label, name, active, onClick, testId, labels = DEFAULT_COLUMN_MENU_LABELS,
}) => (
  <button
    type="button"
    onClick={onClick}
    data-testid={testId}
    className="group inline-flex items-center gap-1 rounded-sm outline-none hover:text-midnight focus-visible:ring-2 focus-visible:ring-primary-blue/40"
    aria-label={labels.sortBy(name)}
  >
    {label}
    <span className={cn('text-primary-blue transition-opacity', !active && 'opacity-0 group-hover:opacity-40')}>
      {active === 'desc' ? <ArrowDown /> : <ArrowUp />}
    </span>
  </button>
);

export interface ColumnOptionsButtonProps {
  /** The column's accessible name, used in the button's label. */
  name: string;
  /** `size-5` or `size-6`, paired with the header's text size. */
  sizeClass: string;
  /** Tinted while its menu is open or its column has a search. */
  highlighted: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  testId?: string;
  labels?: ColumnMenuLabels;
}

/** Opens the column menu. */
export const ColumnOptionsButton: React.FC<ColumnOptionsButtonProps> = ({
  name, sizeClass, highlighted, onClick, testId, labels = DEFAULT_COLUMN_MENU_LABELS,
}) => (
  <button
    type="button"
    onClick={onClick}
    data-testid={testId}
    aria-label={labels.options(name)}
    aria-haspopup="menu"
    className={cn(
      'flex shrink-0 items-center justify-center rounded-sm text-slate-400',
      sizeClass,
      'hover:bg-slate-200/70 hover:text-midnight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue/40',
      highlighted && 'bg-slate-200/70 text-primary-blue'
    )}
  >
    <Options />
  </button>
);

/** Where the menu opens: 4px under the options button, right edges aligned. */
export function columnMenuAnchor(element: HTMLElement): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  return { x: rect.right - 220, y: rect.bottom + 4 };
}

/* -------------------------------------------------------------- column menu */

export interface ColumnMenuProps {
  x: number;
  y: number;
  header: string;
  sortable: boolean;
  filterable: boolean;
  direction: Direction | null;
  filterValue: string;
  onSort: (direction: Direction | null) => void;
  onFilter: (value: string) => void;
  onClose: () => void;
  labels?: ColumnMenuLabels;
  /**
   * A scroll of this element calls `onContainerScroll` instead of closing the
   * menu. `ListTable` passes its own scroll container: a search that shrinks
   * the rows clamps its `scrollTop`, which fires `scroll` while the operator
   * types. Every other scroll still closes the menu.
   */
  scrollContainer?: HTMLElement | null;
  /** Re-anchor the menu after `scrollContainer` scrolled. */
  onContainerScroll?: () => void;
}

export const ColumnMenu: React.FC<ColumnMenuProps> = ({
  x, y, header, sortable, filterable, direction, filterValue, onSort, onFilter, onClose,
  labels = DEFAULT_COLUMN_MENU_LABELS, scrollContainer, onContainerScroll,
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

  // Mounted only while open, so always an active registrant. The shared stack
  // is what keeps Escape from also closing a `Modal` or `SideDrawer` this menu
  // was opened inside.
  useEscapeKey(true, onClose);

  React.useEffect(() => {
    const close = () => onClose();
    const scroll = (event: Event) => {
      if (scrollContainer && event.target === scrollContainer) onContainerScroll?.();
      else onClose();
    };
    window.addEventListener('click', close);
    window.addEventListener('contextmenu', close);
    window.addEventListener('scroll', scroll, true);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('contextmenu', close);
      window.removeEventListener('scroll', scroll, true);
    };
  }, [onClose, scrollContainer, onContainerScroll]);

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
      aria-label={labels.options(header)}
      className="fixed z-50 min-w-[220px] overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-mantsu-lg"
      style={{ top: pos.y, left: pos.x }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {sortable && (
        <>
          {item(labels.sortAscending, direction === 'asc', direction === 'asc' ? <Check /> : <ArrowUp />,
            () => { onSort('asc'); onClose(); })}
          {item(labels.sortDescending, direction === 'desc', direction === 'desc' ? <Check /> : <ArrowDown />,
            () => { onSort('desc'); onClose(); })}
          {item(labels.clearSort, false, null, () => { onSort(null); onClose(); })}
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
              placeholder={labels.searchPlaceholder(header)}
              aria-label={labels.searchLabel(header)}
              className="w-full bg-transparent text-body-sm text-midnight outline-none placeholder:text-slate-400"
            />
            {filterValue && (
              <button
                type="button"
                aria-label={labels.clearSearch}
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
