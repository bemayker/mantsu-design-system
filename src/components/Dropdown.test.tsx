import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useEscapeKey } from './useEscapeKey';
import { Dropdown } from './Dropdown';

const options = [
  { value: 'be', label: 'Belgium' },
  { value: 'nl', label: 'Netherlands' },
];

describe('Dropdown', () => {
  it('selects an option and reports it', () => {
    const handleChange = vi.fn();
    render(<Dropdown options={options} value={null} onChange={handleChange} />);

    fireEvent.click(screen.getByTestId('custom-dropdown-trigger'));
    fireEvent.click(screen.getByTestId('custom-dropdown-option-be'));

    expect(handleChange).toHaveBeenCalledWith('be');
  });

  it('shows the clear control for a selected value and clears it on click', () => {
    const handleChange = vi.fn();
    render(<Dropdown options={options} value="be" onChange={handleChange} />);

    fireEvent.click(screen.getByTestId('custom-dropdown-clear'));

    expect(handleChange).toHaveBeenCalledWith(null);
  });

  it('does not render the clear control when clearable is false', () => {
    render(<Dropdown options={options} value="be" onChange={vi.fn()} clearable={false} />);

    expect(screen.queryByTestId('custom-dropdown-clear')).not.toBeInTheDocument();
  });

  it('applies the selected highlight classes to the chosen option', () => {
    render(<Dropdown options={options} value="nl" onChange={vi.fn()} />);

    fireEvent.click(screen.getByTestId('custom-dropdown-trigger'));

    const selected = screen.getByTestId('custom-dropdown-option-nl');
    expect(selected.className).toContain('bg-selected-blue');
    expect(selected.className).toContain('text-primary-blue');
  });

  it('does not open the menu while disabled', () => {
    render(<Dropdown options={options} value={null} onChange={vi.fn()} disabled />);

    fireEvent.click(screen.getByTestId('custom-dropdown-trigger'));

    expect(screen.queryByTestId('custom-dropdown-options')).not.toBeInTheDocument();
  });

  // --- per-instance test ids ---------------------------------------------

  it('derives every test id from the testId prop so two dropdowns can share a page', () => {
    render(
      <>
        <Dropdown testId="first" options={options} value="be" onChange={vi.fn()} />
        <Dropdown testId="second" options={options} value={null} onChange={vi.fn()} />
      </>,
    );

    expect(screen.getByTestId('first-trigger')).toBeInTheDocument();
    expect(screen.getByTestId('second-trigger')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('second-trigger'));
    expect(screen.getByTestId('second-option-nl')).toBeInTheDocument();
    expect(screen.queryByTestId('first-option-nl')).not.toBeInTheDocument();
  });

  // --- searchable --------------------------------------------------------

  it('filters the options case-insensitively when searchable', () => {
    render(<Dropdown options={options} value={null} onChange={vi.fn()} searchable />);

    fireEvent.click(screen.getByTestId('custom-dropdown-trigger'));
    fireEvent.change(screen.getByTestId('custom-dropdown-search'), {
      target: { value: 'nether' },
    });

    expect(screen.getByTestId('custom-dropdown-option-nl')).toBeInTheDocument();
    expect(screen.queryByTestId('custom-dropdown-option-be')).not.toBeInTheDocument();
  });

  it('reopens unfiltered after the menu closes', () => {
    render(<Dropdown options={options} value={null} onChange={vi.fn()} searchable />);

    fireEvent.click(screen.getByTestId('custom-dropdown-trigger'));
    fireEvent.change(screen.getByTestId('custom-dropdown-search'), {
      target: { value: 'nether' },
    });
    fireEvent.click(screen.getByTestId('custom-dropdown-trigger'));
    fireEvent.click(screen.getByTestId('custom-dropdown-trigger'));

    expect(screen.getByTestId('custom-dropdown-option-be')).toBeInTheDocument();
  });

  // --- keyboard (WAI-ARIA combobox + listbox) -----------------------------

  const keyboardOptions = [
    { value: 'be', label: 'Belgium' },
    { value: 'de', label: 'Germany', disabled: true },
    { value: 'nl', label: 'Netherlands' },
  ];

  function trigger() {
    return screen.getByTestId('custom-dropdown-trigger');
  }

  it('ArrowDown opens the menu highlighting the selected option', () => {
    render(<Dropdown options={keyboardOptions} value="nl" onChange={vi.fn()} />);

    fireEvent.keyDown(trigger(), { key: 'ArrowDown' });

    expect(screen.getByTestId('custom-dropdown-options')).toBeInTheDocument();
    expect(screen.getByTestId('custom-dropdown-option-nl')).toHaveAttribute(
      'data-active-option',
      'true',
    );
    expect(trigger()).toHaveAttribute(
      'aria-activedescendant',
      screen.getByTestId('custom-dropdown-option-nl').id,
    );
  });

  it('ArrowDown wraps and skips disabled options', () => {
    render(<Dropdown options={keyboardOptions} value={null} onChange={vi.fn()} />);

    fireEvent.keyDown(trigger(), { key: 'ArrowDown' }); // opens on Belgium
    fireEvent.keyDown(trigger(), { key: 'ArrowDown' }); // Germany is disabled
    expect(screen.getByTestId('custom-dropdown-option-nl')).toHaveAttribute(
      'data-active-option',
      'true',
    );

    fireEvent.keyDown(trigger(), { key: 'ArrowDown' }); // wraps to Belgium
    expect(screen.getByTestId('custom-dropdown-option-be')).toHaveAttribute(
      'data-active-option',
      'true',
    );
  });

  it('Home and End jump to the first and last selectable option', () => {
    render(<Dropdown options={keyboardOptions} value={null} onChange={vi.fn()} />);

    fireEvent.keyDown(trigger(), { key: 'End' });
    expect(screen.getByTestId('custom-dropdown-option-nl')).toHaveAttribute(
      'data-active-option',
      'true',
    );

    fireEvent.keyDown(trigger(), { key: 'Home' });
    expect(screen.getByTestId('custom-dropdown-option-be')).toHaveAttribute(
      'data-active-option',
      'true',
    );
  });

  it('Enter picks the highlighted option and closes the menu', () => {
    const handleChange = vi.fn();
    render(<Dropdown options={keyboardOptions} value={null} onChange={handleChange} />);

    fireEvent.keyDown(trigger(), { key: 'ArrowDown' });
    fireEvent.keyDown(trigger(), { key: 'ArrowDown' });
    fireEvent.keyDown(trigger(), { key: 'Enter' });

    expect(handleChange).toHaveBeenCalledWith('nl');
    expect(screen.queryByTestId('custom-dropdown-options')).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it('Space picks the highlighted option when the dropdown is not searchable', () => {
    const handleChange = vi.fn();
    render(<Dropdown options={keyboardOptions} value={null} onChange={handleChange} />);

    fireEvent.keyDown(trigger(), { key: ' ' });
    fireEvent.keyDown(trigger(), { key: ' ' });

    expect(handleChange).toHaveBeenCalledWith('be');
  });

  it('Escape closes the menu, changes nothing, and returns focus to the trigger', () => {
    const handleChange = vi.fn();
    render(<Dropdown options={keyboardOptions} value={null} onChange={handleChange} />);

    fireEvent.keyDown(trigger(), { key: 'ArrowDown' });
    // `useEscapeKey` listens on `window`, so this is where the press lands.
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByTestId('custom-dropdown-options')).not.toBeInTheDocument();
    expect(handleChange).not.toHaveBeenCalled();
    expect(trigger()).toHaveFocus();
  });

  it('only the topmost open dropdown answers Escape, so a modal underneath stays open', () => {
    const onModalEscape = vi.fn();
    function Harness() {
      useEscapeKey(true, onModalEscape);
      return <Dropdown options={keyboardOptions} value={null} onChange={vi.fn()} />;
    }
    render(<Harness />);

    fireEvent.keyDown(trigger(), { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Escape' });

    // The dropdown registered last, so it is topmost and swallows this press.
    expect(screen.queryByTestId('custom-dropdown-options')).not.toBeInTheDocument();
    expect(onModalEscape).not.toHaveBeenCalled();

    // With the dropdown closed, the next press reaches the modal.
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onModalEscape).toHaveBeenCalledTimes(1);
  });

  it('Tab closes the menu without picking anything', () => {
    const handleChange = vi.fn();
    render(<Dropdown options={keyboardOptions} value={null} onChange={handleChange} />);

    fireEvent.keyDown(trigger(), { key: 'ArrowDown' });
    fireEvent.keyDown(trigger(), { key: 'Tab' });

    expect(screen.queryByTestId('custom-dropdown-options')).not.toBeInTheDocument();
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('typing a letter jumps to the next option starting with it', () => {
    render(<Dropdown options={keyboardOptions} value={null} onChange={vi.fn()} />);

    fireEvent.keyDown(trigger(), { key: 'ArrowDown' });
    fireEvent.keyDown(trigger(), { key: 'n' });

    expect(screen.getByTestId('custom-dropdown-option-nl')).toHaveAttribute(
      'data-active-option',
      'true',
    );
  });

  it('in searchable mode the arrows drive the filtered list from the search input', () => {
    const handleChange = vi.fn();
    render(
      <Dropdown options={keyboardOptions} value={null} onChange={handleChange} searchable />,
    );

    fireEvent.click(trigger());
    const search = screen.getByTestId('custom-dropdown-search');
    expect(search).toHaveFocus();

    fireEvent.change(search, { target: { value: 'e' } });
    // Belgium, Germany and Netherlands all contain an "e". Typing points at the
    // first match (UI-20.5), and one arrow skips the disabled Germany.
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    fireEvent.keyDown(search, { key: 'Enter' });

    expect(handleChange).toHaveBeenCalledWith('nl');
  });

  it('exposes the listbox and option roles a screen reader needs', () => {
    render(<Dropdown options={keyboardOptions} value="be" onChange={vi.fn()} />);

    expect(trigger()).toHaveAttribute('role', 'combobox');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger());

    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    const listbox = screen.getByRole('listbox');
    expect(listbox).toBe(screen.getByTestId('custom-dropdown-options'));
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(screen.getByTestId('custom-dropdown-option-be')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByTestId('custom-dropdown-option-de')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('a disabled option cannot be picked with the mouse either', () => {
    const handleChange = vi.fn();
    render(<Dropdown options={keyboardOptions} value={null} onChange={handleChange} />);

    fireEvent.click(trigger());
    fireEvent.click(screen.getByTestId('custom-dropdown-option-de'));

    expect(handleChange).not.toHaveBeenCalled();
  });

  // --- swatchColor -------------------------------------------------------

  const colorOptions = [
    { value: 'be', label: 'Belgium', swatchColor: '#155799' },
    { value: 'nl', label: 'Netherlands', swatchColor: null },
  ];

  it('renders a 12px swatch before an option label that carries swatchColor', () => {
    render(<Dropdown options={colorOptions} value={null} onChange={vi.fn()} />);

    fireEvent.click(screen.getByTestId('custom-dropdown-trigger'));

    const swatch = screen.getByTestId('custom-dropdown-swatch-be');
    expect(swatch).toHaveStyle({ width: '12px', height: '12px', backgroundColor: '#155799' });
  });

  it('does not render a swatch for an option without swatchColor', () => {
    render(<Dropdown options={colorOptions} value={null} onChange={vi.fn()} />);

    fireEvent.click(screen.getByTestId('custom-dropdown-trigger'));

    expect(screen.queryByTestId('custom-dropdown-swatch-nl')).not.toBeInTheDocument();
  });

  it('renders the trigger swatch for the selected option', () => {
    render(<Dropdown options={colorOptions} value="be" onChange={vi.fn()} />);

    expect(screen.getByTestId('custom-dropdown-trigger-swatch')).toHaveStyle({
      backgroundColor: '#155799',
    });
  });
  describe('DT-RPT-1 vendored divergences 3 and 4', () => {
    it('reports every filter keystroke through onSearchChange', () => {
      const handleSearchChange = vi.fn();
      render(
        <Dropdown
          options={options}
          value={null}
          onChange={vi.fn()}
          searchable
          onSearchChange={handleSearchChange}
        />,
      );

      fireEvent.click(screen.getByTestId('custom-dropdown-trigger'));
      fireEvent.change(screen.getByTestId('custom-dropdown-search'), {
        target: { value: 'bel' },
      });

      expect(handleSearchChange).toHaveBeenCalledWith('bel');
    });

    it('reports the reset when the menu closes, so a server-side query is not left narrowed', () => {
      const handleSearchChange = vi.fn();
      render(
        <Dropdown
          options={options}
          value={null}
          onChange={vi.fn()}
          searchable
          onSearchChange={handleSearchChange}
        />,
      );

      fireEvent.click(screen.getByTestId('custom-dropdown-trigger'));
      fireEvent.change(screen.getByTestId('custom-dropdown-search'), {
        target: { value: 'bel' },
      });
      handleSearchChange.mockClear();
      fireEvent.click(screen.getByTestId('custom-dropdown-trigger'));

      expect(handleSearchChange).toHaveBeenCalledWith('');
    });

    it('opens on mount with defaultOpen and lands focus in the filter input', () => {
      render(
        <Dropdown options={options} value={null} onChange={vi.fn()} searchable defaultOpen />,
      );

      expect(screen.getByTestId('custom-dropdown-options')).toBeInTheDocument();
      expect(screen.getByTestId('custom-dropdown-search')).toHaveFocus();
    });

    it('stays closed on mount without defaultOpen', () => {
      render(<Dropdown options={options} value={null} onChange={vi.fn()} searchable />);

      expect(screen.queryByTestId('custom-dropdown-options')).not.toBeInTheDocument();
    });
  });
});

describe('Dropdown portal (UI-20.4)', () => {
  const options = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
  ];

  it('renders the menu on document.body and still commits a choice', () => {
    const onChange = vi.fn();
    const { container } = render(
      <div style={{ overflow: 'hidden' }}>
        <Dropdown options={options} value={null} onChange={onChange} portal testId="pd" ariaLabel="Pick" />
      </div>,
    );

    fireEvent.click(screen.getByTestId('pd-trigger'));
    const menu = screen.getByTestId('pd-menu');
    expect(container.contains(menu)).toBe(false);
    expect(document.body.contains(menu)).toBe(true);

    fireEvent.mouseDown(screen.getByTestId('pd-option-b'));
    fireEvent.click(screen.getByTestId('pd-option-b'));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('closes on a press outside both the trigger and the portalled menu', () => {
    render(<Dropdown options={options} value={null} onChange={() => undefined} portal testId="pd" ariaLabel="Pick" />);

    fireEvent.click(screen.getByTestId('pd-trigger'));
    fireEvent.mouseDown(document.body);

    expect(screen.queryByTestId('pd-menu')).toBeNull();
  });

  it('says so when a search matches nothing', () => {
    render(
      <Dropdown options={options} value={null} onChange={() => undefined} searchable
        noResultsLabel="No results" testId="pd" ariaLabel="Pick" />,
    );

    fireEvent.click(screen.getByTestId('pd-trigger'));
    fireEvent.change(screen.getByTestId('pd-search'), { target: { value: 'zzz' } });

    expect(screen.getByTestId('pd-no-results')).toHaveTextContent('No results');
  });
});
