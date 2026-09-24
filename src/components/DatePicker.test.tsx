import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DatePicker } from './DatePicker';
import type { DatePickerProps } from './DatePicker';
import { localTodayIso } from './DatePicker.dates';
import { Modal } from './Modal';

type HarnessProps = Partial<Omit<DatePickerProps, 'value' | 'onChange'>> & {
  initial?: string | null;
  onChangeSpy?: (value: string | null) => void;
};

/** A consumer that stores what the picker reports, as a real form would. */
function Harness({ initial = null, onChangeSpy, ...rest }: HarnessProps) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <DatePicker
      testId="dp"
      label="Start day"
      {...rest}
      value={value}
      onChange={(next) => {
        onChangeSpy?.(next);
        setValue(next);
      }}
    />
  );
}

const input = () => screen.getByTestId('dp') as HTMLInputElement;

describe('DatePicker: the field', () => {
  it('shows the value as DD/MM/YYYY on the input that carries the test id', () => {
    render(<Harness initial="2026-07-06" />);

    expect(input().tagName).toBe('INPUT');
    expect(input()).toHaveValue('06/07/2026');
    expect(input()).toHaveAttribute('type', 'text');
    expect(input()).toHaveAttribute('inputmode', 'numeric');
    expect(screen.getByLabelText('Start day')).toBe(input());
  });

  it('renders an empty string or an unreadable value as an empty field', () => {
    const { rerender } = render(<DatePicker value="" onChange={vi.fn()} testId="dp" />);
    expect(input()).toHaveValue('');
    rerender(<DatePicker value="2026-02-30" onChange={vi.fn()} testId="dp" />);
    expect(input()).toHaveValue('');
  });

  it('reports a four-digit-year date on the keystroke that completes it, before any blur', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChangeSpy={spy} />);

    await user.type(input(), '6/7/2026');

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('2026-07-06');
    // Still focused: the user's text is left alone until they leave the field.
    expect(input()).toHaveValue('6/7/2026');

    await user.tab();
    expect(input()).toHaveValue('06/07/2026');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it.each(['06-07-2026', '06.07.2026', '6/7/2026'])(
    'accepts %s in one change event, the way Playwright fill() delivers it',
    (text) => {
      const spy = vi.fn();
      render(<Harness onChangeSpy={spy} />);

      fireEvent.change(input(), { target: { value: text } });

      expect(spy).toHaveBeenCalledWith('2026-07-06');
    },
  );

  it('holds a two-digit year until Enter, then reports 20xx and shows four digits', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChangeSpy={spy} />);

    await user.type(input(), '05/02/26');
    expect(spy).not.toHaveBeenCalled();
    expect(input()).toHaveAttribute('aria-invalid', 'false');

    await user.keyboard('{Enter}');
    expect(spy).toHaveBeenCalledWith('2026-02-05');
    expect(input()).toHaveValue('05/02/2026');
  });

  it('holds a two-digit year until blur', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChangeSpy={spy} />);

    await user.type(input(), '5/2/26');
    expect(spy).not.toHaveBeenCalled();

    await user.tab();
    expect(spy).toHaveBeenCalledWith('2026-02-05');
    expect(input()).toHaveValue('05/02/2026');
  });

  it('never commits the 2020 a user passes through on the way to typing 2026', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChangeSpy={spy} />);

    await user.type(input(), '05/02/2026');

    expect(spy.mock.calls).toEqual([['2026-02-05']]);
  });

  it('does not flag a two-digit year that is out of range or not yet a date while typing', async () => {
    const user = userEvent.setup();
    render(<Harness min="2026-01-01" />);

    await user.type(input(), '05/02/20');
    expect(input()).toHaveAttribute('aria-invalid', 'false');
    expect(screen.queryByTestId('dp-error')).not.toBeInTheDocument();
  });

  it('keeps an invalid entry as typed, marks it invalid and reports nothing', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChangeSpy={spy} initial="2026-02-01" />);

    await user.clear(input());
    spy.mockClear();
    await user.type(input(), '31/02/2026');

    expect(input()).toHaveValue('31/02/2026');
    expect(input()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByTestId('dp-error')).toHaveTextContent('Enter a date as DD/MM/YYYY');
    expect(input()).toHaveAttribute('aria-describedby', screen.getByTestId('dp-error').id);
    expect(spy).not.toHaveBeenCalled();

    await user.tab();
    expect(input()).toHaveValue('31/02/2026');
    expect(spy).not.toHaveBeenCalled();
  });

  it('clears the error as soon as the entry is corrected', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChangeSpy={spy} />);

    fireEvent.change(input(), { target: { value: '31/02/2026' } });
    expect(input()).toHaveAttribute('aria-invalid', 'true');

    await user.clear(input());
    await user.type(input(), '28/02/2026');

    expect(input()).toHaveAttribute('aria-invalid', 'false');
    expect(screen.queryByTestId('dp-error')).not.toBeInTheDocument();
    expect(spy).toHaveBeenLastCalledWith('2026-02-28');
  });

  it('honours leap years', () => {
    const spy = vi.fn();
    render(<Harness onChangeSpy={spy} />);

    fireEvent.change(input(), { target: { value: '29/02/2025' } });
    expect(input()).toHaveAttribute('aria-invalid', 'true');
    fireEvent.change(input(), { target: { value: '29/02/2024' } });
    expect(spy).toHaveBeenCalledWith('2024-02-29');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('rejects a half-typed entry on blur', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChangeSpy={spy} />);

    await user.type(input(), '6/7');
    expect(input()).toHaveAttribute('aria-invalid', 'false');
    await user.tab();

    expect(input()).toHaveValue('6/7');
    expect(input()).toHaveAttribute('aria-invalid', 'true');
    expect(spy).not.toHaveBeenCalled();
  });

  it('rejects dates outside min and max with their own messages, inclusive of the bounds', () => {
    const spy = vi.fn();
    render(<Harness onChangeSpy={spy} min="2026-07-01" max="2026-07-31" />);

    fireEvent.change(input(), { target: { value: '30/06/2026' } });
    expect(screen.getByTestId('dp-error')).toHaveTextContent('Date is before 01/07/2026');
    fireEvent.change(input(), { target: { value: '01/08/2026' } });
    expect(screen.getByTestId('dp-error')).toHaveTextContent('Date is after 31/07/2026');
    expect(spy).not.toHaveBeenCalled();

    fireEvent.change(input(), { target: { value: '01/07/2026' } });
    fireEvent.change(input(), { target: { value: '31/07/2026' } });
    expect(spy.mock.calls).toEqual([['2026-07-01'], ['2026-07-31']]);
  });

  it('reports null when the field is emptied', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChangeSpy={spy} initial="2026-07-06" />);

    await user.clear(input());

    expect(spy).toHaveBeenCalledWith(null);
  });

  it('uses translated messages with the bound substituted', () => {
    render(
      <Harness
        min="2026-07-01"
        labels={{ beforeMin: 'Datum ligt vóór {min}', invalidDate: 'Voer een datum in als DD/MM/JJJJ' }}
      />,
    );

    fireEvent.change(input(), { target: { value: '30/06/2026' } });
    expect(screen.getByTestId('dp-error')).toHaveTextContent('Datum ligt vóór 01/07/2026');
    fireEvent.change(input(), { target: { value: 'x' } });
    expect(screen.getByTestId('dp-error')).toHaveTextContent('Voer een datum in als DD/MM/JJJJ');
  });

  it('shows a consumer error in place of its own and links the hint otherwise', () => {
    const { rerender } = render(<DatePicker value={null} onChange={vi.fn()} testId="dp" hint="Plant time" />);
    expect(input()).toHaveAttribute('aria-describedby', screen.getByTestId('dp-hint').id);
    expect(input()).toHaveAttribute('aria-invalid', 'false');

    rerender(<DatePicker value={null} onChange={vi.fn()} testId="dp" hint="Plant time" error="End is before start" />);
    expect(screen.getByTestId('dp-error')).toHaveTextContent('End is before start');
    expect(input()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByTestId('dp-hint')).not.toBeInTheDocument();
  });

  it('marks required fields with the asterisk and aria-required', () => {
    render(<Harness required />);

    expect(input()).toHaveAttribute('aria-required', 'true');
    expect(screen.getByText('*')).toHaveClass('text-error');
  });

  it('disables the field and the toggle together', () => {
    render(<Harness disabled />);

    expect(input()).toBeDisabled();
    expect(screen.getByTestId('dp-toggle')).toBeDisabled();
  });

  it('renders no toggle when withCalendar is false, and ArrowDown opens nothing', async () => {
    const user = userEvent.setup();
    render(<Harness withCalendar={false} />);

    expect(screen.queryByTestId('dp-toggle')).not.toBeInTheDocument();
    await user.click(input());
    await user.keyboard('{ArrowDown}');
    expect(screen.queryByTestId('dp-calendar')).not.toBeInTheDocument();
  });
});

