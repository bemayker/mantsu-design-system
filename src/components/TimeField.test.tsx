import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { TimeField } from './TimeField';
import type { TimeFieldProps } from './TimeField';
import { isValidTimeValue, parseTimeText } from './TimeField.time';

describe('parseTimeText', () => {
  it.each([
    ['08:05', '08:05'],
    ['8:05', '08:05'],
    ['08.05', '08:05'],
    ['0805', '08:05'],
    ['00:00', '00:00'],
    ['23:59', '23:59'],
    [' 7:30 ', '07:30'],
  ])('reads %s as %s immediately', (text, value) => {
    expect(parseTimeText(text)).toEqual({ status: 'valid', value, deferred: false });
  });

  it('reads a three-digit entry as H:MM but defers it, since 123 is also the start of 1234', () => {
    expect(parseTimeText('805')).toEqual({ status: 'valid', value: '08:05', deferred: true });
    expect(parseTimeText('960')).toEqual({ status: 'invalid', deferred: true });
  });

  it.each(['24:00', '12:60', '2400', '99:99'])('rejects %s', (text) => {
    expect(parseTimeText(text)).toEqual({ status: 'invalid', deferred: false });
  });

  it.each(['ab', '12:345', '1:2:3', '12345'])('rejects the shape of %s', (text) => {
    expect(parseTimeText(text).status).toBe('invalid');
  });

  it.each(['8', '08', '08:', '08:0', '8.'])('treats %s as still being typed', (text) => {
    expect(parseTimeText(text).status).toBe('incomplete');
  });

  it('knows canonical values', () => {
    expect(isValidTimeValue('00:00')).toBe(true);
    expect(isValidTimeValue('24:00')).toBe(false);
    expect(isValidTimeValue('8:05')).toBe(false);
    expect(isValidTimeValue(null)).toBe(false);
  });
});

type HarnessProps = Partial<Omit<TimeFieldProps, 'value' | 'onChange'>> & {
  initial?: string | null;
  onChangeSpy?: (value: string | null) => void;
};

function Harness({ initial = null, onChangeSpy, ...rest }: HarnessProps) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <TimeField
      testId="tf"
      label="Start time"
      {...rest}
      value={value}
      onChange={(next) => {
        onChangeSpy?.(next);
        setValue(next);
      }}
    />
  );
}

const input = () => screen.getByTestId('tf') as HTMLInputElement;

describe('TimeField', () => {
  it('renders the value on the input that carries the test id, labelled', () => {
    render(<Harness initial="14:30" />);

    expect(input()).toHaveValue('14:30');
    expect(input()).toHaveAttribute('type', 'text');
    expect(input()).toHaveAttribute('inputmode', 'numeric');
    expect(screen.getByLabelText('Start time')).toBe(input());
  });

  it('renders midnight as 00:00, never 24:00', () => {
    render(<Harness initial="00:00" />);

    expect(input()).toHaveValue('00:00');
  });

  it('renders an unreadable value as empty', () => {
    render(<TimeField value="24:00" onChange={vi.fn()} testId="tf" />);

    expect(input()).toHaveValue('');
  });

  it('reports a complete time on the keystroke that completes it, and canonicalises on blur', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChangeSpy={spy} />);

    await user.type(input(), '8:05');
    expect(spy.mock.calls).toEqual([['08:05']]);
    expect(input()).toHaveValue('8:05');

    await user.tab();
    expect(input()).toHaveValue('08:05');
  });

  it('reports four digits immediately, the way Playwright fill() delivers them', () => {
    const spy = vi.fn();
    render(<Harness onChangeSpy={spy} />);

    fireEvent.change(input(), { target: { value: '2215' } });

    expect(spy).toHaveBeenCalledWith('22:15');
  });

  it('holds a three-digit entry until Enter', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChangeSpy={spy} />);

    await user.type(input(), '805');
    expect(spy).not.toHaveBeenCalled();
    await user.keyboard('{Enter}');

    expect(spy).toHaveBeenCalledWith('08:05');
    expect(input()).toHaveValue('08:05');
  });

  it('keeps an invalid time as typed, marks it invalid and reports nothing', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChangeSpy={spy} />);

    await user.type(input(), '24:00');

    expect(input()).toHaveValue('24:00');
    expect(input()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByTestId('tf-error')).toHaveTextContent('Enter a time as HH:MM');
    expect(spy).not.toHaveBeenCalled();

    await user.tab();
    expect(input()).toHaveValue('24:00');
    expect(spy).not.toHaveBeenCalled();
  });

  it('rejects a half-typed time on blur, with a translated message', async () => {
    const user = userEvent.setup();
    render(<Harness labels={{ invalidTime: 'Voer een tijd in als UU:MM' }} />);

    await user.type(input(), '8');
    expect(input()).toHaveAttribute('aria-invalid', 'false');
    await user.tab();

    expect(screen.getByTestId('tf-error')).toHaveTextContent('Voer een tijd in als UU:MM');
  });

  it('reports null when emptied', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness initial="08:00" onChangeSpy={spy} />);

    await user.clear(input());

    expect(spy).toHaveBeenCalledWith(null);
  });

  it('follows an outside value only while not focused', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<TimeField value="08:00" onChange={vi.fn()} testId="tf" />);

    rerender(<TimeField value="09:30" onChange={vi.fn()} testId="tf" />);
    expect(input()).toHaveValue('09:30');

    await user.clear(input());
    await user.type(input(), '1');
    rerender(<TimeField value="10:45" onChange={vi.fn()} testId="tf" />);
    expect(input()).toHaveValue('1');
  });

  it('shows a consumer error and disables cleanly', () => {
    const { rerender } = render(<TimeField value={null} onChange={vi.fn()} testId="tf" error="Too late" />);
    expect(screen.getByTestId('tf-error')).toHaveTextContent('Too late');
    expect(input()).toHaveAttribute('aria-invalid', 'true');

    rerender(<TimeField value={null} onChange={vi.fn()} testId="tf" disabled />);
    expect(input()).toBeDisabled();
  });
});
