import type { Meta, StoryObj } from '@storybook/react';
import { useMemo, useState } from 'react';
import { ListTable, type ListTableColumn, type ListTableDensity } from '../components/ListTable';
import { Pagination, getPageRange } from '../components/Pagination';
import { useClientTable } from '../components/useClientTable';

const meta: Meta = { title: 'Components/ListTable', tags: ['autodocs'] };
export default meta;

interface Order { id: string; material: string; planned: string; status: string }
const ORDERS: Order[] = [
  { id: '7009346', material: 'Dry Mix for pancakes', planned: '200 g', status: 'In Progress' },
  { id: '7009347', material: 'Cocoa blend', planned: '1 200 g', status: 'Scheduled' },
  { id: '7009348', material: 'Waffle base', planned: '800 g', status: 'Complete' },
];
const columns: ListTableColumn<Order>[] = [
  { key: 'id', header: 'Order', render: (r) => r.id },
  { key: 'material', header: 'Material', render: (r) => r.material },
  { key: 'planned', header: 'Planned', render: (r) => r.planned, className: 'text-right' },
  { key: 'status', header: 'Status', render: (r) => r.status },
];

const Selectable = ({ density }: { density: ListTableDensity }) => {
  const [selected, setSelected] = useState<string | null>('7009346');
  return (
    <ListTable columns={columns} rows={ORDERS} rowKey={(r) => r.id} rowTestId={(r) => `order-${r.id}`}
      onRowClick={(r) => setSelected(r.id)} selectedKey={selected} density={density}
      testId="story-list-table" ariaLabel="Orders" />
  );
};

export const Picker: StoryObj = { render: () => <Selectable density="picker" /> };
export const Compact: StoryObj = { render: () => <Selectable density="compact" /> };
export const InAModal: StoryObj = { render: () => <Selectable density="modal" /> };

/* ---------------------------------------------------- sort and filter (UI-32) */

interface PlannedOrder {
  id: string;
  material: string;
  /** Grams; `null` when not planned yet. */
  planned: number | null;
  due: Date | null;
  status: 'In Progress' | 'Scheduled' | 'Complete';
}

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);

const PLANNED_ORDERS: PlannedOrder[] = [
  { id: '7009340', material: 'Dry Mix for pancakes', planned: 200, due: day(2026, 10, 21), status: 'In Progress' },
  { id: '7009341', material: 'Cocoa blend', planned: 1200, due: day(2026, 10, 5), status: 'Scheduled' },
  { id: '7009342', material: 'Waffle base', planned: 800, due: null, status: 'Complete' },
  { id: '7009343', material: 'Pancake mix XL', planned: 50, due: day(2026, 11, 2), status: 'Scheduled' },
  { id: '7009344', material: 'Cocoa nibs', planned: 9, due: day(2026, 10, 12), status: 'In Progress' },
  { id: '7009345', material: 'Sugar fine', planned: 3000, due: day(2026, 9, 30), status: 'Scheduled' },
  { id: '7009346', material: 'Waffle base', planned: 450, due: day(2026, 10, 19), status: 'Complete' },
  { id: '7009347', material: 'Dry Mix for crepes', planned: null, due: day(2026, 10, 25), status: 'Scheduled' },
  { id: '7009348', material: 'Vanilla sugar', planned: 75, due: day(2026, 10, 1), status: 'Complete' },
  { id: '7009349', material: 'Cocoa blend', planned: 100, due: day(2026, 10, 28), status: 'Scheduled' },
  { id: '7009350', material: 'Flour T55', planned: 2500, due: null, status: 'In Progress' },
  { id: '7009351', material: 'Oat flakes', planned: 600, due: day(2026, 10, 15), status: 'Scheduled' },
];

const grams = (value: number | null) =>
  value === null ? '-' : `${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} g`;
const ddmmyyyy = (value: Date | null) =>
  value === null
    ? '-'
    : `${String(value.getDate()).padStart(2, '0')}-${String(value.getMonth() + 1).padStart(2, '0')}-${value.getFullYear()}`;

// Planned and Due sort on the number and the Date, never on the formatted text.
const sortFilterColumns: ListTableColumn<PlannedOrder>[] = [
  { key: 'id', header: 'Order', render: (r) => r.id, sortable: true, filterable: true, accessor: (r) => r.id },
  { key: 'material', header: 'Material', render: (r) => r.material, sortable: true, filterable: true, accessor: (r) => r.material },
  { key: 'planned', header: 'Planned', render: (r) => grams(r.planned), className: 'text-right', sortable: true, accessor: (r) => r.planned },
  { key: 'due', header: 'Due', render: (r) => ddmmyyyy(r.due), sortable: true, accessor: (r) => r.due },
  { key: 'status', header: 'Status', render: (r) => r.status },
];

const PAGE_SIZE = 5;
const STATUSES = ['All', 'In Progress', 'Scheduled', 'Complete'] as const;

const SortAndFilterDemo = ({ density }: { density: ListTableDensity }) => {
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('All');
  const [page, setPage] = useState(1);

  // The screen's own filter runs first; the hook ANDs the column searches on top.
  const screenRows = useMemo(
    () => (status === 'All' ? PLANNED_ORDERS : PLANNED_ORDERS.filter((r) => r.status === status)),
    [status],
  );
  const table = useClientTable({ rows: screenRows, columns: sortFilterColumns, onPageReset: () => setPage(1) });
  const range = getPageRange(page, PAGE_SIZE, table.rows.length);
  const pageRows = table.rows.slice((range.page - 1) * PAGE_SIZE, range.page * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-[14px]">
        Status
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as (typeof STATUSES)[number]); setPage(1); }}
          className="rounded border border-slate-200 px-2 py-1"
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
      <ListTable columns={sortFilterColumns} rows={pageRows} rowKey={(r) => r.id}
        rowTestId={(r) => `order-${r.id}`} density={density} testId="story-sort-filter-table"
        ariaLabel="Orders" {...table.listTableProps} />
      <Pagination page={range.page} pageCount={range.pageCount} onPageChange={setPage}
        summary={`Rows ${range.from}-${range.to} of ${table.rows.length}`}
        labels={{ first: 'First', previous: 'Previous', next: 'Next', last: 'Last' }}
        ariaLabel="Pagination" />
    </div>
  );
};

export const SortAndFilter: StoryObj = { render: () => <SortAndFilterDemo density="picker" /> };
export const SortAndFilterCompact: StoryObj = { render: () => <SortAndFilterDemo density="compact" /> };