describe('DatePicker: controlled reconciliation', () => {
  it('follows a value changed from outside while the field is not focused', () => {
    const { rerender } = render(<DatePicker value="2026-07-06" onChange={vi.fn()} testId="dp" />);

    rerender(<DatePicker value="2026-12-25" onChange={vi.fn()} testId="dp" />);
    expect(input()).toHaveValue('25/12/2026');

    rerender(<DatePicker value={null} onChange={vi.fn()} testId="dp" />);
    expect(input()).toHaveValue('');
  });

  it('keeps the user\'s text while the field is focused, even if the value changes under it', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<DatePicker value="2026-07-06" onChange={vi.fn()} testId="dp" />);

    await user.clear(input());
    await user.type(input(), '1');
    rerender(<DatePicker value="2026-12-25" onChange={vi.fn()} testId="dp" />);

    expect(input()).toHaveValue('1');
  });

  it('replaces an invalid entry when the value is changed from outside after blur', () => {
    const { rerender } = render(<DatePicker value={null} onChange={vi.fn()} testId="dp" />);
    fireEvent.change(input(), { target: { value: '99/99/2026' } });
    fireEvent.blur(input());
    expect(input()).toHaveAttribute('aria-invalid', 'true');

    rerender(<DatePicker value="2026-07-06" onChange={vi.fn()} testId="dp" />);
    expect(input()).toHaveValue('06/07/2026');
    expect(input()).toHaveAttribute('aria-invalid', 'false');
  });
});

