import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FormField } from '../components/FormField';
import { SearchInput } from '../components/SearchInput';
import { Input } from '../components/Input';
import { Switch } from '../components/Switch';
import { Checkbox } from '../components/Checkbox';
import { Radio } from '../components/Radio';

const meta: Meta = { title: 'Components/Form', tags: ['autodocs'] };
export default meta;

export const TextInput: StoryObj = {
  render: () => (
    <div className="flex w-80 flex-col gap-4">
      <Input label="Order name" placeholder="Enter a name" hint="Shown in the order list." />
      <Input label="Quantity" defaultValue="120" />
      <Input label="Email" error="Enter a valid email address." defaultValue="not-an-email" />
      <Input label="Disabled" disabled placeholder="Read only" />
    </div>
  ),
};
export const Switches: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Switch label="Enabled" defaultChecked />
      <Switch label="Disabled off" disabled />
      <Switch label="Disabled on" disabled defaultChecked />
    </div>
  ),
};
export const Checkboxes: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Checkbox label="Default" />
      <Checkbox label="Checked" defaultChecked />
      <Checkbox label="Indeterminate" indeterminate />
      <Checkbox label="Disabled" disabled />
    </div>
  ),
};
export const Radios: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Radio name="g" label="Option A" defaultChecked />
      <Radio name="g" label="Option B" />
      <Radio name="g" label="Disabled" disabled />
    </div>
  ),
};

export const FormFields: StoryObj = {
  render: () => {
    const [code, setCode] = React.useState('');
    const [note, setNote] = React.useState('');
    return (
      <div className="flex max-w-sm flex-col gap-4">
        <FormField fieldId="story-code" label="Code" required value={code} onChange={setCode}
          error={code === '' ? 'A code is required' : null} />
        <FormField fieldId="story-qty" label="Quantity" variant="registration" type="number"
          inputMode="decimal" value="12" onChange={() => undefined} />
        <FormField fieldId="story-note" label="Note" control="textarea" value={note} onChange={setNote} />
      </div>
    );
  },
};

export const SearchFields: StoryObj = {
  render: () => {
    const [q, setQ] = React.useState('');
    return (
      <div className="flex max-w-sm flex-col gap-4">
        <SearchInput value={q} onChange={setQ} placeholder="Search" ariaLabel="Search equipment" />
        <SearchInput value={q} onChange={setQ} placeholder="Search" ariaLabel="Search orders" variant="borderless" />
      </div>
    );
  },
};
