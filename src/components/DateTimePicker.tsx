import type { FocusEvent as ReactFocusEvent } from 'react';
import { useEffect, useId, useRef, useState } from 'react';

import { DatePicker } from './DatePicker';
import type { DatePickerLabels } from './DatePicker';
import { isValidIsoDate } from './DatePicker.dates';
import { ERROR_CLASSES, HINT_CLASSES, LABEL_CLASSES, REQUIRED_MARK_CLASSES } from './fieldChrome';
import type { FieldSize } from './fieldChrome';
import { TimeField } from './TimeField';
import type { TimeFieldLabels } from './TimeField';
import { isValidTimeValue } from './TimeField.time';

export interface DateTimePickerLabels extends DatePickerLabels, TimeFieldLabels {
  /** `aria-label` of the date half. Default `'Date'`. */
  date?: string;
  /** `aria-label` of the time half. Default `'Time'`. */
  time?: string;
  /** Shown when only one half is filled. Default `'Enter both a date and a time'`. */
  incomplete?: string;
}

const DEFAULT_LABELS = {
  date: 'Date',
  time: 'Time',
  incomplete: 'Enter both a date and a time',
};

export interface DateTimePickerProps {
  /**
   * Local wall-clock date-time `YYYY-MM-DDTHH:MM` (the shape a native
   * `datetime-local` input produced), or `null` when empty. Never an instant:
   * which zone it is in is the consumer's decision, not this control's.
   */
  value: string | null;
  /** Fires only with a complete, valid `YYYY-MM-DDTHH:MM`, or `null` when both halves are cleared. */
  onChange: (value: string | null) => void;
  /** Inclusive ISO date bounds (`YYYY-MM-DD`) for the date half. */
  min?: string;
  max?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  /** Consumer-supplied error, shown under both halves. */
  error?: string;
  hint?: string;
  /** Month and weekday names in the calendar, as on `DatePicker`. */
  locale?: string;
  labels?: DateTimePickerLabels;
  /**
   * `data-testid` of the wrapping group. The two inputs are `${testId}-date`
   * and `${testId}-time`; the calendar parts derive from the date input's id
   * (`${testId}-date-toggle`, `${testId}-date-day-YYYY-MM-DD`, …); the group
   * message is `${testId}-error`. Default `'date-time-picker'`.
   */
  testId?: string;
  /** `id` of the date input, for an external `<label htmlFor>`. */
  id?: string;
  /** `'md'` 36px (default), `'lg'` 40px. */
  size?: FieldSize;
}

const DATE_TIME_VALUE = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/;

/** `[date, time]` of a valid value, else `[null, null]`. */
function splitValue(value: string | null): [string | null, string | null] {
  const match = value === null ? null : DATE_TIME_VALUE.exec(value);
  if (!match || !isValidIsoDate(match[1]) || !isValidTimeValue(match[2])) return [null, null];
  return [match[1], match[2]];
}

const joinParts = (date: string | null, time: string | null): string | null =>
  date !== null && time !== null ? `${date}T${time}` : null;

/**
 * A `DatePicker` and a 24-hour `TimeField` side by side, replacing
 * `<input type="datetime-local">`, which renders in the OS locale (and with
 * AM/PM on a US machine) whatever the app's language.
 *
 * The value is the same `YYYY-MM-DDTHH:MM` string the native input produced,
 * so a consumer's wire conversion stays byte-identical. It is reported only
 * when both halves are filled and valid; a half-filled or invalid state is
 * "not yet a value", reports nothing, and shows `labels.incomplete` once focus
 * has left the group. Clearing both halves reports `null`.
 *
 * Two fields rather than one `DD/MM/YYYY HH:MM` string, so each half keeps
 * its own parser, its own error and the date half its calendar.
 */
export function DateTimePicker({
  value,
  onChange,
  min,
  max,
  label,
  required = false,
  disabled = false,
  error,
  hint,
  locale,
  labels,
  testId = 'date-time-picker',
  id,
  size = 'md',
}: DateTimePickerProps) {
  const resolvedLabels = { ...DEFAULT_LABELS, ...labels };
  const generatedId = useId();
  const dateId = id ?? `date-time-picker-${generatedId}`;
  const labelId = `${dateId}-label`;
  const messageId = `${dateId}-message`;

  const [initialDate, initialTime] = splitValue(value);
  const [datePart, setDatePart] = useState<string | null>(initialDate);
  const [timePart, setTimePart] = useState<string | null>(initialTime);
  const validity = useRef({ date: true, time: true });
  const [left, setLeft] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);

  // The last value this group received or reported. An incoming `value` that
  // differs from it came from outside and resets both halves; the value the
  // group just reported comes back equal to it and changes nothing. Comparing
  // against the joined parts instead would miss a reset to `null` while one
  // half is cleared, since a half-filled pair also joins to `null`.
  const lastValue = useRef(value);
  useEffect(() => {
    if (value === lastValue.current) return;
    lastValue.current = value;
    const [nextDate, nextTime] = splitValue(value);
    setDatePart(nextDate);
    setTimePart(nextTime);
  }, [value]);

  const emit = (next: string | null) => {
    lastValue.current = next;
    onChange(next);
  };

  const report = (date: string | null, time: string | null) => {
    if (!validity.current.date || !validity.current.time) return;
    if (date === null && time === null) {
      if (value !== null) emit(null);
      return;
    }
    const joined = joinParts(date, time);
    if (joined !== null && joined !== value) emit(joined);
  };

  const handleDateChange = (next: string | null) => {
    validity.current.date = true;
    setDatePart(next);
    report(next, timePart);
  };

  const handleTimeChange = (next: string | null) => {
    validity.current.time = true;
    setTimePart(next);
    report(datePart, next);
  };

  const handleGroupBlur = (event: ReactFocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (next && groupRef.current?.contains(next)) return;
    setLeft(true);
  };

  const halfFilled = (datePart === null) !== (timePart === null);
  const groupMessage = error ?? (left && halfFilled ? resolvedLabels.incomplete : undefined);

  return (
    <div
      ref={groupRef}
      role="group"
      aria-labelledby={label ? labelId : undefined}
      aria-describedby={groupMessage ? messageId : hint ? messageId : undefined}
      data-testid={testId}
      onBlur={handleGroupBlur}
      onFocus={() => setLeft(false)}
      className="flex flex-col gap-1"
    >
      {label && (
        <label id={labelId} htmlFor={dateId} className={LABEL_CLASSES}>
          {label}
          {required && <span className={REQUIRED_MARK_CLASSES}>*</span>}
        </label>
      )}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <DatePicker
            id={dateId}
            value={datePart}
            onChange={handleDateChange}
            onValidityChange={(valid) => {
              validity.current.date = valid;
            }}
            min={min}
            max={max}
            required={required}
            disabled={disabled}
            locale={locale}
            labels={labels}
            ariaLabel={resolvedLabels.date}
            testId={`${testId}-date`}
            size={size}
          />
        </div>
        <div className="w-24 shrink-0">
          <TimeField
            value={timePart}
            onChange={handleTimeChange}
            onValidityChange={(valid) => {
              validity.current.time = valid;
            }}
            required={required}
            disabled={disabled}
            labels={labels}
            ariaLabel={resolvedLabels.time}
            testId={`${testId}-time`}
            size={size}
          />
        </div>
      </div>
      {groupMessage ? (
        <span id={messageId} data-testid={`${testId}-error`} className={ERROR_CLASSES}>
          {groupMessage}
        </span>
      ) : hint ? (
        <span id={messageId} data-testid={`${testId}-hint`} className={HINT_CLASSES}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}