describe('DatePicker: calendar popover', () => {
  it('opens from the toggle on the value\'s month with focus on the selected day', async () => {
    const user = userEvent.setup();
    render(<Harness initial="2026-07-06" />);

    await user.click(screen.getByTestId('dp-toggle'));

    const calendar = screen.getByTestId('dp-calendar');
    expect(calendar).toHaveAttribute('role', 'dialog');
    expect(screen.getByTestId('dp-toggle')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('dp-toggle')).toHaveAttribute('aria-controls', calendar.id);
    expect(screen.getByTestId('dp-month-label')).toHaveTextContent('July 2026');
    expect(screen.getByTestId('dp-day-2026-07-06')).toHaveFocus();
    expect(screen.getByTestId('dp-day-2026-07-06').closest('td')).toHaveAttribute('aria-selected', 'true');
    // One tab stop in the grid.
    expect(screen.getByRole('grid').querySelectorAll('button[tabindex="0"]')).toHaveLength(1);
  });

  it('derives every popover test id from the input\'s', async () => {
    const user = userEvent.setup();
    render(<Harness initial="2026-07-06" />);

    await user.click(screen.getByTestId('dp-toggle'));

    for (const suffix of ['calendar', 'prev', 'next', 'month-label', 'grid', 'today', 'clear', 'day-2026-06-29', 'day-2026-08-09']) {
      expect(screen.getByTestId(`dp-${suffix}`)).toBeInTheDocument();
    }
  });

  it.each([
    ['{ArrowDown}'],
    ['{Alt>}{ArrowDown}{/Alt}'],
  ])('opens from the field with %s and moves focus into the grid', async (keys) => {
    const user = userEvent.setup();
    render(<Harness initial="2026-07-06" />);

    await user.click(input());
    await user.keyboard(keys);

    expect(screen.getByTestId('dp-calendar')).toBeInTheDocument();
    expect(screen.getByTestId('dp-day-2026-07-06')).toHaveFocus();
  });

  it('moves the grid focus with arrows, Home, End, PageUp/PageDown and Shift+Page', async () => {
    const user = userEvent.setup();
    render(<Harness initial="2026-07-08" />);
    await user.click(screen.getByTestId('dp-toggle'));
    const focused = () => (document.activeElement as HTMLElement).dataset.testid;

    await user.keyboard('{ArrowRight}');
    expect(focused()).toBe('dp-day-2026-07-09');
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(focused()).toBe('dp-day-2026-07-07');
    await user.keyboard('{ArrowDown}');
    expect(focused()).toBe('dp-day-2026-07-14');
    await user.keyboard('{ArrowUp}');
    expect(focused()).toBe('dp-day-2026-07-07');
    await user.keyboard('{Home}');
    expect(focused()).toBe('dp-day-2026-07-06');
    await user.keyboard('{End}');
    expect(focused()).toBe('dp-day-2026-07-12');
    await user.keyboard('{PageDown}');
    expect(focused()).toBe('dp-day-2026-08-12');
    expect(screen.getByTestId('dp-month-label')).toHaveTextContent('August 2026');
    await user.keyboard('{PageUp}{PageUp}');
    expect(focused()).toBe('dp-day-2026-06-12');
    await user.keyboard('{Shift>}{PageUp}{/Shift}');
    expect(focused()).toBe('dp-day-2025-06-12');
    await user.keyboard('{Shift>}{PageDown}{PageDown}{/Shift}');
    expect(focused()).toBe('dp-day-2027-06-12');
  });

  it('follows focus into the adjacent month', async () => {
    const user = userEvent.setup();
    render(<Harness initial="2026-07-31" />);
    await user.click(screen.getByTestId('dp-toggle'));

    await user.keyboard('{ArrowDown}');

    expect(screen.getByTestId('dp-month-label')).toHaveTextContent('August 2026');
    expect(screen.getByTestId('dp-day-2026-08-07')).toHaveFocus();
  });

  it.each(['{Enter}', ' '])('picks the focused day with %s and returns focus to the field', async (key) => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness initial="2026-07-06" onChangeSpy={spy} />);
    await user.click(screen.getByTestId('dp-toggle'));

    await user.keyboard('{ArrowRight}');
    await user.keyboard(key);

    expect(spy).toHaveBeenCalledWith('2026-07-07');
    expect(screen.queryByTestId('dp-calendar')).not.toBeInTheDocument();
    expect(input()).toHaveFocus();
    expect(input()).toHaveValue('07/07/2026');
  });

  it('picks a clicked day, including one borrowed from the next month', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness initial="2026-07-06" onChangeSpy={spy} />);
    await user.click(screen.getByTestId('dp-toggle'));

    await user.click(screen.getByTestId('dp-day-2026-08-02'));

    expect(spy).toHaveBeenCalledWith('2026-08-02');
    expect(input()).toHaveValue('02/08/2026');
  });

  it('navigates months with the header buttons', async () => {
    const user = userEvent.setup();
    render(<Harness initial="2026-01-15" />);
    await user.click(screen.getByTestId('dp-toggle'));

    await user.click(screen.getByTestId('dp-prev'));
    expect(screen.getByTestId('dp-month-label')).toHaveTextContent('December 2025');
    await user.click(screen.getByTestId('dp-next'));
    await user.click(screen.getByTestId('dp-next'));
    expect(screen.getByTestId('dp-month-label')).toHaveTextContent('February 2026');
    expect(screen.getByTestId('dp-prev')).toHaveAccessibleName('Previous month');
  });

  it('marks days outside min and max as disabled and will not pick them', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness initial="2026-07-10" min="2026-07-05" max="2026-07-20" onChangeSpy={spy} />);
    await user.click(screen.getByTestId('dp-toggle'));

    const outside = screen.getByTestId('dp-day-2026-07-04');
    expect(outside).toHaveAttribute('aria-disabled', 'true');
    await user.click(outside);
    expect(spy).not.toHaveBeenCalled();
    expect(screen.getByTestId('dp-calendar')).toBeInTheDocument();
    expect(screen.getByTestId('dp-day-2026-07-05')).not.toHaveAttribute('aria-disabled');
  });

  it('opens on the nearest bound when the field is empty and today is outside the range', async () => {
    const user = userEvent.setup();
    render(<Harness min="2099-03-10" />);

    await user.click(screen.getByTestId('dp-toggle'));

    expect(screen.getByTestId('dp-day-2099-03-10')).toHaveFocus();
  });

  it('picks today, marked as the current date, from the Today button', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChangeSpy={spy} />);
    await user.click(screen.getByTestId('dp-toggle'));

    const today = localTodayIso();
    expect(screen.getByTestId(`dp-day-${today}`)).toHaveAttribute('aria-current', 'date');
    await user.click(screen.getByTestId('dp-today'));

    expect(spy).toHaveBeenCalledWith(today);
  });

  it('empties the field from the Clear button', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness initial="2026-07-06" onChangeSpy={spy} />);
    await user.click(screen.getByTestId('dp-toggle'));

    await user.click(screen.getByTestId('dp-clear'));

    expect(spy).toHaveBeenCalledWith(null);
    expect(input()).toHaveValue('');
    expect(input()).toHaveFocus();
  });

  it('closes on Escape and returns focus to the field', async () => {
    const user = userEvent.setup();
    render(<Harness initial="2026-07-06" />);
    await user.click(screen.getByTestId('dp-toggle'));

    await user.keyboard('{Escape}');

    expect(screen.queryByTestId('dp-calendar')).not.toBeInTheDocument();
    expect(input()).toHaveFocus();
  });

  it('closes only itself on Escape inside a Modal; the next Escape closes the Modal', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open onClose={onClose} title="Exception">
        <Harness initial="2026-07-06" />
      </Modal>,
    );
    await user.click(screen.getByTestId('dp-toggle'));

    await user.keyboard('{Escape}');
    expect(screen.queryByTestId('dp-calendar')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when focus tabs out of the popover', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Harness initial="2026-07-06" />
        <button type="button">After</button>
      </>,
    );
    await user.click(screen.getByTestId('dp-toggle'));

    await user.tab(); // Today
    await user.tab(); // Clear
    expect(screen.getByTestId('dp-clear')).toHaveFocus();
    await user.tab();

    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
    expect(screen.queryByTestId('dp-calendar')).not.toBeInTheDocument();
  });

  it('closes on a click outside', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Harness initial="2026-07-06" />
        <p>Elsewhere</p>
      </>,
    );
    await user.click(screen.getByTestId('dp-toggle'));

    await user.click(screen.getByText('Elsewhere'));

    expect(screen.queryByTestId('dp-calendar')).not.toBeInTheDocument();
  });

  it('closes when the picker becomes disabled while open', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<DatePicker value="2026-07-06" onChange={vi.fn()} testId="dp" />);
    await user.click(screen.getByTestId('dp-toggle'));

    rerender(<DatePicker value="2026-07-06" onChange={vi.fn()} testId="dp" disabled />);

    expect(screen.queryByTestId('dp-calendar')).not.toBeInTheDocument();
  });
});

