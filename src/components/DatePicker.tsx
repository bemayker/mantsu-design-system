import type {
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from 'react';
import { useEffect, useId, useRef, useState } from 'react';

import { cn } from './cn';
import {
  addDays,
  addMonths,
  endOfWeek,
  formatFullDate,
  formatIsoToDisplay,
  formatMonthYear,
  isValidIsoDate,
  isWithinBounds,
  localTodayIso,
  monthGrid,
  parseDisplayDate,
  parseIsoDate,
  startOfWeek,
  weekdayNames,
} from './DatePicker.dates';
import type { DateParseResult } from './DatePicker.dates';
import {
  ERROR_CLASSES,
  HINT_CLASSES,
  LABEL_CLASSES,
  REQUIRED_MARK_CLASSES,
  fieldClasses,
} from './fieldChrome';
import type { FieldSize } from './fieldChrome';
import { useEscapeKey } from './useEscapeKey';
import { useTypedValue } from './useTypedValue';
import type { TypedOutcome, TypedPhase } from './useTypedValue';

/* ------------------------------------------------------------------ icons */

// Drawn here rather than imported, for the reason `Dropdown` records: these
// are the control's own affordances, not consumer pictograms, and the package
// has no runtime dependencies. Same 24 viewBox and `currentColor` stroke.
const CalendarIcon = ({ className }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" />
  </svg>
);

const ChevronLeftIcon = ({ className }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="m15 18-6-6 6-6" />
  </svg>
);

const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d="m9 18 6-6-6-6" />
  </svg>
);

/* ---------------------------------------------------------------- contract */

/**
 * The component's own strings, each defaulting to its English literal (the
 * `TreeLabels` precedent, DS-3). An i18n app passes `t(...)` results; the
 * package itself translates nothing.
 */
export interface DatePickerLabels {
  /** Calendar toggle `aria-label`. Default `'Open calendar'`. */
  openCalendar?: string;
  /** Accessible name of the calendar popover. Default `'Choose a date'`. */
  calendar?: string;
  /** Default `'Previous month'`. */
  previousMonth?: string;
  /** Default `'Next month'`. */
  nextMonth?: string;
  /** Popover button that picks today. Default `'Today'`. */
  today?: string;
  /** Popover button that empties the field. Default `'Clear'`. */
  clear?: string;
  /** Shown for an entry that is not a date. Default `'Enter a date as DD/MM/YYYY'`. */
  invalidDate?: string;
  /** `{min}` is replaced by the bound as `DD/MM/YYYY`. Default `'Date is before {min}'`. */
  beforeMin?: string;
  /** `{max}` is replaced by the bound as `DD/MM/YYYY`. Default `'Date is after {max}'`. */
  afterMax?: string;
}

const DEFAULT_LABELS: Required<DatePickerLabels> = {
  openCalendar: 'Open calendar',
  calendar: 'Choose a date',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  today: 'Today',
  clear: 'Clear',
  invalidDate: 'Enter a date as DD/MM/YYYY',
  beforeMin: 'Date is before {min}',
  afterMax: 'Date is after {max}',
};

export interface DatePickerProps {
  /** ISO calendar date `YYYY-MM-DD`, or `null` when empty. Never a `Date`, never an instant. */
  value: string | null;
  /** Fires only with a valid ISO date, or `null` when cleared. Never for an unparseable entry. */
  onChange: (value: string | null) => void;
  /** Inclusive ISO bounds. A typed date outside them is rejected with its own message. */
  min?: string;
  max?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  /** Consumer-supplied error; when set it replaces the internal parse error. */
  error?: string;
  hint?: string;
  /** Default `'DD/MM/YYYY'`. */
  placeholder?: string;
  /**
   * BCP 47 tag or bare app language (`'en'`, `'nl'`). Used ONLY for month and
   * weekday names in the popover. The typed format is always `DD/MM/YYYY`,
   * whatever the language (CORE-FB-23).
   */
  locale?: string;
  labels?: DatePickerLabels;
  /**
   * `data-testid` of the **text input** (not a wrapper), so a spec types into
   * the element it names. Derived: `-toggle`, `-calendar`, `-prev`, `-next`,
   * `-month-label`, `-grid`, `-day-YYYY-MM-DD`, `-today`, `-clear`, `-error`,
   * `-hint`. Default `'date-picker'`.
   */
  testId?: string;
  /** `id` of the text input, for an external `<label htmlFor>`. */
  id?: string;
  /** Accessible name when no visible `label` is rendered. */
  ariaLabel?: string;
  /** Renders the calendar toggle. Default `true`; `false` gives the pure typed field. */
  withCalendar?: boolean;
  /** `'md'` is 36px (`Dropdown` parity, default), `'lg'` 40px. */
  size?: FieldSize;
  /**
   * Told whenever the typed text flips between "empty or a valid date" and
   * not (half-typed or invalid). `DateTimePicker` uses it to hold back a value
   * while its date half is unresolved; most consumers need it never.
   */
  onValidityChange?: (valid: boolean) => void;
}

