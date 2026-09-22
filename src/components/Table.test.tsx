import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Table, type Column } from './Table';

interface Item {
  id: string;
  name: string;
  qty: number;
  note: string | null;
}

const columns: Column<Item>[] = [
  { key: 'name', header: 'Name' },
  { key: 'qty', header: 'Qty', align: 'right' },
  { key: 'note', header: 'Note' },
];

const data: Item[] = [
  { id: 'b', name: 'Beta', qty: 2, note: 'x' },
  { id: 'a', name: 'Alpha', qty: 10, note: null },
  { id: 'c', name: 'Gamma', qty: 1, note: 'y' },
];

function rowOrder(): string[] {
  return screen
    .getAllByTestId(/^row-/)
    .map((row) => row.getAttribute('data-testid') ?? '');
}

const rowTestId = (row: Item) => `row-${row.id}`;

describe('vendored DS Table', () => {
  it('renders headers and rows (With data)', () => {
    render(<Table columns={columns} data={data} rowTestId={rowTestId} />);

    expect(screen.getByTestId('data-table-header-name')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();
  });

  it('renders the empty state when there is no data (Empty)', () => {
    render(<Table columns={columns} data={[]} emptyState={<span>Nothing here</span>} />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('falls back to a default empty message when none is supplied', () => {
    render(<Table columns={columns} data={[]} />);
    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('applies the compact density by default and the large density on request (Density comparison)', () => {
    const { rerender } = render(<Table columns={columns} data={data} />);
    expect(screen.getByTestId('data-table-header-name').className).toContain('py-1.5');
    expect(screen.getByTestId('data-table-header-name').className).toContain('text-body-xs-emphasis');

    rerender(<Table columns={columns} data={data} density="large" />);
    expect(screen.getByTestId('data-table-header-name').className).toContain('py-3');
    expect(screen.getByTestId('data-table-header-name').className).toContain('text-body-sm-emphasis');
  });

  it('renders no sort or options controls when static (Static)', () => {
    render(<Table columns={columns} data={data} sortable={false} filterable={false} />);
    expect(screen.queryByTestId('data-table-sort-name')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Name options' })).not.toBeInTheDocument();
  });

  it('sorts by a default sort (Default sorted)', () => {
    render(
      <Table
        columns={columns}
        data={data}
        rowTestId={rowTestId}
        defaultSort={{ key: 'name', direction: 'asc' }}
      />,
    );
    expect(rowOrder()).toEqual(['row-a', 'row-b', 'row-c']);
  });

  it('cycles a header sort ascending → descending → off (uncontrolled)', () => {
    render(<Table columns={columns} data={data} rowTestId={rowTestId} />);
    const button = screen.getByTestId('data-table-sort-name');

    fireEvent.click(button); // asc
    expect(rowOrder()).toEqual(['row-a', 'row-b', 'row-c']);

    fireEvent.click(button); // desc
    expect(rowOrder()).toEqual(['row-c', 'row-b', 'row-a']);

    fireEvent.click(button); // off → original order
    expect(rowOrder()).toEqual(['row-b', 'row-a', 'row-c']);
  });

  it('sinks nullish values to the bottom and compares numbers numerically', () => {
    render(
      <Table
        columns={columns}
        data={data}
        rowTestId={rowTestId}
        defaultSort={{ key: 'qty', direction: 'asc' }}
      />,
    );
    // 1, 2, 10 (numeric, not lexicographic) → c, b, a
    expect(rowOrder()).toEqual(['row-c', 'row-b', 'row-a']);

    render(
      <Table
        columns={columns}
        data={data}
        rowTestId={(row) => `note-${row.id}`}
        defaultSort={{ key: 'note', direction: 'asc' }}
      />,
    );
    // note: 'x', null, 'y' → null sinks to the bottom → x, y, null
    const notes = screen.getAllByTestId(/^note-/).map((r) => r.getAttribute('data-testid'));
    expect(notes).toEqual(['note-b', 'note-c', 'note-a']);
  });

  it('opens a per-column menu and sorts explicitly (Per column controls)', () => {
    const onSortChange = vi.fn();
    render(
      <Table columns={columns} data={data} rowTestId={rowTestId} onSortChange={onSortChange} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Name options' }));
    const menu = screen.getByRole('menu', { name: 'Name options' });
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Sort descending' }));

    expect(onSortChange).toHaveBeenLastCalledWith({ key: 'name', direction: 'desc' });
    expect(rowOrder()).toEqual(['row-c', 'row-b', 'row-a']);
  });

  it('narrows the rows with the in-column search and clears it (Per column controls)', () => {
    render(<Table columns={columns} data={data} rowTestId={rowTestId} />);

    fireEvent.click(screen.getByRole('button', { name: 'Name options' }));
    const input = screen.getByRole('textbox', { name: 'Search Name' });

    fireEvent.change(input, { target: { value: 'alp' } });
    expect(rowOrder()).toEqual(['row-a']);

    fireEvent.change(input, { target: { value: '' } });
    expect(rowOrder()).toEqual(['row-b', 'row-a', 'row-c']);
  });

  it('reports column-filter changes via onColumnFiltersChange', () => {
    const onColumnFiltersChange = vi.fn();
    render(
      <Table
        columns={columns}
        data={data}
        rowTestId={rowTestId}
        onColumnFiltersChange={onColumnFiltersChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Name options' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Search Name' }), {
      target: { value: 'a' },
    });
    expect(onColumnFiltersChange).toHaveBeenLastCalledWith({ name: 'a' });
  });

  describe('CORE-FB-14 extensions', () => {
    it('reports sort but does not reorder rows in external mode', () => {
      const onSortChange = vi.fn();
      render(
        <Table
          columns={columns}
          data={data}
          rowTestId={rowTestId}
          sortMode="external"
          sort={{ key: 'name', direction: 'asc' }}
          onSortChange={onSortChange}
        />,
      );
      // Controlled + external: the DOM order stays as provided.
      expect(rowOrder()).toEqual(['row-b', 'row-a', 'row-c']);

      fireEvent.click(screen.getByTestId('data-table-sort-name'));
      expect(onSortChange).toHaveBeenLastCalledWith({ key: 'name', direction: 'desc' });
      // Still not reordered client-side.
      expect(rowOrder()).toEqual(['row-b', 'row-a', 'row-c']);
    });

    it('uses rowKey / rowTestId / rowClassName and fires onRowClick', () => {
      const onRowClick = vi.fn();
      render(
        <Table
          columns={columns}
          data={data}
          rowKey={(row) => row.id}
          rowTestId={rowTestId}
          rowClassName={(row) => (row.id === 'a' ? 'selected-row' : undefined)}
          onRowClick={onRowClick}
        />,
      );
      expect(screen.getByTestId('row-a').className).toContain('selected-row');
      expect(screen.getByTestId('row-b').className).not.toContain('selected-row');

      fireEvent.click(screen.getByTestId('row-b'));
      expect(onRowClick).toHaveBeenCalledWith(data[0]);
    });

    it('fires onRowContextMenu on right-click', () => {
      const onRowContextMenu = vi.fn();
      render(
        <Table
          columns={columns}
          data={data}
          rowTestId={rowTestId}
          onRowContextMenu={onRowContextMenu}
        />,
      );
      fireEvent.contextMenu(screen.getByTestId('row-b'));
      expect(onRowContextMenu).toHaveBeenCalledWith(data[0], expect.anything());
    });

    it('renders skeleton rows while loading and suppresses the empty state', () => {
      render(
        <Table
          columns={columns}
          data={[]}
          loading
          skeletonRowCount={2}
          emptyState={<span>Nothing here</span>}
        />,
      );
      expect(screen.getByTestId('data-table-skeleton-row-0')).toBeInTheDocument();
      expect(screen.getByTestId('data-table-skeleton-row-1')).toBeInTheDocument();
      expect(screen.queryByText('Nothing here')).not.toBeInTheDocument();
    });

    it('renders a colgroup with fixed widths and passes the container testId', () => {
      const widthColumns: Column<Item>[] = [
        { key: 'name', header: 'Name', width: 200 },
        { key: 'qty', header: 'Qty' },
        { key: 'note', header: 'Note' },
      ];
      const { container } = render(
        <Table columns={widthColumns} data={data} testId="my-table" />,
      );
      expect(screen.getByTestId('my-table')).toBeInTheDocument();
      expect(container.querySelector('table')?.className).toContain('table-fixed');
      const cols = container.querySelectorAll('colgroup col');
      expect((cols[0] as HTMLElement).style.width).toBe('200px');
    });

    it('uses an accessor for column search on rendered columns', () => {
      interface Named {
        id: number;
        label: { en: string };
      }
      const namedColumns: Column<Named>[] = [
        { key: 'label', header: 'Label', render: (r) => r.label.en, accessor: (r) => r.label.en },
      ];
      const named: Named[] = [
        { id: 1, label: { en: 'Apple' } },
        { id: 2, label: { en: 'Banana' } },
      ];
      render(<Table columns={namedColumns} data={named} rowTestId={(r) => `named-${r.id}`} />);

      fireEvent.click(screen.getByRole('button', { name: 'Label options' }));
      fireEvent.change(screen.getByRole('textbox', { name: 'Search Label' }), {
        target: { value: 'ban' },
      });
      const remaining = screen.getAllByTestId(/^named-/).map((r) => r.getAttribute('data-testid'));
      expect(remaining).toEqual(['named-2']);
    });
  });
});
