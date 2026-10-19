import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { DataTableColumn } from './DataTable.types';
import type { ListTableColumn } from './ListTable';
import type { Column } from './Table';
import { useClientTable, type UseClientTableOptions } from './useClientTable';

interface Item {
  id: string;
  name: string;
  qty: number;
  status: 'open' | 'done';
}

// 23 rows whose quantities are deliberately not in input order.
const ITEMS: Item[] = Array.from({ length: 23 }, (_, i) => ({
  id: `i${i}`,
  name: i % 3 === 0 ? `Cocoa ${i}` : `Sugar ${i}`,
  qty: ((i * 7) % 23) * 10,
  status: i % 2 === 0 ? 'open' : 'done',
}));

const COLUMNS: ListTableColumn<Item>[] = [
  { key: 'name', header: 'Name', render: (row) => row.name, sortable: true, filterable: true, accessor: (row) => row.name },
  { key: 'qty', header: 'Qty', render: (row) => row.qty, sortable: true, accessor: (row) => row.qty },
];

const paginate = <T,>(rows: readonly T[], page: number, size: number) => rows.slice((page - 1) * size, page * size);

const setup = (options: Partial<UseClientTableOptions<Item>> = {}) =>
  renderHook((props: UseClientTableOptions<Item>) => useClientTable(props), {
    initialProps: { rows: ITEMS, columns: COLUMNS, ...options },
  });

describe('useClientTable', () => {
  it('sorts the full row set before pagination, so page 1 holds the global smallest', () => {
    const { result } = setup();
    act(() => result.current.listTableProps.onSortChange({ key: 'qty', direction: 'asc' }));

    const firstPage = paginate(result.current.rows, 1, 5).map((row) => row.qty);
    const globalSmallest = [...ITEMS].map((row) => row.qty).sort((a, b) => a - b).slice(0, 5);
    expect(firstPage).toEqual(globalSmallest);
    expect(result.current.rows).toHaveLength(23);
  });

  it('returns the rows in input order while unsorted', () => {
    const { result } = setup();
    expect(result.current.rows.map((row) => row.id)).toEqual(ITEMS.map((row) => row.id));
    expect(result.current.sort).toBeNull();
  });

  it('calls onPageReset once per column filter change and never on a sort change', () => {
    const onPageReset = vi.fn();
    const { result } = setup({ onPageReset });

    act(() => result.current.listTableProps.onSortChange({ key: 'qty', direction: 'desc' }));
    expect(onPageReset).not.toHaveBeenCalled();

    act(() => result.current.listTableProps.onColumnFiltersChange({ name: 'c' }));
    act(() => result.current.listTableProps.onColumnFiltersChange({ name: 'co' }));
    expect(onPageReset).toHaveBeenCalledTimes(2);
  });

  it('holds sort and filters itself when uncontrolled, starting from the defaults', () => {
    const onSortChange = vi.fn();
    const { result } = setup({ defaultSort: { key: 'qty', direction: 'desc' }, defaultColumnFilters: { name: 'cocoa' }, onSortChange });

    expect(result.current.sort).toEqual({ key: 'qty', direction: 'desc' });
    expect(result.current.rows.every((row) => row.name.startsWith('Cocoa'))).toBe(true);
    const qtys = result.current.rows.map((row) => row.qty);
    expect(qtys).toEqual([...qtys].sort((a, b) => b - a));

    act(() => result.current.listTableProps.onSortChange(null));
    expect(result.current.sort).toBeNull();
    expect(onSortChange).toHaveBeenCalledWith(null);
  });

  it('reports controlled sort and filters through the callbacks without storing them', () => {
    const onSortChange = vi.fn();
    const onColumnFiltersChange = vi.fn();
    const { result } = setup({ sort: null, columnFilters: {}, onSortChange, onColumnFiltersChange });

    act(() => result.current.listTableProps.onSortChange({ key: 'qty', direction: 'asc' }));
    act(() => result.current.listTableProps.onColumnFiltersChange({ name: 'cocoa' }));

    expect(onSortChange).toHaveBeenCalledWith({ key: 'qty', direction: 'asc' });
    expect(onColumnFiltersChange).toHaveBeenCalledWith({ name: 'cocoa' });
    expect(result.current.sort).toBeNull();
    expect(result.current.columnFilters).toEqual({});
    expect(result.current.rows).toHaveLength(23);
  });

  it('follows the controlled props when the consumer changes them', () => {
    const { result, rerender } = setup({ sort: null, columnFilters: {} });
    rerender({ rows: ITEMS, columns: COLUMNS, sort: { key: 'qty', direction: 'asc' }, columnFilters: { name: 'cocoa' } });
    expect(result.current.rows.every((row) => row.name.startsWith('Cocoa'))).toBe(true);
    expect(result.current.rows[0].qty).toBeLessThanOrEqual(result.current.rows[1].qty);
  });

  it('ANDs a column filter with the consumer own status filter', () => {
    const open = ITEMS.filter((row) => row.status === 'open');
    const { result } = setup({ rows: open, defaultColumnFilters: { name: 'cocoa' } });

    const expected = ITEMS.filter((row) => row.status === 'open' && row.name.toLowerCase().includes('cocoa'));
    expect(result.current.rows.map((row) => row.id)).toEqual(expected.map((row) => row.id));
    expect(expected.length).toBeGreaterThan(0);
  });

  it('reports hasColumnFilters only for a non-blank search', () => {
    const { result } = setup({ defaultColumnFilters: { name: '   ' } });
    expect(result.current.hasColumnFilters).toBe(false);
    act(() => result.current.listTableProps.onColumnFiltersChange({ name: 'zzz' }));
    expect(result.current.hasColumnFilters).toBe(true);
    expect(result.current.rows).toEqual([]);
  });

  it('accepts DataTable and Table columns as they are', () => {
    const dataTableColumns: DataTableColumn<Item>[] = [{ key: 'name', header: 'Name' }, { key: 'qty', header: 'Qty' }];
    const tableColumns: Column<Item>[] = [{ key: 'qty', header: 'Qty' }];

    const fromDataTable = renderHook(() =>
      useClientTable({ rows: ITEMS, columns: dataTableColumns, defaultSort: { key: 'qty', direction: 'asc' } }));
    const fromTable = renderHook(() =>
      useClientTable({ rows: ITEMS, columns: tableColumns, defaultColumnFilters: { qty: '220' } }));

    expect(fromDataTable.result.current.rows[0].qty).toBe(0);
    expect(fromTable.result.current.rows.map((row) => row.qty)).toEqual([220]);
  });
});