describe('DatePicker: app language, not the OS', () => {
  it('names the month and weekdays in English for en, day first in the day labels', async () => {
    const user = userEvent.setup();
    render(<Harness initial="2026-07-06" locale="en" />);
    await user.click(screen.getByTestId('dp-toggle'));

    expect(screen.getByTestId('dp-month-label')).toHaveTextContent('July 2026');
    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent);
    expect(headers).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(screen.getByTestId('dp-day-2026-07-06')).toHaveAccessibleName(/^Monday,? 6 July 2026$/);
  });

  it('names the month and weekdays in Dutch for nl, and still types DD/MM/YYYY', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness initial="2026-07-06" locale="nl" onChangeSpy={spy} />);

    expect(input()).toHaveValue('06/07/2026');
    await user.click(screen.getByTestId('dp-toggle'));
    expect(screen.getByTestId('dp-month-label')).toHaveTextContent('juli 2026');
    const headers = screen.getAllByRole('columnheader');
    expect(headers[0]).toHaveAttribute('abbr', 'maandag');
    expect(headers[6]).toHaveAttribute('abbr', 'zondag');
    expect(screen.getByTestId('dp-day-2026-07-06')).toHaveAccessibleName('maandag 6 juli 2026');

    await user.keyboard('{Escape}');
    await user.clear(input());
    await user.type(input(), '12/01/2026');
    expect(spy).toHaveBeenLastCalledWith('2026-01-12');
  });
});

