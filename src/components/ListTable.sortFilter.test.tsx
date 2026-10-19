import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ListTable, type ListTableColumn, type ListTableDensity, type ListTableProps } from './ListTable';
import type { SortState } from './Table';
import { useClientTable } from './useClientTable';

interface Row {
  id: string;
  material: string;
  qty: number;
  status: string;
}

const ROWS: Row[] = [
  { id: 'a', material: 'Cocoa blend', qty: 200, status: 'Open' },
  { id: 'b', material: 'Sugar', qty: 9, status: 'Done' },
  { id: 'c', material: 'Flour', qty: 50, status: 'Open' },
];

const COLUMNS: ListTableColumn<Row>[] = [
  { key: 'material', header: 'Material', render: (r) => r.material, sortable: true, filterable: true, accessor: (r) => r.material },
  { key: 'qty', header: 'Qty', render: (r) => r.qty, sortable: true, accessor: (r) => r.qty, className: 'text-right' },
  { key: 'status', header: 'Status', render: (r) => r.status },
];

function renderTable(overrides: Partial<ListTableProps<Row>> = {}) {
  return render(
    <ListTable
      columns={COLUMNS}
      rows={ROWS}
      rowKey={(r) => r.id}
      rowTestId={(r) => `row-${r.id}`}
      testId="lt"
      {...overrides}
    />,
  );
}

const rowIds = () => screen.getAllByTestId(/^row-/).map((el) => el.getAttribute('data-testid'));

/** A table wired like a consumer: the test holds the sort, the table only reports. */
function SortHarness({ onSortChange }: { onSortChange: (sort: SortState | null) => void }) {
  const [sort, setSort] = useState<SortState | null>(null);
  return (
    <ListTable
      columns={COLUMNS}
      rows={ROWS}
      rowKey={(r) => r.id}
      rowTestId={(r) => `row-${r.id}`}
      testId="lt"
      sort={sort}
      onSortChange={(next) => { setSort(next); onSortChange(next); }}
    />
  );
}

