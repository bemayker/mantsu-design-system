import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MultiSelectDropdown } from './MultiSelectDropdown';

const options = [
  { value: 'alloys', label: 'Alloys' },
  { value: 'packaging', label: 'Packaging' },
];

describe('MultiSelectDropdown', () => {
  it('adds a value without dropping the ones already selected', () => {
    const handleChange = vi.fn();
    render(<MultiSelectDropdown options={options} values={['alloys']} onChange={handleChange} />);

    fireEvent.click(screen.getByTestId('multi-select-trigger'));
    fireEvent.click(screen.getByTestId('multi-select-option-packaging'));

    expect(handleChange).toHaveBeenCalledWith(['alloys', 'packaging']);
  });

  it('toggles a selected option off when it is picked again', () => {
    const handleChange = vi.fn();
    render(
      <MultiSelectDropdown
        options={options}
        values={['alloys', 'packaging']}
        onChange={handleChange}
      />,
    );

    fireEvent.click(screen.getByTestId('multi-select-trigger'));
    fireEvent.click(screen.getByTestId('multi-select-option-alloys'));

    expect(handleChange).toHaveBeenCalledWith(['packaging']);
  });

  it('keeps the menu open after a toggle so several values can be picked', () => {
    render(<MultiSelectDropdown options={options} values={[]} onChange={vi.fn()} />);

    fireEvent.click(screen.getByTestId('multi-select-trigger'));
    fireEvent.click(screen.getByTestId('multi-select-option-alloys'));

    expect(screen.getByTestId('multi-select-options')).toBeInTheDocument();
  });

  it('renders one removable chip per selected value', () => {
    const handleChange = vi.fn();
    render(
      <MultiSelectDropdown
        options={options}
        values={['alloys', 'packaging']}
        onChange={handleChange}
      />,
    );

    expect(screen.getByTestId('multi-select-chip-alloys')).toHaveTextContent('Alloys');
    expect(screen.getByTestId('multi-select-chip-packaging')).toHaveTextContent('Packaging');

    fireEvent.click(screen.getByTestId('multi-select-chip-remove-alloys'));

    expect(handleChange).toHaveBeenCalledWith(['packaging']);
  });

  it('removing the last chip yields an empty array, which is the clearing form', () => {
    const handleChange = vi.fn();
    render(<MultiSelectDropdown options={options} values={['alloys']} onChange={handleChange} />);

    fireEvent.click(screen.getByTestId('multi-select-chip-remove-alloys'));

    expect(handleChange).toHaveBeenCalledWith([]);
  });

  it('shows the placeholder when nothing is selected', () => {
    render(
      <MultiSelectDropdown
        options={options}
        values={[]}
        onChange={vi.fn()}
        placeholder="Select classes"
      />,
    );

    expect(screen.getByTestId('multi-select-trigger')).toHaveTextContent('Select classes');
  });

  it('renders a selected value that is NOT in options, with its badge', () => {
    // The case this component exists for: the caller's option list holds only
    // ACTIVE records, but the current selection can include an archived one. A
    // silently dropped chip would be silently dropped from the next save too.
    render(
      <MultiSelectDropdown
        options={options}
        values={['alloys', 'retired']}
        onChange={vi.fn()}
        resolveMissingOption={(value) =>
          value === 'retired' ? { label: 'Retired Class', badge: 'Archived' } : null
        }
      />,
    );

    expect(screen.getByTestId('multi-select-chip-retired')).toHaveTextContent('Retired Class');
    expect(screen.getByTestId('multi-select-chip-badge-retired')).toHaveTextContent('Archived');
  });

  it('falls back to the raw value when a missing option cannot be resolved', () => {
    render(
      <MultiSelectDropdown
        options={options}
        values={['ghost']}
        onChange={vi.fn()}
        resolveMissingOption={() => null}
      />,
    );

    expect(screen.getByTestId('multi-select-chip-ghost')).toHaveTextContent('ghost');
  });

  it('renders no remove control and opens no menu when disabled', () => {
    render(
      <MultiSelectDropdown options={options} values={['alloys']} onChange={vi.fn()} disabled />,
    );

    expect(screen.queryByTestId('multi-select-chip-remove-alloys')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('multi-select-trigger'));
    expect(screen.queryByTestId('multi-select-options')).not.toBeInTheDocument();
  });

  it('filters the option list when searchable', () => {
    render(<MultiSelectDropdown options={options} values={[]} onChange={vi.fn()} searchable />);

    fireEvent.click(screen.getByTestId('multi-select-trigger'));
    fireEvent.change(screen.getByTestId('multi-select-search'), { target: { value: 'pack' } });

    expect(screen.getByTestId('multi-select-option-packaging')).toBeInTheDocument();
    expect(screen.queryByTestId('multi-select-option-alloys')).not.toBeInTheDocument();
  });

  it('derives chip and option testids from a custom testId', () => {
    render(
      <MultiSelectDropdown
        options={options}
        values={['alloys']}
        onChange={vi.fn()}
        testId="material-class-filter"
      />,
    );

    expect(screen.getByTestId('material-class-filter-chip-alloys')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('material-class-filter-trigger'));
    expect(screen.getByTestId('material-class-filter-option-packaging')).toBeInTheDocument();
  });

  // --- keyboard (WAI-ARIA combobox + multiselectable listbox) -------------

  const keyboardOptions = [
    { value: 'be', label: 'Belgium' },
    { value: 'de', label: 'Germany', disabled: true },
    { value: 'nl', label: 'Netherlands' },
  ];

  function msTrigger() {
    return screen.getByTestId('multi-select-trigger');
  }

  it('ArrowDown opens the menu and Enter toggles without closing it', () => {
    const handleChange = vi.fn();
    render(
      <MultiSelectDropdown options={keyboardOptions} values={[]} onChange={handleChange} />,
    );

    fireEvent.keyDown(msTrigger(), { key: 'ArrowDown' });
    expect(screen.getByTestId('multi-select-options')).toBeInTheDocument();

    fireEvent.keyDown(msTrigger(), { key: 'Enter' });

    expect(handleChange).toHaveBeenCalledWith(['be']);
    // Picking several values is the point, so the menu stays open.
    expect(screen.getByTestId('multi-select-options')).toBeInTheDocument();
  });

  it('the arrows skip disabled options and wrap', () => {
    render(<MultiSelectDropdown options={keyboardOptions} values={[]} onChange={vi.fn()} />);

    fireEvent.keyDown(msTrigger(), { key: 'ArrowDown' });
    fireEvent.keyDown(msTrigger(), { key: 'ArrowDown' });
    expect(screen.getByTestId('multi-select-option-nl')).toHaveAttribute(
      'data-active-option',
      'true',
    );

    fireEvent.keyDown(msTrigger(), { key: 'ArrowDown' });
    expect(screen.getByTestId('multi-select-option-be')).toHaveAttribute(
      'data-active-option',
      'true',
    );
  });

  it('Escape closes the menu and returns focus to the trigger', () => {
    render(<MultiSelectDropdown options={keyboardOptions} values={[]} onChange={vi.fn()} />);

    fireEvent.keyDown(msTrigger(), { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByTestId('multi-select-options')).not.toBeInTheDocument();
    expect(msTrigger()).toHaveFocus();
  });

  it('typing a letter jumps to the next option starting with it', () => {
    render(<MultiSelectDropdown options={keyboardOptions} values={[]} onChange={vi.fn()} />);

    fireEvent.keyDown(msTrigger(), { key: 'ArrowDown' });
    fireEvent.keyDown(msTrigger(), { key: 'n' });

    expect(screen.getByTestId('multi-select-option-nl')).toHaveAttribute(
      'data-active-option',
      'true',
    );
  });

  it('exposes a multiselectable listbox with per-option selected state', () => {
    render(<MultiSelectDropdown options={keyboardOptions} values={['nl']} onChange={vi.fn()} />);

    expect(msTrigger()).toHaveAttribute('role', 'combobox');
    fireEvent.click(msTrigger());

    const listbox = screen.getByRole('listbox');
    expect(listbox).toHaveAttribute('aria-multiselectable', 'true');
    expect(screen.getByTestId('multi-select-option-nl')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('multi-select-option-be')).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('multi-select-option-de')).toHaveAttribute('aria-disabled', 'true');
  });

  it('a disabled option cannot be toggled with the mouse', () => {
    const handleChange = vi.fn();
    render(
      <MultiSelectDropdown options={keyboardOptions} values={[]} onChange={handleChange} />,
    );

    fireEvent.click(msTrigger());
    fireEvent.click(screen.getByTestId('multi-select-option-de'));

    expect(handleChange).not.toHaveBeenCalled();
  });
});
