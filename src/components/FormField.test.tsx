import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FormField } from './FormField';

describe('FormField', () => {
  it('associates the label with the control and reports typing', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FormField fieldId="tree-code" label="ID" value="" onChange={onChange} required />);

    const input = screen.getByLabelText(/ID/);
    expect(input).toBe(screen.getByTestId('tree-code'));

    await user.type(input, 'S');

    expect(onChange).toHaveBeenCalledWith('S');
  });

  it('renders no error box and no aria-invalid when there is no error', () => {
    render(<FormField fieldId="tree-code" label="ID" value="SCRAP" onChange={() => {}} />);

    expect(screen.queryByTestId('tree-code-error')).not.toBeInTheDocument();
    expect(screen.getByTestId('tree-code')).not.toHaveAttribute('aria-invalid');
  });

  it('wires aria-invalid and aria-describedby to the error message', () => {
    render(
      <FormField
        fieldId="tree-code"
        label="ID"
        value="SCRAP"
        onChange={() => {}}
        error="A reason tree with this ID already exists."
      />,
    );

    const input = screen.getByTestId('tree-code');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'tree-code-error');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'A reason tree with this ID already exists.',
    );
  });

  it('passes disabled through to the control', () => {
    render(
      <FormField fieldId="tree-code" label="ID" value="SCRAP" onChange={() => {}} disabled />,
    );

    expect(screen.getByTestId('tree-code')).toBeDisabled();
  });

  it('renders a textarea when asked for one', () => {
    render(
      <FormField
        fieldId="reason-description"
        label="Description"
        value=""
        onChange={() => {}}
        control="textarea"
        rows={3}
      />,
    );

    expect(screen.getByTestId('reason-description').tagName).toBe('TEXTAREA');
  });

  it('renders a native select with the given options', () => {
    render(
      <FormField
        fieldId="translation-language"
        label="Language"
        value="nl"
        onChange={() => {}}
        control="select"
        options={[
          { value: 'en', label: 'English' },
          { value: 'nl', label: 'Nederlands' },
        ]}
      />,
    );

    const select = screen.getByTestId('translation-language') as HTMLSelectElement;
    expect(select.tagName).toBe('SELECT');
    expect([...select.options].map((option) => option.value)).toEqual(['en', 'nl']);
    expect(select.value).toBe('nl');
  });

  it('puts the requested type on the input and defaults it to text', async () => {
    // `time` is the remaining non-text type a caller may pass; every other
    // caller passes no `type` and must keep the text control it has always
    // had. Dates and date-times are controls now, not types (CORE-FB-23).
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <FormField fieldId="event-time" label="Time" value="" onChange={onChange} />,
    );

    expect(screen.getByTestId('event-time')).toHaveAttribute('type', 'text');

    rerender(
      <FormField fieldId="event-time" label="Time" value="10:00" onChange={onChange} type="time" />,
    );

    const input = screen.getByTestId('event-time');
    expect(input).toHaveAttribute('type', 'time');
    // The control still reports through the same callback, so the prop
    // changes the widget and nothing else.
    expect(input).toHaveValue('10:00');
    await user.clear(input);
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('forwards step and inputMode to a number input (OC-EXE-6)', () => {
    // A decimal quantity needs `step="any"`: the browser's default step is
    // `1`, which refuses `12.5`. `inputMode` is the tablet keypad.
    render(
      <FormField
        fieldId="confirm-quantity"
        label="Amount"
        value=""
        onChange={() => {}}
        type="number"
        step="any"
        inputMode="decimal"
      />,
    );

    const input = screen.getByTestId('confirm-quantity');
    expect(input).toHaveAttribute('type', 'number');
    expect(input).toHaveAttribute('step', 'any');
    expect(input).toHaveAttribute('inputmode', 'decimal');
  });

  it('carries neither step nor inputMode when the caller passes none', () => {
    render(<FormField fieldId="tree-code" label="ID" value="" onChange={() => {}} />);

    const input = screen.getByTestId('tree-code');
    expect(input).not.toHaveAttribute('step');
    expect(input).not.toHaveAttribute('inputmode');
  });

  it('renders the registration variant at its own recorded size', () => {
    // `h-9 px-3`, measured from Make's ConfirmModal. `compact` is `px-2`,
    // and bending it to fit would be a Fidelity Rule defect on the surface
    // it was measured from, so this is a third entry rather than a reuse.
    const { rerender } = render(
      <FormField
        fieldId="confirm-quantity"
        label="Amount"
        value=""
        onChange={() => {}}
        variant="registration"
      />,
    );

    expect(screen.getByTestId('confirm-quantity').className).toContain('h-9 px-3');

    rerender(
      <FormField
        fieldId="confirm-quantity"
        label="Amount"
        value=""
        onChange={() => {}}
        variant="compact"
      />,
    );

    expect(screen.getByTestId('confirm-quantity').className).toContain('h-9 px-2');
  });
});

describe('FormField custom control', () => {
  it('renders children instead of the built-in control, under the same label', () => {
    render(
      <FormField fieldId="day" label="Day" error="Pick a day" showError={false}>
        <input id="day" data-testid="custom-day" />
      </FormField>,
    );

    expect(screen.getByLabelText('Day')).toHaveAttribute('data-testid', 'custom-day');
    expect(screen.queryByTestId('day-error')).toBeNull();
  });
});

describe('FormField inputProps', () => {
  it('spreads native attributes onto the built-in input', () => {
    render(<FormField fieldId="limit" label="Limit" type="number" inputProps={{ min: 0 }} />);

    expect(screen.getByLabelText('Limit')).toHaveAttribute('min', '0');
  });
});
