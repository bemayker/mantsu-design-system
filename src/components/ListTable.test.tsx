import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ListTable, type ListTableColumn } from './ListTable';

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [
  { id: 'a', name: 'Filler A' },
  { id: 'b', name: 'Mixer 7' },
];

const COLUMNS: ListTableColumn<Row>[] = [
  { key: 'name', header: 'Name', render: (row) => row.name },
  { key: 'id', header: 'ID', render: (row) => row.id, className: 'min-w-[120px]' },
];

function renderTable(overrides: Partial<Parameters<typeof ListTable<Row>>[0]> = {}) {
  render(
    <ListTable
      columns={COLUMNS}
      rows={ROWS}
      rowKey={(row) => row.id}
      rowTestId={(row) => `row-${row.id}`}
      testId="test-table"
      {...overrides}
    />,
  );
}

describe('ListTable', () => {
  it('renders one header per column and one cell per column per row', () => {
    renderTable();

    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'ID' })).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(screen.getByTestId('row-a')).toHaveTextContent('Filler A');
  });

  it('gives every row its own test id', () => {
    renderTable();

    expect(screen.getByTestId('row-a')).toBeInTheDocument();
    expect(screen.getByTestId('row-b')).toBeInTheDocument();
  });

  it('calls onRowClick with the clicked row', async () => {
    const onRowClick = vi.fn();
    renderTable({ onRowClick });

    await userEvent.click(screen.getByTestId('row-b'));

    expect(onRowClick).toHaveBeenCalledWith(ROWS[1]);
  });

  it('activates a focused row from the keyboard', async () => {
    const onRowClick = vi.fn();
    renderTable({ onRowClick });

    screen.getByTestId('row-a').focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');

    expect(onRowClick).toHaveBeenCalledTimes(2);
  });

  it('offers no click affordance and no tab stop without onRowClick', async () => {
    renderTable();

    const row = screen.getByTestId('row-a');
    expect(row).not.toHaveAttribute('tabindex');
    expect(row.className).not.toContain('cursor-pointer');

    await userEvent.keyboard('{Enter}');
    expect(row).not.toHaveAttribute('data-selected');
  });

  it('marks the selected row and only that row', () => {
    renderTable({ selectedKey: 'b' });

    expect(screen.getByTestId('row-a')).not.toHaveAttribute('data-selected');
    expect(screen.getByTestId('row-b')).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('row-b').className).toContain('bg-frost');
  });

  it('merges per-row attributes and appends their class rather than replacing the base one', () => {
    renderTable({
      rowProps: (row) =>
        row.id === 'a' ? { 'data-active': 'true', className: 'border-l-4' } : {},
    });

    const row = screen.getByTestId('row-a');
    expect(row).toHaveAttribute('data-active', 'true');
    expect(row.className).toContain('border-l-4');
    expect(row.className).toContain('transition-colors');
    expect(screen.getByTestId('row-b')).not.toHaveAttribute('data-active');
  });

  it('applies the recorded picker padding by default and the compact one on request', () => {
    const { unmount } = render(
      <ListTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={(row) => row.id}
        rowTestId={(row) => `picker-${row.id}`}
        testId="picker-table"
      />,
    );
    expect(screen.getByRole('columnheader', { name: 'Name' }).className).toContain('px-6 py-3');
    unmount();

    const { unmount: unmountCompact } = render(
      <ListTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={(row) => row.id}
        rowTestId={(row) => `compact-${row.id}`}
        density="compact"
        testId="compact-table"
      />,
    );
    expect(screen.getByRole('columnheader', { name: 'Name' }).className).toContain('px-4 py-3');
    unmountCompact();

    // `OC-EXE-10`'s BOM modal, the third recorded surface. Additive: neither
    // existing density moved.
    render(
      <ListTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={(row) => row.id}
        rowTestId={(row) => `modal-${row.id}`}
        density="modal"
        testId="modal-table"
      />,
    );
    const header = screen.getByRole('columnheader', { name: 'Name' });
    expect(header.className).toContain('px-2 py-3');
    expect(header.className).toContain('text-[16px]');
    expect(screen.getAllByRole('cell')[0].className).toContain('px-2 py-2');
    expect(screen.getByTestId('modal-a').className).toContain('border-slate-200');
  });
});
