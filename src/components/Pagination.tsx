import React from 'react';
import { cn } from './cn';

/**
 * Pagination — first / previous · summary · next / last (UI-20.1).
 *
 * The Make pager: four borderless chevron buttons around a one-line summary,
 * centred. Chrome only: the caller owns the page maths and the wording, so the
 * summary and the four button names arrive already translated. This package
 * carries no i18n, and `getPageRange` below does the arithmetic every caller
 * used to repeat.
 *
 * Four copies of this lived in `mantsu-ui` (Cockpit, Downtimes, Lists, Core),
 * each with its own layout. This is the one they converge on.
 */
export interface PaginationLabels {
  first: string;
  previous: string;
  next: string;
  last: string;
}

export interface PaginationProps {
  /** Current page, 1-based. */
  page: number;
  /** Number of pages; at least 1 for an empty result. */
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Already translated, e.g. `1 to 10 of 23`. */
  summary: React.ReactNode;
  /** Accessible names of the four buttons, already translated. */
  labels: PaginationLabels;
  /** Render the first / last buttons. Default `true`. */
  showFirstLast?: boolean;
  /**
   * `data-testid` of the pager. The parts get `-first`, `-prev`, `-summary`,
   * `-next` and `-last` appended, so two pagers on one page stay distinct.
   */
  testId?: string;
  /** Accessible name of the `nav` landmark, e.g. `Pagination`. */
  ariaLabel?: string;
  className?: string;
}

const ChevronIcon = ({ d }: { d: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);

const FIRST = 'm11 17-5-5 5-5M18 17l-5-5 5-5';
const PREVIOUS = 'm15 18-6-6 6-6';
const NEXT = 'm9 18 6-6-6-6';
const LAST = 'm6 17 5-5-5-5M13 17l5-5-5-5';

const buttonClass =
  'rounded p-1 text-primary-neutral transition-opacity hover:opacity-60 ' +
  'disabled:cursor-not-allowed disabled:opacity-30 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue';

export const Pagination: React.FC<PaginationProps> = ({
  page, pageCount, onPageChange, summary, labels, showFirstLast = true, testId, ariaLabel, className,
}) => {
  const atFirst = page <= 1;
  const atLast = page >= pageCount;
  const part = (suffix: string) => (testId ? `${testId}-${suffix}` : undefined);
  const go = (target: number) => onPageChange(Math.min(Math.max(target, 1), Math.max(pageCount, 1)));

  return (
    <nav
      aria-label={ariaLabel}
      data-testid={testId}
      className={cn('flex items-center justify-center gap-[10px]', className)}
    >
      {showFirstLast && (
        <button type="button" onClick={() => go(1)} disabled={atFirst}
          aria-label={labels.first} data-testid={part('first')} className={buttonClass}>
          <ChevronIcon d={FIRST} />
        </button>
      )}
      <button type="button" onClick={() => go(page - 1)} disabled={atFirst}
        aria-label={labels.previous} data-testid={part('prev')} className={buttonClass}>
        <ChevronIcon d={PREVIOUS} />
      </button>
      <span data-testid={part('summary')}
        className="text-[14px] leading-[21px] text-primary-neutral tabular-nums">
        {summary}
      </span>
      <button type="button" onClick={() => go(page + 1)} disabled={atLast}
        aria-label={labels.next} data-testid={part('next')} className={buttonClass}>
        <ChevronIcon d={NEXT} />
      </button>
      {showFirstLast && (
        <button type="button" onClick={() => go(pageCount)} disabled={atLast}
          aria-label={labels.last} data-testid={part('last')} className={buttonClass}>
          <ChevronIcon d={LAST} />
        </button>
      )}
    </nav>
  );
};

export interface PageRange {
  /** Current page, clamped to `1..pageCount`. */
  page: number;
  pageCount: number;
  /** 1-based index of the first row on the page; 0 when there are no rows. */
  from: number;
  /** 1-based index of the last row on the page; 0 when there are no rows. */
  to: number;
}

/** The numbers a summary like `{from} to {to} of {total}` needs. */
export function getPageRange(page: number, pageSize: number, total: number): PageRange {
  const pageCount = Math.max(1, Math.ceil(total / Math.max(pageSize, 1)));
  const current = Math.min(Math.max(page, 1), pageCount);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);
  return { page: current, pageCount, from, to };
}

export default Pagination;
