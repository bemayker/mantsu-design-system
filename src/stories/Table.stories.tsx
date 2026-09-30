import type { Meta, StoryObj } from '@storybook/react';
import { Table } from '../components/Table';
import { EmptyState } from '../components/EmptyState';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { DataTable } from '../components/DataTable';
import type { DataTableColumn } from '../components/DataTable.types';

const meta: Meta = { title: 'Components/Table', tags: ['autodocs'] };
export default meta;

type Order = { id: string; name: string; status: string; qty: number };
const rows: Order[] = [
  { id: 'PO-1001', name: 'Batch Alpha', status: 'Running', qty: 120 },
  { id: 'PO-1002', name: 'Batch Beta', status: 'Completed', qty: 80 },
  { id: 'PO-1003', name: 'Batch Gamma', status: 'Paused', qty: 200 },
  { id: 'PO-1004', name: 'Batch Delta', status: 'Running', qty: 45 },
  { id: 'PO-1005', name: 'Batch Epsilon', status: 'Completed', qty: 310 },
  { id: 'PO-1006', name: 'Batch Zeta', status: 'Paused', qty: 15 },
];
const statusColor = (s: string) =>
  s === 'Running' ? 'info' : s === 'Completed' ? 'success' : 'warning';

const columns = [
  { key: 'id', header: 'Order' },
  { key: 'name', header: 'Name' },
  {
    key: 'status',
    header: 'Status',
    render: (r: Order) => <Badge status={statusColor(r.status) as any} dot>{r.status}</Badge>,
  },
  { key: 'qty', header: 'Qty', align: 'right' as const },
];

/**
 * Click a header to cycle its sort (ascending → descending → off); an arrow shows
 * the active direction. The button on the right of each header opens a menu to set
 * the sort explicitly and to search within that column.
 */
export const WithData: StoryObj = {
  render: () => <Table<Order> columns={columns} data={rows} />,
};

/** Large density — roomier padding and a bigger font. */
export const Large: StoryObj = {
  render: () => <Table<Order> columns={columns} data={rows} density="large" />,
};

/** The default (compact) and large densities side by side. */
export const DensityComparison: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-8">
      <div>
        <p className="mb-2 text-body-sm-emphasis text-slate-600">Compact (default)</p>
        <Table<Order> columns={columns} data={rows} />
      </div>
      <div>
        <p className="mb-2 text-body-sm-emphasis text-slate-600">Large</p>
        <Table<Order> columns={columns} data={rows} density="large" />
      </div>
    </div>
  ),
};

/** Sorting and column search disabled — the plain table. */
export const Static: StoryObj = {
  render: () => <Table<Order> columns={columns} data={rows} sortable={false} filterable={false} />,
};

/** Only the Name and Qty columns are sortable; only Name is searchable. */
export const PerColumnControls: StoryObj = {
  render: () => (
    <Table<Order>
      sortable={false}
      filterable={false}
      columns={[
        { key: 'id', header: 'Order' },
        { key: 'name', header: 'Name', sortable: true, filterable: true },
        {
          key: 'status',
          header: 'Status',
          render: (r) => <Badge status={statusColor(r.status) as any} dot>{r.status}</Badge>,
        },
        { key: 'qty', header: 'Qty', align: 'right', sortable: true },
      ]}
      data={rows}
    />
  ),
};

/** Starts pre-sorted by Qty descending via `defaultSort`. */
export const DefaultSorted: StoryObj = {
  render: () => (
    <Table<Order> columns={columns} data={rows} defaultSort={{ key: 'qty', direction: 'desc' }} />
  ),
};

export const Empty: StoryObj = {
  render: () => (
    <Table<Order>
      columns={[{ key: 'id', header: 'Order' }, { key: 'name', header: 'Name' }]}
      data={[]}
      emptyState={<EmptyState title="No production orders" description="Create your first order to get started." />}
    />
  ),
};

/**
 * An actions column keeps a visually empty header (`header: ''`) and still gives
 * its `columnheader` a name through `headerLabel`, rendered `sr-only`
 * (DT-FND-11-FB-1.1). `headerLabel` is ignored when `header` has visible text,
 * so the announced name always matches the visible one (label in name).
 */
export const ActionsColumn: StoryObj = {
  render: () => {
    const actionColumns: DataTableColumn<Order>[] = [
      { key: 'id', header: 'Order' },
      { key: 'name', header: 'Name' },
      { key: 'qty', header: 'Qty', align: 'right' },
      {
        key: 'actions',
        header: '',
        headerLabel: 'Actions',
        align: 'right',
        width: 120,
        render: (r) => (
          <Button size="sm" variant="outline" aria-label={`Edit ${r.name}`}>
            Edit
          </Button>
        ),
      },
    ];
    return <DataTable<Order> columns={actionColumns} data={rows} />;
  },
};
