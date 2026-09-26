import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ListTable, type ListTableColumn, type ListTableDensity } from '../components/ListTable';

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
