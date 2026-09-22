import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { ColorSwatch } from '../components/ColorSwatch';
import { Dropdown } from '../components/Dropdown';
import { Modal } from '../components/Modal';

const meta: Meta = { title: 'Components/Dropdown', tags: ['autodocs'] };
export default meta;

const COUNTRIES = [
  { value: 'be', label: 'Belgium' },
  { value: 'nl', label: 'Netherlands' },
  { value: 'de', label: 'Germany' },
  { value: 'fr', label: 'France' },
];

const REASONS = [
  { value: 'mech', label: 'Mechanical failure', swatchColor: '#c05621' },
  { value: 'elec', label: 'Electrical failure', swatchColor: '#2b6cb0' },
  { value: 'change', label: 'Changeover', swatchColor: '#2f855a' },
  { value: 'unknown', label: 'Not yet classified', swatchColor: null },
  { value: 'locked', label: 'Retired reason', swatchColor: '#b83280', disabled: true },
];

type ControlledProps = {
  initial?: string | null;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  clearable?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  defaultOpen?: boolean;
  testId?: string;
};

function Controlled({ initial = null, ...rest }: ControlledProps) {
  const [value, setValue] = React.useState<string | null>(initial);
  return (
    <div className="w-80">
      <Dropdown<string> options={COUNTRIES} value={value} onChange={setValue} {...rest} />
    </div>
  );
}

export const Default: StoryObj = {
  render: () => <Controlled label="Country" />,
};

export const WithSelection: StoryObj = {
  render: () => <Controlled label="Country" initial="nl" />,
};

export const Required: StoryObj = {
  render: () => <Controlled label="Country" required />,
};

export const Disabled: StoryObj = {
  render: () => <Controlled label="Country" initial="be" disabled />,
};

export const NotClearable: StoryObj = {
  name: 'Without the clear control',
  render: () => <Controlled label="Country" initial="be" clearable={false} />,
};

export const Searchable: StoryObj = {
  name: 'Searchable, and open on mount',
  render: () => (
    <Controlled
      label="Country"
      searchable
      defaultOpen
      searchPlaceholder="Type to filter…"
      testId="country-dropdown"
    />
  ),
};

export const WithColourSwatches: StoryObj = {
  name: 'Coloured options',
  render: function Render() {
    const [value, setValue] = React.useState<string | null>('mech');
    return (
      <div className="flex w-80 flex-col gap-4">
        <Dropdown
          label="Downtime reason"
          options={REASONS}
          value={value}
          onChange={setValue}
          testId="reason-dropdown"
        />
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <ColorSwatch
            color={REASONS.find((r) => r.value === value)?.swatchColor ?? null}
            size={20}
            title="Selected reason colour"
            testId="reason-selected-swatch"
          />
          <span>
            The last option is <code>disabled</code>, and the fourth carries no colour, which is
            the state <code>ColorSwatch</code> draws as a dashed grey circle rather than nothing.
          </span>
        </div>
      </div>
    );
  },
};

export const InsideAModal: StoryObj = {
  name: 'Inside a modal (Escape closes only the dropdown)',
  render: function Render() {
    const [open, setOpen] = React.useState(true);
    const [value, setValue] = React.useState<string | null>(null);
    return (
      <>
        <button
          className="rounded-md border border-slate-200 px-3 py-1.5 text-sm"
          onClick={() => setOpen(true)}
        >
          Open the dialog
        </button>
        <Modal open={open} onClose={() => setOpen(false)} title="Report">
          <div className="p-6">
            <p className="mb-4 text-sm text-slate-600">
              Open the dropdown and press Escape. The list closes and this dialog stays, because
              both route through the shared <code>useEscapeKey</code> stack instead of listening
              for the key independently. A second press closes the dialog.
            </p>
            <Dropdown
              label="Country"
              options={COUNTRIES}
              value={value}
              onChange={setValue}
              testId="modal-dropdown"
            />
          </div>
        </Modal>
      </>
    );
  },
};