const DAY_CELL_COUNT_PER_WEEK = 7;

/**
 * A date field typed as `DD/MM/YYYY` in every language, with an optional
 * Monday-first calendar popover.
 *
 * **Why it exists (CORE-FB-23).** A native `<input type="date">` renders in
 * the operating system's locale and cannot be told the app's language, so the
 * same date showed as `06/07/2026` in a table and `07/06/2026` in the drawer
 * next to it. This control shows one notation everywhere.
 *
 * **Values.** In and out as ISO `YYYY-MM-DD` strings. The value is never
 * passed through a `Date`, so no browser time zone can move it by a day.
 *
 * **Typing.** Separators `/`, `-`, `.`; single-digit day and month allowed.
 * Digits with no separator at all are also read, `DDMMYYYY` or `DDMMYY`
 * (CORE-FB-23: the iPad numeric keypad this field's `inputMode="numeric"`
 * opens has no `/`, `-`, `.` or `:` key for an operator on a shop-floor
 * tablet to press).
 * - A four-digit year, separated or not (`06/07/2026` or `06072026`), reports
 *   the value on the keystroke that completes it (so Playwright's
 *   `fill('06/07/2026')` works without a blur).
 * - A two-digit year, separated or not (`05/02/26` or `050226`), means 20xx
 *   and is reported on blur or Enter only, then rewritten as four digits:
 *   `05/02/20` and `050226` are also the start of a four-digit-year entry.
 * - Blur rewrites a valid entry in canonical `DD/MM/YYYY`; an emptied field
 *   reports `null`.
 * - An invalid or out-of-range entry keeps its text, sets `aria-invalid`,
 *   shows the message, and does NOT call `onChange`.
 * - A `value` changed from outside resets the text only while the field is
 *   not focused.
 *
 * **Keyboard.** In the field, `ArrowDown` or `Alt+ArrowDown` opens the
 * calendar and `Enter` commits. In the grid (one tab stop, roving focus):
 * arrows move a day or a week, `Home`/`End` go to the week's Monday/Sunday,
 * `PageUp`/`PageDown` a month, `Shift+PageUp`/`Shift+PageDown` a year, and
 * `Enter`/`Space` pick the day and return focus to the field. `Escape` closes
 * only the popover, through the shared `useEscapeKey` stack, so a hosting
 * `Modal` stays open. Tabbing out or clicking outside also closes it.
 *
 * **Today** is the browser's local calendar date: it is what the operator
 * sees on the wall. A consumer whose today is the plant's bounds the value.
 */
