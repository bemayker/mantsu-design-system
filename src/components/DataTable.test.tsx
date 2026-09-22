/**
 * Ported verbatim at UI-6 from the two apps that each had a copy of it.
 *
 * The two files were BYTE-IDENTICAL, which is the clearest evidence there
 * was that `DataTable` is one component rather than two sharing a name. Only
 * the column type's import changed, because the package has to distinguish
 * the adapter's `DataTableColumn` from `Table`'s own `Column`.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DataTable } from './DataTable';
import type { DataTableColumn } from './DataTable.types';

interface Plant {
  id: number;
  name: string;
  code: string;
  region: string;
}

const columns: DataTableColumn<Plant>[] = [
  { key: 'name', header: 'Name' },
  { key: 'code', header: 'Code' },
  { key: 'region', header: 'Region', secondary: true },
];

const data: Plant[] = [
  { id: 1, name: 'Antwerp Plant', code: 'ANT-01', region: 'Belgium' },
  { id: 2, name: 'Ghent Plant', code: 'GNT-02', region: 'Belgium' },
];

describe('DataTable', () => {
  it('renders every column when the drawer is closed', () => {
    render(<DataTable columns={columns} data={data} drawerOpen={false} />);

    expect(screen.getByTestId('data-table-header-name')).toBeInTheDocument();
    expect(screen.getByTestId('data-table-header-code')).toBeInTheDocument();
    expect(screen.getByTestId('data-table-header-region')).toBeInTheDocument();
  });

  it('hides secondary columns and keeps primary columns when the drawer is open', () => {
    render(<DataTable columns={columns} data={data} drawerOpen />);

    expect(screen.getByTestId('data-table-header-name')).toBeInTheDocument();
    expect(screen.getByTestId('data-table-header-code')).toBeInTheDocument();
    expect(screen.queryByTestId('data-table-header-region')).not.toBeInTheDocument();
  });

  it('respects an explicit primaryColumnKeys list over the secondary flag', () => {
    render(
      <DataTable columns={columns} data={data} drawerOpen primaryColumnKeys={['name', 'region']} />,
    );

    expect(screen.getByTestId('data-table-header-name')).toBeInTheDocument();
    expect(screen.getByTestId('data-table-header-region')).toBeInTheDocument();
    expect(screen.queryByTestId('data-table-header-code')).not.toBeInTheDocument();
  });

  it('renders the empty state when there is no data', () => {
    render(<DataTable columns={columns} data={[]} emptyState={<span>No plants found</span>} />);

    expect(screen.getByText('No plants found')).toBeInTheDocument();
  });

  it('highlights the selected row', () => {
    render(<DataTable columns={columns} data={data} selectedId={2} />);

    expect(screen.getByTestId('data-table-row-2').className).toContain('bg-frost');
    expect(screen.getByTestId('data-table-row-1').className).not.toContain('bg-frost');
  });

  it('renders the row testid and opens a row on click', () => {
    const onRowClick = vi.fn();
    render(<DataTable columns={columns} data={data} onRowClick={onRowClick} />);

    const row = screen.getByTestId('data-table-row-1');
    expect(row.className).toContain('cursor-pointer');
    fireEvent.click(row);
    expect(onRowClick).toHaveBeenCalledWith(data[0]);
  });

  it('renders identically to today when no new props are passed', () => {
    render(<DataTable columns={columns} data={data} />);

    expect(screen.getByTestId('data-table-header-name').className).toContain(
      'text-body-sm-emphasis',
    );
    expect(screen.getByTestId('data-table-header-name').className).not.toContain('uppercase');
    expect(screen.getByTestId('data-table-row-1').className).not.toContain('opacity-60');
    expect(screen.queryByTestId('data-table-skeleton-row-0')).not.toBeInTheDocument();
  });

  it('keeps the DS card wrapper and px-4 py-3 cells at the default (large) density', () => {
    render(<DataTable columns={columns} data={data} />);

    const root = screen.getByTestId('data-table');
    // overflow-x-auto (not -hidden): a wide table scrolls horizontally instead
    // of clipping its right-hand columns (CORE-FB-14 narrow-column fix).
    expect(root.className).toContain('overflow-x-auto');
    expect(root.className).toContain('rounded-lg');
    expect(root.className).toContain('border-slate-200');
    expect(root).not.toHaveAttribute('data-header-variant');
    expect(screen.getByTestId('data-table-header-name').className).toContain('px-4');
    expect(screen.getByTestId('data-table-header-name').className).toContain('py-3');
  });

  it('maps denseHeader to the DS compact density (12px bold, tighter, not uppercase) — D-7', () => {
    render(<DataTable columns={columns} data={data} denseHeader />);

    const header = screen.getByTestId('data-table-header-name');
    expect(header.className).toContain('text-body-xs-emphasis');
    expect(header.className).toContain('px-3');
    expect(header.className).toContain('py-1.5');
    expect(header.className).not.toContain('uppercase');
    expect(header.className).not.toContain('px-4');
  });

  it('renders a colgroup with pixel widths when a column declares width (AC3/AC4)', () => {
    const widthColumns: DataTableColumn<Plant>[] = [
      { key: 'name', header: 'Name', width: 180 },
      { key: 'code', header: 'Code' },
    ];
    const { container } = render(<DataTable columns={widthColumns} data={data} />);

    expect(container.querySelector('table')?.className).toContain('table-fixed');
    const cols = container.querySelectorAll('colgroup col');
    expect(cols).toHaveLength(2);
    expect((cols[0] as HTMLElement).style.width).toBe('180px');
  });

  it('dims and italicises rows matched by isRowArchived (AC5)', () => {
    render(<DataTable columns={columns} data={data} isRowArchived={(row) => row.id === 2} />);

    expect(screen.getByTestId('data-table-row-2').className).toContain('opacity-60');
    expect(screen.getByTestId('data-table-row-2').className).toContain('italic');
    expect(screen.getByTestId('data-table-row-1').className).not.toContain('opacity-60');
  });

  it('renders skeleton rows instead of data while loading, and suppresses the empty state (AC9)', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        loading
        skeletonRowCount={3}
        emptyState={<span>No plants found</span>}
      />,
    );

    expect(screen.getByTestId('data-table-skeleton-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('data-table-skeleton-row-2')).toBeInTheDocument();
    expect(screen.queryByText('No plants found')).not.toBeInTheDocument();
  });

  it('shows the empty state once loading finishes with no data', () => {
    render(
      <DataTable columns={columns} data={[]} loading={false} emptyState={<span>No plants found</span>} />,
    );

    expect(screen.getByText('No plants found')).toBeInTheDocument();
    expect(screen.queryByTestId('data-table-skeleton-row-0')).not.toBeInTheDocument();
  });

  it('does not collapse secondary columns at the tablet breakpoint by default (regression guard)', () => {
    render(<DataTable columns={columns} data={data} />);

    expect(screen.getByTestId('data-table-header-region').className).not.toContain('md:hidden');
    const cells = screen.getAllByRole('cell');
    const regionCell = cells.find((cell) => cell.textContent === 'Belgium');
    expect(regionCell?.className ?? '').not.toContain('md:hidden');
  });

  it('collapses secondary columns at the tablet breakpoint when responsiveSecondaryCollapse is set (AC10)', () => {
    render(<DataTable columns={columns} data={data} responsiveSecondaryCollapse />);

    expect(screen.getByTestId('data-table-header-region').className).toContain('md:hidden');
    expect(screen.getByTestId('data-table-header-region').className).toContain('lg:table-cell');
    expect(screen.getByTestId('data-table-header-name').className).not.toContain('md:hidden');
  });

  describe('DS header sort adapter (CORE-FB-14)', () => {
    interface Order {
      id: string;
      orderNumber: string;
      qty: number;
    }
    const orderColumns: DataTableColumn<Order>[] = [
      { key: 'orderNumber', header: 'Order', sortKey: 'order_number' },
      { key: 'qty', header: 'Qty', sortKey: 'quantity' },
    ];
    const orders: Order[] = [
      { id: 'b', orderNumber: 'PO-2', qty: 5 },
      { id: 'a', orderNumber: 'PO-1', qty: 9 },
    ];

    it('renders sort buttons only when onSortChange is wired, keyed by the column key', () => {
      const { rerender } = render(<DataTable columns={orderColumns} data={orders} />);
      expect(screen.queryByTestId('data-table-sort-orderNumber')).not.toBeInTheDocument();

      rerender(
        <DataTable
          columns={orderColumns}
          data={orders}
          sort={{ key: 'order_number', dir: 'asc' }}
          onSortChange={vi.fn()}
        />,
      );
      expect(screen.getByTestId('data-table-sort-orderNumber')).toBeInTheDocument();
      expect(screen.getByTestId('data-table-sort-qty')).toBeInTheDocument();
    });

    it('reports the API sortKey (not the column key) and an explicit direction', () => {
      const onSortChange = vi.fn();
      const { rerender } = render(
        <DataTable columns={orderColumns} data={orders} onSortChange={onSortChange} />,
      );

      // No active sort → first click cycles to ascending.
      fireEvent.click(screen.getByTestId('data-table-sort-orderNumber'));
      expect(onSortChange).toHaveBeenLastCalledWith({ key: 'order_number', dir: 'asc' });

      // Active ascending → click cycles to descending.
      rerender(
        <DataTable
          columns={orderColumns}
          data={orders}
          sort={{ key: 'order_number', dir: 'asc' }}
          onSortChange={onSortChange}
        />,
      );
      fireEvent.click(screen.getByTestId('data-table-sort-orderNumber'));
      expect(onSortChange).toHaveBeenLastCalledWith({ key: 'order_number', dir: 'desc' });

      // Active descending → click clears the sort (null).
      rerender(
        <DataTable
          columns={orderColumns}
          data={orders}
          sort={{ key: 'order_number', dir: 'desc' }}
          onSortChange={onSortChange}
        />,
      );
      fireEvent.click(screen.getByTestId('data-table-sort-orderNumber'));
      expect(onSortChange).toHaveBeenLastCalledWith(null);
    });

    it('does not reorder rows client-side (external sort mode)', () => {
      render(
        <DataTable
          columns={orderColumns}
          data={orders}
          sort={{ key: 'order_number', dir: 'asc' }}
          onSortChange={vi.fn()}
        />,
      );

      const rowOrder = screen
        .getAllByTestId(/^data-table-row-/)
        .map((row) => row.getAttribute('data-testid'));
      // Rows stay in the server-provided order (b, a), not client-sorted (a, b).
      expect(rowOrder).toEqual(['data-table-row-b', 'data-table-row-a']);
    });
  });

  describe('in-column search gating (CORE-FB-14)', () => {
    interface Row {
      id: number;
      code: string;
      name: { en: string };
    }
    const rows: Row[] = [{ id: 1, code: 'A', name: { en: 'Alpha' } }];

    it('offers the options menu on a plain primitive column', () => {
      const cols: DataTableColumn<Row>[] = [{ key: 'code', header: 'Code' }];
      render(<DataTable columns={cols} data={rows} />);
      expect(screen.getByRole('button', { name: 'Code options' })).toBeInTheDocument();
    });

    it('disables the options menu on a rendered column without an accessor', () => {
      const cols: DataTableColumn<Row>[] = [
        { key: 'name', header: 'Name', render: (row) => row.name.en },
      ];
      render(<DataTable columns={cols} data={rows} />);
      expect(screen.queryByRole('button', { name: 'Name options' })).not.toBeInTheDocument();
    });

    it('re-enables the options menu on a rendered column that supplies an accessor', () => {
      const cols: DataTableColumn<Row>[] = [
        { key: 'name', header: 'Name', render: (row) => row.name.en, accessor: (row) => row.name.en },
      ];
      render(<DataTable columns={cols} data={rows} />);
      expect(screen.getByRole('button', { name: 'Name options' })).toBeInTheDocument();
    });
  });
});
