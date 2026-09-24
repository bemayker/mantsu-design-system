import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { DatePicker } from '../components/DatePicker';
import type { DatePickerProps } from '../components/DatePicker';
import { Modal } from '../components/Modal';

const meta: Meta = { title: 'Components/DatePicker', tags: ['autodocs'] };
export default meta;

type ControlledProps = Partial<Omit<DatePickerProps, 'value' | 'onChange'>> & { initial?: string | null };

function Controlled({ initial = null, ...rest }: ControlledProps) {
  const [value, setValue] = React.useState<string | null>(initial);
  return (
    <div className="flex w-80 flex-col gap-2">
      <DatePicker label="Start day" {...rest} value={value} onChange={setValue} />
      <p className="text-body-xs text-slate-500">
        Stored value: <code>{value === null ? 'null' : value}</code>
      </p>
    </div>
  );
}

export const Default: StoryObj = {
  render: () => <Controlled testId="start-day" />,
};

export const WithValue: StoryObj = {
  name: 'With a value',
  render: () => <Controlled initial="2026-07-06" />,
};

export const Required: StoryObj = {
  render: () => <Controlled required hint="Days are in plant time." />,
};

export const Disabled: StoryObj = {
  render: () => <Controlled initial="2026-07-06" disabled />,
};

export const WithError: StoryObj = {
  name: 'With a consumer error',
  render: () => <Controlled initial="2026-07-01" error="End day is before the start day" />,
};

export const MinMax: StoryObj = {
  name: 'Bounded by min and max',
  render: () => (
    <Controlled
      initial="2026-07-10"
      min="2026-07-05"
      max="2026-07-24"
      hint="Only 05/07/2026 to 24/07/2026. Typing 30/06/2026 is rejected with its own message."
    />
  ),
};

export const TypedOnly: StoryObj = {
  name: 'Typed only (no calendar)',
  render: () => <Controlled withCalendar={false} hint="Try 5/2/26 and press Enter: it becomes 05/02/2026." />,
};

export const Dutch: StoryObj = {
  name: 'Dutch month and weekday names',
  render: () => (
    <Controlled
      initial="2026-07-06"
      locale="nl"
      label="Startdag"
      labels={{
        openCalendar: 'Kalender openen',
        calendar: 'Kies een datum',
        previousMonth: 'Vorige maand',
        nextMonth: 'Volgende maand',
        today: 'Vandaag',
        clear: 'Wissen',
        invalidDate: 'Voer een datum in als DD/MM/JJJJ',
        beforeMin: 'Datum ligt vóór {min}',
        afterMax: 'Datum ligt na {max}',
      }}
      hint="The names follow the app language; the typed format stays DD/MM/YYYY."
    />
  ),
};

export const InsideAModal: StoryObj = {
  name: 'Inside a modal (Escape closes only the calendar)',
  render: function Render() {
    const [open, setOpen] = React.useState(true);
    const [value, setValue] = React.useState<string | null>('2026-07-06');
    return (
      <>
        <button
          className="rounded-md border border-slate-200 px-3 py-1.5 text-sm"
          onClick={() => setOpen(true)}
        >
          Open the dialog
        </button>
        <Modal open={open} onClose={() => setOpen(false)} title="New exception">
          <div className="p-6">
            <p className="mb-4 text-sm text-slate-600">
              Open the calendar and press Escape. The calendar closes and this dialog stays,
              because both route through the shared <code>useEscapeKey</code> stack. A second
              press closes the dialog.
            </p>
            <DatePicker label="Start day" value={value} onChange={setValue} testId="modal-date" />
          </div>
        </Modal>
      </>
    );
  },
};
