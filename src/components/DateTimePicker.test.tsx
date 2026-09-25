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

describe('DateTimePicker: onValidityChange', () => {
  it('fires once on mount with true when both halves start empty', () => {
    const spy = vi.fn();
    render(<Harness onValidityChange={spy} />);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(true);
  });

  it('fires once on mount with true when both halves start with a valid value', () => {
    const spy = vi.fn();
    render(<Harness initial="2026-07-09T08:00" onValidityChange={spy} />);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(true);
  });

  it('flips false while exactly one half is filled, and true again once the other is corrected', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness onValidityChange={spy} />);
    spy.mockClear();

    await user.type(dateInput(), '09/07/2026');
    expect(spy).toHaveBeenLastCalledWith(false);

    await user.type(timeInput(), '08:00');
    expect(spy).toHaveBeenLastCalledWith(true);
  });

  it('flags an invalid date half as soon as it is typed, with no blur', () => {
    const spy = vi.fn();
    render(<Harness initial="2026-07-09T08:00" onValidityChange={spy} />);
    spy.mockClear();

    fireEvent.change(dateInput(), { target: { value: '31/02/2026' } });

    expect(spy).toHaveBeenLastCalledWith(false);
  });

  it('flags an invalid time half as soon as it is typed, with no blur', () => {
    const spy = vi.fn();
    render(<Harness initial="2026-07-09T08:00" onValidityChange={spy} />);
    spy.mockClear();

    fireEvent.change(timeInput(), { target: { value: '25:00' } });

    expect(spy).toHaveBeenLastCalledWith(false);
  });

  it('flags a date half that is out of range', () => {
    const spy = vi.fn();
    render(<Harness initial="2026-07-09T08:00" min="2026-07-05" onValidityChange={spy} />);
    spy.mockClear();

    fireEvent.change(dateInput(), { target: { value: '01/07/2026' } });

    expect(spy).toHaveBeenLastCalledWith(false);
  });

  it('treats a pending two-digit year as valid, because it resolves at commit', () => {
    const spy = vi.fn();
    render(<Harness initial="2026-07-09T08:00" onValidityChange={spy} />);
    spy.mockClear();

    fireEvent.change(dateInput(), { target: { value: '05/02/26' } });

    expect(spy).not.toHaveBeenCalled();
  });

  it('corrects an invalid entry back to valid without a blur', () => {
    const spy = vi.fn();
    render(<Harness initial="2026-07-09T08:00" onValidityChange={spy} />);
    spy.mockClear();

    fireEvent.change(timeInput(), { target: { value: '25:00' } });
    expect(spy).toHaveBeenLastCalledWith(false);

    fireEvent.change(timeInput(), { target: { value: '09:15' } });
    expect(spy).toHaveBeenLastCalledWith(true);
  });

  it('does not fire again for a change that leaves the combined validity unchanged', () => {
    const spy = vi.fn();
    render(<Harness initial="2026-07-09T08:00" onValidityChange={spy} />);
    spy.mockClear();

    fireEvent.change(timeInput(), { target: { value: '25:00' } });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith(false);

    // Still invalid, still a different invalid time: the combined signal
    // does not flip back and forth on every keystroke, only on the crossing.
    fireEvent.change(timeInput(), { target: { value: '26:00' } });
    expect(spy).toHaveBeenCalledTimes(1);

    fireEvent.change(dateInput(), { target: { value: '31/02/2026' } });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('flags exactly-one-filled from a PENDING, uncommitted entry, not only a committed one', () => {
    const spy = vi.fn();
    render(<Harness onValidityChange={spy} />);
    spy.mockClear();

    // A two-digit year defers its commit to blur/Enter, so `onChange` has not
    // fired and the date half has not "committed" anything yet. The date
    // field nonetheless shows text with nothing in the time field, so this
    // must count as exactly-one-filled, the same as a committed date would.
    fireEvent.change(dateInput(), { target: { value: '05/02/26' } });

    expect(spy).toHaveBeenLastCalledWith(false);
  });

  it('flips back to valid once a cleared half holds a pending resolvable entry again', () => {
    const spy = vi.fn();
    render(<Harness initial="2026-07-09T08:00" onValidityChange={spy} />);
    spy.mockClear();

    fireEvent.change(dateInput(), { target: { value: '' } });
    expect(spy).toHaveBeenLastCalledWith(false);

    // Not empty any more, and it resolves: both halves are "filled" again,
    // even though this one has not committed. Judged from current text, not
    // only the last committed value, the same as the invalid case is.
    fireEvent.change(dateInput(), { target: { value: '05/02/26' } });
    expect(spy).toHaveBeenLastCalledWith(true);
  });

  it('fires exactly once on mount with the real initial state when the initial value is out of range', () => {
    const spy = vi.fn();
    render(<Harness initial="2026-07-01T08:00" min="2026-07-05" onValidityChange={spy} />);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(false);
  });

  it('reports the joined value on Enter, without waiting for a blur', () => {
    const spy = vi.fn();
    const onChangeSpy = vi.fn();
    render(<Harness initial="2026-07-09T08:00" onValidityChange={spy} onChangeSpy={onChangeSpy} />);
    spy.mockClear();

    // A pending two-digit year already counts as valid before it commits (the
    // time half is untouched and still filled), so the combined signal does
    // not flip here; what Enter changes is that `onChange` now fires.
    fireEvent.change(dateInput(), { target: { value: '05/02/26' } });
    expect(spy).not.toHaveBeenCalled();
    expect(onChangeSpy).not.toHaveBeenCalled();

    fireEvent.keyDown(dateInput(), { key: 'Enter' });
    expect(onChangeSpy).toHaveBeenLastCalledWith('2026-02-05T08:00');
    expect(spy).not.toHaveBeenCalled();
  });

  it('reports invalid on Enter without a blur, and does not report a value', () => {
    const spy = vi.fn();
    const onChangeSpy = vi.fn();
    render(<Harness initial="2026-07-09T08:00" onValidityChange={spy} onChangeSpy={onChangeSpy} />);
    spy.mockClear();
    onChangeSpy.mockClear();

    fireEvent.change(dateInput(), { target: { value: '31/02' } });
    fireEvent.keyDown(dateInput(), { key: 'Enter' });

    expect(spy).toHaveBeenLastCalledWith(false);
    expect(onChangeSpy).not.toHaveBeenCalled();
  });

  it('flags a date half that is out of the max bound', () => {
    const spy = vi.fn();
    render(<Harness initial="2026-07-09T08:00" max="2026-07-10" onValidityChange={spy} />);
    spy.mockClear();

    fireEvent.change(dateInput(), { target: { value: '15/07/2026' } });

    expect(spy).toHaveBeenLastCalledWith(false);
  });

  it('treats a deferred three-digit time as valid once it is complete, before any blur', () => {
    const spy = vi.fn();
    render(<Harness initial="2026-07-09T08:00" onValidityChange={spy} />);
    spy.mockClear();

    // "805" is a valid deferred reading of 08:05, but it is also the start of
    // a four-digit "8050"-shaped entry, so `onChange` waits for commit; the
    // combined validity, judged from the current text, does not.
    fireEvent.change(timeInput(), { target: { value: '805' } });

    expect(spy).not.toHaveBeenCalled();
  });
});

describe('DateTimePicker: placeholders', () => {
  it('defaults each half to its own default placeholder', () => {
    render(<Harness />);

    expect(dateInput()).toHaveAttribute('placeholder', 'DD/MM/YYYY');
    expect(timeInput()).toHaveAttribute('placeholder', 'HH:MM');
  });

  it('passes datePlaceholder and timePlaceholder through to each half independently', () => {
    render(<Harness datePlaceholder="Pick a date" timePlaceholder="Pick a time" />);

    expect(dateInput()).toHaveAttribute('placeholder', 'Pick a date');
    expect(timeInput()).toHaveAttribute('placeholder', 'Pick a time');
  });
});