describe('DatePicker: no Date built from the value, no browser time zone', () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTz;
    vi.unstubAllGlobals();
  });

  it('never constructs a Date from a string nor calls Date.parse', async () => {
    const RealDate = Date;
    const stringConstructions: unknown[] = [];
    class GuardedDate extends RealDate {
      constructor(...args: unknown[]) {
        if (typeof args[0] === 'string') stringConstructions.push(args[0]);
        // @ts-expect-error: forwarding the variadic Date constructor arguments.
        super(...args);
      }
      static parse(text: string): number {
        stringConstructions.push(text);
        return RealDate.parse(text);
      }
    }
    vi.stubGlobal('Date', GuardedDate);

    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness initial="2026-07-06" onChangeSpy={spy} />);
    await user.clear(input());
    await user.type(input(), '09/07/2026');
    await user.click(screen.getByTestId('dp-toggle'));
    await user.keyboard('{ArrowRight}{Enter}');

    expect(spy).toHaveBeenLastCalledWith('2026-07-10');
    expect(stringConstructions).toEqual([]);
  });

  it.each(['Pacific/Kiritimati', 'America/Adak', 'Europe/Brussels', 'UTC'])(
    'reports and draws the same day in %s',
    async (zone) => {
      process.env.TZ = zone;
      const spy = vi.fn();
      const user = userEvent.setup();
      render(<Harness onChangeSpy={spy} />);

      await act(async () => {
        fireEvent.change(input(), { target: { value: '06/07/2026' } });
      });
      expect(spy).toHaveBeenCalledWith('2026-07-06');

      await user.click(screen.getByTestId('dp-toggle'));
      expect(screen.getByTestId('dp-day-2026-07-06')).toHaveAccessibleName(/^Monday,? 6 July 2026$/);
      expect(screen.getByTestId('dp-day-2026-06-29').closest('tr')?.querySelectorAll('button')[0]).toHaveTextContent('29');
    },
  );
});
