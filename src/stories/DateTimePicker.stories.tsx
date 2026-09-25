import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { DateTimePicker } from '../components/DateTimePicker';
import type { DateTimePickerProps } from '../components/DateTimePicker';

const meta: Meta = { title: 'Components/DateTimePicker', tags: ['autodocs'] };
export default meta;

type ControlledProps = Partial<Omit<DateTimePickerProps, 'value' | 'onChange'>> & { initial?: string | null };

function Controlled({ initial = null, ...rest }: ControlledProps) {
  const [value, setValue] = React.useState<string | null>(initial);
  return (
    <div className="flex w-96 flex-col gap-2">
      <DateTimePicker label="Start" {...rest} value={value} onChange={setValue} />
      <p className="text-body-xs text-slate-500">
        Stored value: <code>{value === null ? 'null' : value}</code>
      </p>
    </div>
  );
}

export const Default: StoryObj = {
  render: () => <Controlled testId="exception-start" hint="Fill both halves; a half-filled entry reports nothing." />,
};

export const WithValue: StoryObj = {
  name: 'With a value',
  render: () => <Controlled initial="2026-07-09T08:00" />,
};

export const Midnight: StoryObj = {
  name: 'At midnight',
  render: () => <Controlled initial="2026-07-09T00:00" />,
};

export const Required: StoryObj = {
  render: () => <Controlled required />,
};

export const Disabled: StoryObj = {
  render: () => <Controlled initial="2026-07-09T08:00" disabled />,
};

export const WithError: StoryObj = {
  name: 'With a consumer error',
  render: () => <Controlled initial="2026-07-09T06:00" error="End is before start" />,
};

function ValidatedControlled({ initial = null, ...rest }: ControlledProps) {
  const [value, setValue] = React.useState<string | null>(initial);
  const [valid, setValid] = React.useState(true);
  return (
    <div className="flex w-96 flex-col gap-2">
      <DateTimePicker
        label="Start"
        {...rest}
        value={value}
        onChange={setValue}
        onValidityChange={setValid}
        hint="Save is disabled while the fields do not hold a reportable value."
      />
      <button type="button" disabled={!valid} className="w-fit rounded-md bg-primary-blue px-3 py-1.5 text-white disabled:opacity-40">
        Save
      </button>
    </div>
  );
}

export const WithValidityGatedSave: StoryObj = {
  name: 'Gating Save on onValidityChange',
  render: () => <ValidatedControlled testId="gated-start" />,
};

export const CustomPlaceholders: StoryObj = {
  name: 'Custom placeholders',
  render: () => <Controlled datePlaceholder="Choose a date" timePlaceholder="Choose a time" />,
};

export const Dutch: StoryObj = {
  name: 'Dutch',
  render: () => (
    <Controlled
      initial="2026-07-09T22:00"
      locale="nl"
      label="Einde"
      labels={{
        date: 'Datum',
        time: 'Tijd',
        incomplete: 'Vul zowel een datum als een tijd in',
        openCalendar: 'Kalender openen',
        invalidDate: 'Voer een datum in als DD/MM/JJJJ',
        invalidTime: 'Voer een tijd in als UU:MM',
      }}
    />
  ),
};
