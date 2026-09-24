import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { TimeField } from '../components/TimeField';
import type { TimeFieldProps } from '../components/TimeField';

const meta: Meta = { title: 'Components/TimeField', tags: ['autodocs'] };
export default meta;

type ControlledProps = Partial<Omit<TimeFieldProps, 'value' | 'onChange'>> & { initial?: string | null };

function Controlled({ initial = null, ...rest }: ControlledProps) {
  const [value, setValue] = React.useState<string | null>(initial);
  return (
    <div className="flex w-40 flex-col gap-2">
      <TimeField label="Start time" {...rest} value={value} onChange={setValue} />
      <p className="text-body-xs text-slate-500">
        Stored value: <code>{value === null ? 'null' : value}</code>
      </p>
    </div>
  );
}

export const Default: StoryObj = {
  render: () => <Controlled hint="24h. Try 805 and press Enter." />,
};

export const Midnight: StoryObj = {
  name: 'Midnight renders 00:00',
  render: () => <Controlled initial="00:00" />,
};

export const Required: StoryObj = {
  render: () => <Controlled required />,
};

export const Disabled: StoryObj = {
  render: () => <Controlled initial="14:30" disabled />,
};

export const WithError: StoryObj = {
  name: 'With a consumer error',
  render: () => <Controlled initial="06:00" error="Outside the shift" />,
};
