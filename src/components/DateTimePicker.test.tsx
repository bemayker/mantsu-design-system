import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { DateTimePicker } from './DateTimePicker';
import type { DateTimePickerProps } from './DateTimePicker';

type HarnessProps = Partial<Omit<DateTimePickerProps, 'value' | 'onChange'>> & {
  initial?: string | null;
  onChangeSpy?: (value: string | null) => void;
};

function Harness({ initial = null, onChangeSpy, ...rest }: HarnessProps) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <>
      <DateTimePicker
        testId="dtp"
        label="Start"
        {...rest}
        value={value}
        onChange={(next) => {
          onChangeSpy?.(next);
          setValue(next);
        }}
      />
      <button type="button">Elsewhere</button>
    </>
  );
}

const dateInput = () => screen.getByTestId('dtp-date') as HTMLInputElement;
const timeInput = () => screen.getByTestId('dtp-time') as HTMLInputElement;

describe('DateTimePicker', () => {
  it('splits the value into a DD/MM/YYYY date and a 24h time, inside a labelled group', () => {
    render(<Harness initial="2026-07-09T08:00" />);

    expect(dateInput()).toHaveValue('09/07/2026');
    expect(timeInput()).toHaveValue('08:00');
    expect(screen.getByTestId('dtp')).toHaveAttribute('role', 'group');
    expect(screen.getByRole('group', { name: 'Start' })).toBe(screen.getByTestId('dtp'));
    expect(dateInput()).toHaveAccessibleName('Date');
    expect(timeInput()).toHaveAccessibleName('Time');
  });

  it('renders midnight as 00:00', () => {
    render(<Harness initial="2026-07-09T00:00" />);

    expect(timeInput()).toHaveValue('00:00');
  });

  it('renders an unreadable value as two empty fields', () => {
    render(<DateTimePicker value="2026-07-09 08:00" onChange={vi.fn()} testId="dtp" />);

    expect(dateInput()).toHaveValue('');
    expect(timeInput()).toHaveValue('');
  });

  it('reports YYYY-MM-DDTHH:MM once both halves are filled, and not before', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChangeSpy={spy} />);

    await user.type(dateInput(), '09/07/2026');
    expect(spy).not.toHaveBeenCalled();
    await user.type(timeInput(), '08:00');

    expect(spy.mock.calls).toEqual([['2026-07-09T08:00']]);
  });

  it('reports a change to either half of an existing value', () => {
    const spy = vi.fn();
    render(<Harness initial="2026-07-09T08:00" onChangeSpy={spy} />);

    fireEvent.change(timeInput(), { target: { value: '22:30' } });
    expect(spy).toHaveBeenLastCalledWith('2026-07-09T22:30');
    fireEvent.change(dateInput(), { target: { value: '10/07/2026' } });
    expect(spy).toHaveBeenLastCalledWith('2026-07-10T22:30');
  });

  it('reports nothing while one half is empty, and says so once focus leaves the group', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness initial="2026-07-09T08:00" onChangeSpy={spy} />);

    await user.clear(timeInput());
    expect(spy).not.toHaveBeenCalled();
    expect(screen.queryByTestId('dtp-error')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Elsewhere' }));
    expect(screen.getByTestId('dtp-error')).toHaveTextContent('Enter both a date and a time');
    expect(spy).not.toHaveBeenCalled();
  });

  it('reports null once both halves are cleared', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness initial="2026-07-09T08:00" onChangeSpy={spy} />);

    await user.clear(timeInput());
    await user.clear(dateInput());

    expect(spy.mock.calls).toEqual([[null]]);
  });

  it('holds the value back while the other half is invalid', () => {
    const spy = vi.fn();
    render(<Harness initial="2026-07-09T08:00" onChangeSpy={spy} />);

    fireEvent.change(timeInput(), { target: { value: '25:00' } });
    fireEvent.change(dateInput(), { target: { value: '10/07/2026' } });
    expect(spy).not.toHaveBeenCalled();

    fireEvent.change(timeInput(), { target: { value: '09:15' } });
    expect(spy).toHaveBeenLastCalledWith('2026-07-10T09:15');
  });

  it('follows a value changed from outside', () => {
    const { rerender } = render(<DateTimePicker value="2026-07-09T08:00" onChange={vi.fn()} testId="dtp" />);

    rerender(<DateTimePicker value="2026-12-31T23:59" onChange={vi.fn()} testId="dtp" />);
    expect(dateInput()).toHaveValue('31/12/2026');
    expect(timeInput()).toHaveValue('23:59');

    rerender(<DateTimePicker value={null} onChange={vi.fn()} testId="dtp" />);
    expect(dateInput()).toHaveValue('');
    expect(timeInput()).toHaveValue('');
  });

  it('follows an outside reset to null while one half is cleared', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<DateTimePicker value="2026-07-09T08:00" onChange={onChange} testId="dtp" />);

    await user.clear(timeInput());
    expect(onChange).not.toHaveBeenCalled();
    rerender(<DateTimePicker value={null} onChange={onChange} testId="dtp" />);

    expect(dateInput()).toHaveValue('');
    expect(timeInput()).toHaveValue('');
  });

  it('keeps a reported value when the consumer echoes it back', () => {
    const spy = vi.fn();
    render(<Harness initial="2026-07-09T08:00" onChangeSpy={spy} />);

    fireEvent.change(timeInput(), { target: { value: '09:00' } });

    expect(spy).toHaveBeenCalledWith('2026-07-09T09:00');
    expect(dateInput()).toHaveValue('09/07/2026');
    expect(timeInput()).toHaveValue('09:00');
  });

  it('derives the calendar ids from the date half and applies min to it', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness initial="2026-07-09T08:00" min="2026-07-05" onChangeSpy={spy} locale="nl" />);

    await user.click(screen.getByTestId('dtp-date-toggle'));
    expect(screen.getByTestId('dtp-date-month-label')).toHaveTextContent('juli 2026');
    expect(screen.getByTestId('dtp-date-day-2026-07-04')).toHaveAttribute('aria-disabled', 'true');

    await user.click(screen.getByTestId('dtp-date-day-2026-07-06'));
    expect(spy).toHaveBeenLastCalledWith('2026-07-06T08:00');
  });

  it('shows a consumer error for the group and disables both halves', () => {
    const { rerender } = render(
      <DateTimePicker value={null} onChange={vi.fn()} testId="dtp" error="End is before start" />,
    );
    expect(screen.getByTestId('dtp-error')).toHaveTextContent('End is before start');
    expect(screen.getByTestId('dtp')).toHaveAttribute('aria-describedby', screen.getByTestId('dtp-error').id);

    rerender(<DateTimePicker value={null} onChange={vi.fn()} testId="dtp" disabled />);
    expect(dateInput()).toBeDisabled();
    expect(timeInput()).toBeDisabled();
    expect(screen.getByTestId('dtp-date-toggle')).toBeDisabled();
  });
});
