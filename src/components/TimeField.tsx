import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useId } from 'react';

import {
  ERROR_CLASSES,
  HINT_CLASSES,
  LABEL_CLASSES,
  REQUIRED_MARK_CLASSES,
  fieldClasses,
} from './fieldChrome';
import type { FieldSize } from './fieldChrome';
import { isValidTimeValue, parseTimeText } from './TimeField.time';
import { useTypedValue } from './useTypedValue';
import type { TypedOutcome, TypedPhase } from './useTypedValue';

export interface TimeFieldLabels {
  /** Shown for an entry that is not a time. Default `'Enter a time as HH:MM'`. */
  invalidTime?: string;
}

const DEFAULT_LABELS: Required<TimeFieldLabels> = {
  invalidTime: 'Enter a time as HH:MM',
};

export interface TimeFieldProps {
  /** 24-hour wall-clock time `HH:MM`, or `null` when empty. */
  value: string | null;
  /** Fires only with a valid `HH:MM`, or `null` when cleared. Never for an unparseable entry. */
  onChange: (value: string | null) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  /** Consumer-supplied error; when set it replaces the internal parse error. */
  error?: string;
  hint?: string;
  /** Default `'HH:MM'`. */
  placeholder?: string;
  labels?: TimeFieldLabels;
  /** `data-testid` of the text input. Derived: `-error`, `-hint`. Default `'time-field'`. */
  testId?: string;
  id?: string;
  ariaLabel?: string;
  /** `'md'` 36px (default), `'lg'` 40px. */
  size?: FieldSize;
  /** As on `DatePicker`: told when the text flips between resolvable and not. */
  onValidityChange?: (valid: boolean) => void;
}

const formatTime = (value: string | null): string => (isValidTimeValue(value) ? value : '');

/**
 * A 24-hour `HH:MM` field that renders the same on every operating system.
 *
 * A native `<input type="time">` shows AM/PM on a US-configured machine
 * whatever the app's language (Core's `ShiftDefinitionDrawer` rejected it for
 * that reason), so this is a text field with a lenient parser instead of a
 * keystroke mask: `8:05`, `08:05`, `08.05` and `0805` report `08:05`
 * immediately; a three-digit entry is reported on blur or Enter only, because
 * `123` (01:23) is also the start of `1234` (12:34). Blur rewrites the text as
 * `HH:MM`. Midnight is
 * `00:00`, never `24:00`. Invalid entries follow `DatePicker`'s contract:
 * text kept, `aria-invalid`, message shown, no `onChange`.
 */
export function TimeField({
  value,
  onChange,
  label,
  required = false,
  disabled = false,
  error,
  hint,
  placeholder = 'HH:MM',
  labels,
  testId = 'time-field',
  id,
  ariaLabel,
  size = 'md',
  onValidityChange,
}: TimeFieldProps) {
  const resolvedLabels: Required<TimeFieldLabels> = { ...DEFAULT_LABELS, ...labels };
  const generatedId = useId();
  const inputId = id ?? `time-field-${generatedId}`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const current = isValidTimeValue(value) ? value : null;

  const evaluate = (text: string, phase: TypedPhase): TypedOutcome => {
    const result = parseTimeText(text);
    switch (result.status) {
      case 'empty':
        return { kind: 'empty' };
      case 'valid':
        return phase === 'commit' || !result.deferred
          ? { kind: 'commit', value: result.value, canonical: result.value }
          : { kind: 'wait' };
      case 'incomplete':
        return phase === 'commit' ? { kind: 'error', message: resolvedLabels.invalidTime } : { kind: 'wait' };
      case 'invalid':
        return phase === 'typing' && result.deferred
          ? { kind: 'wait' }
          : { kind: 'error', message: resolvedLabels.invalidTime };
    }
  };

  const typed = useTypedValue({ value: current, format: formatTime, evaluate, onChange, onValidityChange });
  const shownError = error ?? typed.error ?? undefined;
  const invalid = shownError !== undefined;

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') typed.commit();
  };

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className={LABEL_CLASSES}>
          {label}
          {required && <span className={REQUIRED_MARK_CLASSES}>*</span>}
        </label>
      )}
      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={5}
        data-testid={testId}
        value={typed.text}
        placeholder={placeholder}
        disabled={disabled}
        aria-required={required}
        aria-invalid={invalid}
        aria-describedby={invalid ? errorId : hint ? hintId : undefined}
        aria-label={ariaLabel}
        onChange={typed.handleChange}
        onFocus={typed.handleFocus}
        onBlur={typed.handleBlur}
        onKeyDown={handleKeyDown}
        className={fieldClasses({ size, invalid, disabled })}
      />
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