describe('ListTable sort and filter flags', () => {
  it('cycles a sortable header through ascending, descending and off', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    render(<SortHarness onSortChange={onSortChange} />);

    const button = screen.getByTestId('lt-sort-qty');
    await user.click(button);
    await user.click(button);
    await user.click(button);

    expect(onSortChange.mock.calls.map(([sort]) => sort)).toEqual([
      { key: 'qty', direction: 'asc' },
      { key: 'qty', direction: 'desc' },
      null,
    ]);
  });

  it('sets aria-sort on the sorted header only', () => {
    const { rerender } = renderTable({ sort: { key: 'qty', direction: 'asc' } });
    expect(screen.getByRole('columnheader', { name: /Qty/ })).toHaveAttribute('aria-sort', 'ascending');
    expect(screen.getByRole('columnheader', { name: /Material/ })).not.toHaveAttribute('aria-sort');
    expect(screen.getByRole('columnheader', { name: 'Status' })).not.toHaveAttribute('aria-sort');

    rerender(
      <ListTable columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} rowTestId={(r) => `row-${r.id}`}
        testId="lt" sort={{ key: 'qty', direction: 'desc' }} />,
    );
    expect(screen.getByRole('columnheader', { name: /Qty/ })).toHaveAttribute('aria-sort', 'descending');
  });

  it('never reorders the rows it is given, even while a sort is set', () => {
    renderTable({ sort: { key: 'qty', direction: 'asc' } });
    expect(rowIds()).toEqual(['row-a', 'row-b', 'row-c']);
  });

  it('opens the column menu with a search field and reports the merged filter record', async () => {
    const user = userEvent.setup();
    const onColumnFiltersChange = vi.fn();
    renderTable({ columnFilters: { qty: '5' }, onColumnFiltersChange });

    await user.click(screen.getByRole('button', { name: 'Material options' }));
    const menu = screen.getByRole('menu', { name: 'Material options' });
    const search = within(menu).getByRole('textbox', { name: 'Search Material' });
    expect(search).toHaveAttribute('placeholder', 'Search Material…');

    await user.type(search, 'c');
    expect(onColumnFiltersChange).toHaveBeenLastCalledWith({ qty: '5', material: 'c' });
  });

  it('removes a column from the record when its search is cleared', async () => {
    const user = userEvent.setup();
    const onColumnFiltersChange = vi.fn();
    renderTable({ columnFilters: { material: 'co' }, onColumnFiltersChange });

    expect(screen.getByRole('button', { name: 'Material options' })).toHaveClass('text-primary-blue');
    await user.click(screen.getByRole('button', { name: 'Material options' }));
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(onColumnFiltersChange).toHaveBeenLastCalledWith({});
  });

  it('offers only the sort items for a sortable column that is not filterable', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    renderTable({ onSortChange });

    await user.click(screen.getByRole('button', { name: 'Qty options' }));
    const menu = screen.getByRole('menu', { name: 'Qty options' });
    expect(within(menu).queryByRole('textbox')).not.toBeInTheDocument();
    await user.click(within(menu).getByRole('menuitem', { name: 'Sort descending' }));
    expect(onSortChange).toHaveBeenCalledWith({ key: 'qty', direction: 'desc' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('is operable by keyboard: Tab, Enter opens with focus in the search, Escape closes', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    renderTable({ onSortChange, sort: { key: 'material', direction: 'asc' } });

    await user.tab();
    expect(screen.getByRole('button', { name: 'Sort by Material' })).toHaveFocus();
    await user.tab();
    const options = screen.getByRole('button', { name: 'Material options' });
    expect(options).toHaveFocus();
    expect(options).toHaveAttribute('aria-haspopup', 'menu');

    await user.keyboard('{Enter}');
    expect(screen.getByRole('textbox', { name: 'Search Material' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    options.focus();
    await user.keyboard('{Enter}');
    const items = screen.getAllByRole('menuitem');
    expect(items.map((item) => item.textContent)).toEqual(['Sort ascending', 'Sort descending', 'Clear sort']);
    await user.tab({ shift: true });
    expect(items[2]).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onSortChange).toHaveBeenCalledWith(null);
  });

  it('uses columnMenuLabels over the English defaults', async () => {
    const user = userEvent.setup();
    renderTable({
      columnMenuLabels: {
        sortAscending: 'Oplopend sorteren',
        options: (name) => `${name} opties`,
        sortBy: (name) => `Sorteren op ${name}`,
        searchLabel: (name) => `Zoeken in ${name}`,
      },
    });

    expect(screen.getByRole('button', { name: 'Sorteren op Material' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Material opties' }));
    expect(screen.getByRole('menuitem', { name: 'Oplopend sorteren' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Sort descending' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Zoeken in Material' })).toBeInTheDocument();
  });

  it.each<[ListTableDensity, string, string]>([
    ['picker', 'size-6', 'px-6 py-3 text-[16px] font-bold leading-5'],
    ['compact', 'size-5', 'px-4 py-3 text-[14px] font-bold leading-5'],
    ['modal', 'size-6', 'px-2 py-3 text-[16px] font-bold leading-5'],
  ])('keeps the %s header cell and sizes its options button %s', (density, size, headerCell) => {
    renderTable({ density });
    expect(screen.getByTestId('lt-options-material')).toHaveClass(size);
    const header = screen.getByRole('columnheader', { name: /Material/ });
    for (const cls of headerCell.split(' ')) expect(header).toHaveClass(cls);
    expect(header).toHaveClass('text-left', 'text-primary-neutral');
  });

  it('renders an unflagged header exactly as before: its text as the only child, no aria-sort', () => {
    renderTable({ sort: { key: 'qty', direction: 'asc' } });
    const status = screen.getByRole('columnheader', { name: 'Status' });
    expect(status.childNodes).toHaveLength(1);
    expect(status.childNodes[0].nodeType).toBe(Node.TEXT_NODE);
    expect(status.textContent).toBe('Status');
    expect(status).not.toHaveAttribute('aria-sort');
    expect(status.className).toBe('text-left text-primary-neutral px-6 py-3 text-[16px] font-bold leading-5');
    expect(screen.queryByTestId('lt-sort-status')).not.toBeInTheDocument();
    expect(screen.queryByTestId('lt-options-status')).not.toBeInTheDocument();
  });

  it('renders a filterable-only column with plain header text and an options button', () => {
    const columns: ListTableColumn<Row>[] = [
      { key: 'material', header: 'Material', render: (r) => r.material, filterable: true },
    ];
    renderTable({ columns });
    expect(screen.queryByTestId('lt-sort-material')).not.toBeInTheDocument();
    expect(screen.getByTestId('lt-options-material')).toBeInTheDocument();
  });

  it('keeps a flagged column className on its header, so text-right still aligns it', () => {
    renderTable();
    expect(screen.getByRole('columnheader', { name: /Qty/ })).toHaveClass('text-right');
  });

  it('keeps the menu open when its own scroll container scrolls, and still closes on any other scroll', async () => {
    // A search that shrinks the rows clamps the container's scrollTop, and the
    // browser fires `scroll` on it while the operator is typing.
    const user = userEvent.setup();
    renderTable({ onColumnFiltersChange: vi.fn() });

    await user.click(screen.getByRole('button', { name: 'Material options' }));
    const search = screen.getByRole('textbox', { name: 'Search Material' });
    await user.type(search, 'c');
    fireEvent.scroll(screen.getByTestId('lt'));
    expect(screen.getByRole('menu', { name: 'Material options' })).toBeInTheDocument();
    expect(search).toHaveFocus();

    fireEvent.scroll(document);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});

/* The OC-EXE-21.1 composition: useClientTable over the full set, one page into ListTable. */

interface Item {
  id: string;
  name: string;
  qty: number;
}

/** i1 has the highest qty and i12 the lowest, so an ascending sort pulls page 3 onto page 1. */
const ITEMS: Item[] = Array.from({ length: 12 }, (_, index) => ({
  id: `i${index + 1}`,
  name: `Item ${String(index + 1).padStart(2, '0')}`,
  qty: 130 - (index + 1) * 10,
}));

const ITEM_COLUMNS: ListTableColumn<Item>[] = [
  { key: 'name', header: 'Name', render: (r) => r.name, filterable: true },
  { key: 'qty', header: 'Qty', render: (r) => r.qty, sortable: true },
];

const PAGE_SIZE = 5;

function PagedHarness() {
  const [page, setPage] = useState(1);
  const table = useClientTable({ rows: ITEMS, columns: ITEM_COLUMNS, onPageReset: () => setPage(1) });
  const pageRows = table.rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return (
    <>
      <ListTable
        columns={ITEM_COLUMNS}
        rows={pageRows}
        rowKey={(r) => r.id}
        rowTestId={(r) => `item-${r.id}`}
        testId="paged"
        {...table.listTableProps}
      />
      <span data-testid="page">{page}</span>
      <button type="button" onClick={() => setPage((current) => current + 1)}>Next page</button>
    </>
  );
}

const itemIds = () => screen.getAllByTestId(/^item-/).map((el) => el.getAttribute('data-testid'));

describe('ListTable with useClientTable and a paginating screen', () => {
  it('sorts the full set, so page 1 shows the lowest values from later pages', async () => {
    const user = userEvent.setup();
    render(<PagedHarness />);
    expect(itemIds()).toEqual(['item-i1', 'item-i2', 'item-i3', 'item-i4', 'item-i5']);

    await user.click(screen.getByTestId('paged-sort-qty'));
    expect(itemIds()).toEqual(['item-i12', 'item-i11', 'item-i10', 'item-i9', 'item-i8']);
    expect(screen.getByTestId('page')).toHaveTextContent('1');
  });

  it('searches the full set and goes back to page 1, finding a row that was on page 2', async () => {
    const user = userEvent.setup();
    render(<PagedHarness />);
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByTestId('page')).toHaveTextContent('2');
    expect(itemIds()).toContain('item-i7');

    await user.click(screen.getByRole('button', { name: 'Name options' }));
    await user.type(screen.getByRole('textbox', { name: 'Search Name' }), '07');

    expect(screen.getByTestId('page')).toHaveTextContent('1');
    expect(itemIds()).toEqual(['item-i7']);
  });
});
