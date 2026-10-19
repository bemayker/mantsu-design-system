import { act, render, renderHook, screen } from '@testing-library/react';
import { useRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DataTable } from './DataTable';
import type { DataTableColumn } from './DataTable.types';
import {
  LIST_TABLE_HEADER_HEIGHT,
  LIST_TABLE_ROW_HEIGHT,
  ListTable,
  type ListTableColumn,
  type ListTableDensity,
} from './ListTable';
import { useDynamicPageSize } from './useDynamicPageSize';

// jsdom lays nothing out: every element measures 0 and has no ResizeObserver.
// The measured element reports `height`, and the observers are kept so a test
// can fire them the way a real layout change would.
let height = 0;
let observers: Array<() => void> = [];

class FakeResizeObserver {
  private readonly callback: () => void;
  constructor(callback: () => void) {
    this.callback = callback;
    observers.push(callback);
  }
  observe() {}
  disconnect() {
    observers = observers.filter((callback) => callback !== this.callback);
  }
}

const resizeTo = (next: number) =>
  act(() => {
    height = next;
    observers.forEach((callback) => callback());
  });

beforeEach(() => {
  height = 0;
  observers = [];
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (
    this: HTMLElement,
  ) {
    return this.dataset.measured === 'true' ? height : 0;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function measuredElement(top = 0): HTMLDivElement {
  const element = document.createElement('div');
  element.dataset.measured = 'true';
  element.getBoundingClientRect = () => ({ top }) as DOMRect;
  document.body.appendChild(element);
  return element;
}

describe('useDynamicPageSize', () => {
  it('fits as many whole rows as the element holds after the reserve', () => {
    height = 500;
    const ref = { current: measuredElement() };
    const { result } = renderHook(() => useDynamicPageSize(ref, 40, { reservePx: 44 }));
    expect(result.current).toBe(11); // (500 - 44) / 40 = 11.4
  });

  it('never goes below minRows', () => {
    height = 120;
    const ref = { current: measuredElement() };
    const { result } = renderHook(() => useDynamicPageSize(ref, 40, { minRows: 5 }));
    expect(result.current).toBe(5);
  });

  it('estimates from the viewport while the element has no height yet', () => {
    height = 0;
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800);
    const ref = { current: measuredElement(200) };
    const { result } = renderHook(() => useDynamicPageSize(ref, 50, { reservePx: 100 }));
    expect(result.current).toBe(10); // (800 - 200 - 100) / 50
  });

  it('re-measures when the layout or the window resizes', () => {
    height = 400;
    const ref = { current: measuredElement() };
    const { result } = renderHook(() => useDynamicPageSize(ref, 40));
    expect(result.current).toBe(10);

    resizeTo(820);
    expect(result.current).toBe(20);

    act(() => {
      height = 200;
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toBe(5);
  });

  it('starts at minRows and attaches once a late element exists, through recomputeKey', () => {
    height = 400;
    const ref: { current: HTMLElement | null } = { current: null };
    const { result, rerender } = renderHook(
      ({ key }: { key: number }) => useDynamicPageSize(ref, 40, { minRows: 3, recomputeKey: key }),
      { initialProps: { key: 0 } },
    );
    expect(result.current).toBe(3);

    ref.current = measuredElement();
    rerender({ key: 1 });
    expect(result.current).toBe(10);
  });

  it('stops listening on unmount', () => {
    height = 400;
    const ref = { current: measuredElement() };
    const { unmount } = renderHook(() => useDynamicPageSize(ref, 40));
    expect(observers).toHaveLength(1);
    unmount();
    expect(observers).toHaveLength(0);
  });
});

/* -------------------------------------------- with the tables it is built for */

interface Order {
  id: string;
  material: string;
}

const ORDERS: Order[] = Array.from({ length: 60 }, (_, index) => ({
  id: String(7000 + index),
  material: `Material ${index}`,
}));

const LIST_COLUMNS: ListTableColumn<Order>[] = [
  { key: 'id', header: 'Order', render: (r) => r.id, sortable: true, filterable: true },
  { key: 'material', header: 'Material', render: (r) => r.material },
];

/** The screen pattern the docblock prescribes, with the page clamped. */
function ListScreen({ density, page }: { density: ListTableDensity; page: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const pageSize = useDynamicPageSize(ref, LIST_TABLE_ROW_HEIGHT[density], {
    minRows: 3,
    reservePx: LIST_TABLE_HEADER_HEIGHT[density],
  });
  const pageCount = Math.max(1, Math.ceil(ORDERS.length / pageSize));
  const current = Math.min(page, pageCount);
  const rows = ORDERS.slice((current - 1) * pageSize, current * pageSize);
  return (
    <div className="flex h-screen flex-col">
      <div ref={ref} data-measured="true" className="flex min-h-0 flex-1 flex-col">
        <ListTable
          columns={LIST_COLUMNS}
          rows={rows}
          rowKey={(r) => r.id}
          rowTestId={(r) => `order-${r.id}`}
          density={density}
          testId="orders"
        />
      </div>
      <p data-testid="page">{`${current}/${pageCount}`}</p>
    </div>
  );
}

const rowCount = () => screen.getAllByTestId(/^order-\d+$/).length;

describe('useDynamicPageSize with ListTable', () => {
  it.each<ListTableDensity>(['picker', 'compact', 'modal'])(
    'fills the %s body with the rows that fit and follows a resize',
    (density) => {
      const rows = 12;
      height = LIST_TABLE_HEADER_HEIGHT[density] + rows * LIST_TABLE_ROW_HEIGHT[density] + 10;
      render(<ListScreen density={density} page={1} />);
      expect(rowCount()).toBe(rows);

      resizeTo(LIST_TABLE_HEADER_HEIGHT[density] + 20 * LIST_TABLE_ROW_HEIGHT[density]);
      expect(rowCount()).toBe(20);
    },
  );

  it('keeps the reader on a valid page when a taller window leaves fewer pages', () => {
    height = LIST_TABLE_HEADER_HEIGHT.compact + 5 * LIST_TABLE_ROW_HEIGHT.compact;
    render(<ListScreen density="compact" page={12} />);
    expect(screen.getByTestId('page')).toHaveTextContent('12/12');

    resizeTo(LIST_TABLE_HEADER_HEIGHT.compact + 20 * LIST_TABLE_ROW_HEIGHT.compact);
    expect(screen.getByTestId('page')).toHaveTextContent('3/3');
    expect(rowCount()).toBe(20);
  });
});

const DATA_COLUMNS: DataTableColumn<Order>[] = [
  { key: 'id', header: 'Order' },
  { key: 'material', header: 'Material' },
];

/** DataTable rows take the inherited line height; the screen names it. */
const DATA_ROW_HEIGHT = 49;
const DATA_HEADER_HEIGHT = 45;

function DataScreen() {
  const ref = useRef<HTMLDivElement>(null);
  const [page] = useState(1);
  const pageSize = useDynamicPageSize(ref, DATA_ROW_HEIGHT, { reservePx: DATA_HEADER_HEIGHT });
  const rows = ORDERS.slice((page - 1) * pageSize, page * pageSize);
  return (
    <div ref={ref} data-measured="true" className="min-h-0 flex-1 overflow-auto">
      <DataTable columns={DATA_COLUMNS} data={rows} />
    </div>
  );
}

describe('useDynamicPageSize with DataTable', () => {
  it('fills the scroll body with the rows that fit and follows a resize', () => {
    height = DATA_HEADER_HEIGHT + 8 * DATA_ROW_HEIGHT;
    render(<DataScreen />);
    expect(screen.getAllByTestId(/^data-table-row-/)).toHaveLength(8);

    resizeTo(DATA_HEADER_HEIGHT + 14 * DATA_ROW_HEIGHT);
    expect(screen.getAllByTestId(/^data-table-row-/)).toHaveLength(14);
  });
});
