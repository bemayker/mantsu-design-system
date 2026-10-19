import { useEffect, useState, type RefObject } from 'react';

export interface DynamicPageSizeOptions {
  /** Minimum number of rows to show even when little space is available. */
  minRows?: number;
  /**
   * Vertical space (px) inside the measured element that is NOT available for
   * rows: the sticky table header, usually. See `LIST_TABLE_HEADER_HEIGHT`.
   */
  reservePx?: number;
  /**
   * Opaque value that forces a re-measure when it changes. Use it when the
   * measured element is conditionally rendered (e.g. only after data loads) so
   * the hook re-attaches its observers once the element exists.
   */
  recomputeKey?: unknown;
}

/**
 * useDynamicPageSize — how many rows of `rowHeight` (px) fit in `ref`, so a
 * full-page list fills the available height with a dynamic number of records
 * per page instead of a fixed ten (UI-33, moved here from Lists).
 *
 * `ref` must point at the element that holds the table and gets the remaining
 * height of the screen (`min-h-0 flex-1` in a flex column). Its own
 * `clientHeight` is the space available for the table and already excludes
 * siblings such as the toolbar above and the pagination footer below, so
 * `reservePx` only needs to cover the sticky table header rendered inside it.
 *
 * - `ListTable`: wrap it in `<div ref={ref} className="flex min-h-0 flex-1
 *   flex-col">` (its own scroll body is `flex-1`) and pass
 *   `LIST_TABLE_ROW_HEIGHT[density]` and `LIST_TABLE_HEADER_HEIGHT[density]`.
 * - `DataTable` / `Table`: their rows take the inherited line height, so the
 *   screen passes the row height it renders.
 *
 * Falls back to a viewport-relative estimate before the flex layout has sized
 * the element. Recomputes on layout and window resize. The screen paginates
 * with the result and clamps its page to the new page count, so a resize never
 * leaves the reader on a page that no longer exists.
 */
export function useDynamicPageSize(
  ref: RefObject<HTMLElement | null>,
  rowHeight: number,
  options: DynamicPageSizeOptions = {},
): number {
  const { minRows = 1, reservePx = 0, recomputeKey } = options;
  const [pageSize, setPageSize] = useState(minRows);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const compute = () => {
      // Primary: the element's own visible height (excludes footer/toolbar).
      let available = element.clientHeight - reservePx;
      if (available < rowHeight) {
        // Before flex layout settles, clientHeight can be ~0; estimate from
        // the viewport instead so we still render a sensible page size.
        const { top } = element.getBoundingClientRect();
        available = window.innerHeight - top - reservePx;
      }
      if (available <= 0) {
        return;
      }
      setPageSize(Math.max(minRows, Math.floor(available / rowHeight)));
    };

    compute();
    const raf = requestAnimationFrame(compute);
    const observer = new ResizeObserver(compute);
    observer.observe(element);
    observer.observe(document.body);
    window.addEventListener('resize', compute);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, [ref, rowHeight, minRows, reservePx, recomputeKey]);

  return pageSize;
}