export function DatePicker({
  value,
  onChange,
  min,
  max,
  label,
  required = false,
  disabled = false,
  error,
  hint,
  placeholder = 'DD/MM/YYYY',
  locale,
  labels,
  testId = 'date-picker',
  id,
  ariaLabel,
  withCalendar = true,
  size = 'md',
  onValidityChange,
}: DatePickerProps) {
  const resolvedLabels: Required<DatePickerLabels> = { ...DEFAULT_LABELS, ...labels };
  const generatedId = useId();
  const inputId = id ?? `date-picker-${generatedId}`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const calendarId = `${inputId}-calendar`;

  // An empty string, or anything that is not a real calendar date, is "no value".
  const current = isValidIsoDate(value) ? value : null;

  const messageFor = (result: DateParseResult): string => {
    if (result.status === 'beforeMin') return resolvedLabels.beforeMin.replace('{min}', formatIsoToDisplay(min));
    if (result.status === 'afterMax') return resolvedLabels.afterMax.replace('{max}', formatIsoToDisplay(max));
    return resolvedLabels.invalidDate;
  };

  const evaluate = (text: string, phase: TypedPhase): TypedOutcome => {
    const result = parseDisplayDate(text, { min, max });
    switch (result.status) {
      case 'empty':
        return { kind: 'empty' };
      case 'valid':
        return phase === 'commit' || result.yearDigits === 4
          ? { kind: 'commit', value: result.iso, canonical: formatIsoToDisplay(result.iso) }
          : { kind: 'wait' };
      case 'incomplete':
        return phase === 'commit' ? { kind: 'error', message: resolvedLabels.invalidDate } : { kind: 'wait' };
      default:
        // A two-digit year may still be the start of a four-digit one, so it
        // is judged only when the user commits.
        return phase === 'typing' && result.yearDigits === 2
          ? { kind: 'wait' }
          : { kind: 'error', message: messageFor(result) };
    }
  };

  const typed = useTypedValue({
    value: current,
    format: formatIsoToDisplay,
    evaluate,
    onChange,
    onValidityChange,
  });

  const [open, setOpen] = useState(false);
  const [focusedIso, setFocusedIso] = useState<string>(() => current ?? localTodayIso());
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLTableElement>(null);
  // Set when the next render must move DOM focus to the focused day.
  const focusDayOnRender = useRef(false);

  const shownError = error ?? typed.error ?? undefined;
  const invalid = shownError !== undefined;
  const calendarAvailable = withCalendar && !disabled;

  const closeCalendar = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) inputRef.current?.focus();
  };

  const openCalendar = () => {
    if (!calendarAvailable) return;
    const typedResult = parseDisplayDate(typed.text);
    const typedIso = typedResult.status === 'valid' ? typedResult.iso : null;
    let start = current ?? typedIso ?? localTodayIso();
    if (isValidIsoDate(min) && start < min) start = min;
    if (isValidIsoDate(max) && start > max) start = max;
    setFocusedIso(start);
    setOpen(true);
    focusDayOnRender.current = true;
  };

  useEscapeKey(open && calendarAvailable, () => closeCalendar(true));

  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  // A picker disabled while open must not leave the popover under a dead field.
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (!open || !focusDayOnRender.current) return;
    focusDayOnRender.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-iso="${focusedIso}"]`)?.focus();
  }, [open, focusedIso]);

  const moveFocus = (iso: string) => {
    setFocusedIso(iso);
    focusDayOnRender.current = true;
  };

  // A header click must not strand keyboard focus: when a day held it, that
  // day unmounts with the old month, so focus follows to the new one.
  const shiftMonth = (months: number) => {
    const next = addMonths(focusedIso, months);
    if (gridRef.current?.contains(document.activeElement)) focusDayOnRender.current = true;
    setFocusedIso(next);
  };

  const selectDay = (iso: string) => {
    if (!isWithinBounds(iso, min, max)) return;
    typed.replace(iso);
    closeCalendar(true);
  };

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      // Not prevented: Enter in a form still submits, after the commit.
      typed.commit();
      return;
    }
    if (event.key === 'ArrowDown' && calendarAvailable) {
      event.preventDefault();
      openCalendar();
    }
  };

  const handleDayKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    const step: Record<string, () => string> = {
      ArrowLeft: () => addDays(focusedIso, -1),
      ArrowRight: () => addDays(focusedIso, 1),
      ArrowUp: () => addDays(focusedIso, -7),
      ArrowDown: () => addDays(focusedIso, 7),
      Home: () => startOfWeek(focusedIso),
      End: () => endOfWeek(focusedIso),
      PageUp: () => addMonths(focusedIso, event.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focusedIso, event.shiftKey ? 12 : 1),
    };
    if (event.key in step) {
      event.preventDefault();
      moveFocus(step[event.key]());
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectDay(focusedIso);
    }
  };

  // Tabbing out of the popover closes it; moving within the control does not.
  const handleContainerBlur = (event: ReactFocusEvent<HTMLDivElement>) => {
    if (!open) return;
    const next = event.relatedTarget as Node | null;
    if (next && containerRef.current?.contains(next)) return;
    if (next === null) return; // a click: the mousedown handler decides
    setOpen(false);
  };

  // Keeps focus where it is when the popover or toggle is pressed. Without it,
  // Safari (which does not focus a clicked button) blurs the field with no
  // related target and the popover would close under the pointer.
  const keepFocus = (event: ReactMouseEvent) => event.preventDefault();

  const view = parseIsoDate(focusedIso) ?? { year: 1970, month: 1, day: 1 };
  const cells = monthGrid(view.year, view.month);
  const weeks = Array.from({ length: cells.length / DAY_CELL_COUNT_PER_WEEK }, (_, week) =>
    cells.slice(week * DAY_CELL_COUNT_PER_WEEK, (week + 1) * DAY_CELL_COUNT_PER_WEEK),
  );
  const today = localTodayIso();
  const todaySelectable = isWithinBounds(today, min, max);
  const describedBy = invalid ? errorId : hint ? hintId : undefined;

  return (
    <div className="flex flex-col gap-1" ref={containerRef} onBlur={handleContainerBlur}>
      {label && (
        <label htmlFor={inputId} className={LABEL_CLASSES}>
          {label}
          {required && <span className={REQUIRED_MARK_CLASSES}>*</span>}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          data-testid={testId}
          value={typed.text}
          placeholder={placeholder}
          disabled={disabled}
          aria-required={required}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          aria-label={ariaLabel}
          onChange={typed.handleChange}
          onFocus={typed.handleFocus}
          onBlur={typed.handleBlur}
          onKeyDown={handleInputKeyDown}
          className={fieldClasses({ size, invalid, disabled, withTrailingButton: withCalendar })}
        />
        {withCalendar && (
          <button
            type="button"
            data-testid={`${testId}-toggle`}
            aria-label={resolvedLabels.openCalendar}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={open ? calendarId : undefined}
            disabled={disabled}
            onMouseDown={keepFocus}
            onClick={() => (open ? closeCalendar(true) : openCalendar())}
            className={cn(
              'absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-md text-slate-400',
              'hover:text-primary-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue',
              disabled && 'cursor-not-allowed hover:text-slate-400',
            )}
          >
            <CalendarIcon className="h-4 w-4" />
          </button>
        )}
        {open && calendarAvailable && (
          <div
            id={calendarId}
            role="dialog"
            aria-modal="false"
            aria-label={resolvedLabels.calendar}
            data-testid={`${testId}-calendar`}
            onMouseDown={keepFocus}
            className="absolute left-0 z-10 mt-1 w-72 rounded-md border border-slate-200 bg-white p-3 shadow-mantsu-md"
          >
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                data-testid={`${testId}-prev`}
                aria-label={resolvedLabels.previousMonth}
                onClick={() => shiftMonth(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-sm text-slate-500 hover:bg-frost focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <span
                data-testid={`${testId}-month-label`}
                aria-live="polite"
                className="text-body-sm-emphasis capitalize text-primary-neutral"
              >
                {formatMonthYear(view.year, view.month, locale)}
              </span>
              <button
                type="button"
                data-testid={`${testId}-next`}
                aria-label={resolvedLabels.nextMonth}
                onClick={() => shiftMonth(1)}
                className="flex h-8 w-8 items-center justify-center rounded-sm text-slate-500 hover:bg-frost focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
            <table
              ref={gridRef}
              role="grid"
              aria-label={formatMonthYear(view.year, view.month, locale)}
              data-testid={`${testId}-grid`}
              className="w-full border-collapse"
            >
              <thead>
                <tr>
                  {weekdayNames(locale).map((name) => (
                    <th
                      key={name.long}
                      scope="col"
                      abbr={name.long}
                      className="pb-1 text-center text-body-xs font-normal text-slate-500"
                    >
                      {name.short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((week) => (
                  <tr key={week[0].iso}>
                    {week.map((cell) => {
                      const selected = cell.iso === current;
                      const isToday = cell.iso === today;
                      const selectable = isWithinBounds(cell.iso, min, max);
                      return (
                        <td key={cell.iso} role="gridcell" aria-selected={selected} className="p-0.5 text-center">
                          <button
                            type="button"
                            data-iso={cell.iso}
                            data-testid={`${testId}-day-${cell.iso}`}
                            tabIndex={cell.iso === focusedIso ? 0 : -1}
                            aria-label={formatFullDate(cell.iso, locale)}
                            aria-current={isToday ? 'date' : undefined}
                            aria-disabled={!selectable || undefined}
                            onClick={() => {
                              setFocusedIso(cell.iso);
                              selectDay(cell.iso);
                            }}
                            onKeyDown={handleDayKeyDown}
                            className={cn(
                              'h-8 w-8 rounded-sm text-body-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue',
                              selected
                                ? 'bg-primary-blue text-white'
                                : cn(cell.inMonth ? 'text-primary-neutral' : 'text-slate-400', selectable && 'hover:bg-frost'),
                              isToday && !selected && 'ring-1 ring-primary-blue',
                              !selectable && 'cursor-not-allowed opacity-40',
                            )}
                          >
                            {cell.day}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
              <button
                type="button"
                data-testid={`${testId}-today`}
                disabled={!todaySelectable}
                onClick={() => selectDay(today)}
                className="rounded-sm px-2 py-1 text-body-sm-emphasis text-primary-blue hover:bg-frost focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue disabled:cursor-not-allowed disabled:text-slate-400"
              >
                {resolvedLabels.today}
              </button>
              <button
                type="button"
                data-testid={`${testId}-clear`}
                onClick={() => {
                  typed.replace(null);
                  closeCalendar(true);
                }}
                className="rounded-sm px-2 py-1 text-body-sm text-slate-500 hover:bg-frost focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue"
              >
                {resolvedLabels.clear}
              </button>
            </div>
          </div>
        )}
      </div>
      {invalid ? (
        <span id={errorId} data-testid={`${testId}-error`} className={ERROR_CLASSES}>
          {shownError}
        </span>
      ) : hint ? (
        <span id={hintId} data-testid={`${testId}-hint`} className={HINT_CLASSES}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}
