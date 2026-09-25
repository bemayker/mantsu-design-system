import type { ChangeEvent } from 'react';
import { useEffect, useRef, useState } from 'react';

/**
 * What a piece of typed text means, at one of two moments:
 * - `typing`: after a keystroke (or a Playwright `fill`), while the field has focus;
 * - `commit`: on blur or Enter, when the user says they are done.
 */
export type TypedOutcome =
  | { kind: 'empty' }
  /** A value to report. `canonical` replaces the text at commit time only. */
  | { kind: 'commit'; value: string; canonical: string }
  /** Not a value yet, not an error yet: the user may still be typing. */
  | { kind: 'wait' }
  | { kind: 'error'; message: string };

export type TypedPhase = 'typing' | 'commit';

interface UseTypedValueOptions {
  /** The controlled value, already normalised: `null` when empty or unreadable. */
  value: string | null;
  format: (value: string | null) => string;
  /** Must never return `wait` for the `commit` phase. */
  evaluate: (text: string, phase: TypedPhase) => TypedOutcome;
  onChange: (value: string | null) => void;
  /** Told whenever the text flips between "resolves to a value or to empty" and not. */
  onValidityChange?: (valid: boolean) => void;
  /**
   * Told whenever the CURRENT text (typed, possibly not yet committed) flips
   * between resolving to empty and not. Unlike `datePart`/`timePart` on
   * `DateTimePicker`, which only change on commit, this reflects a deferred
   * entry (a pending two-digit year, `HMM`) the instant it stops being empty,
   * so a consumer combining two of these fields can tell "one field has text
   * in it" from "one field committed a value" without re-parsing.
   */
  onEmptyChange?: (empty: boolean) => void;
}

/**
 * The text-versus-value state machine shared by `DatePicker` and `TimeField`.
 *
 * The field owns its text; the consumer owns the value. They are reconciled
 * by three rules:
 * 1. A keystroke reports a value only when the text is unambiguous
 *    (`evaluate(text, 'typing')` returns `commit`), so a half-typed entry never
 *    reaches the consumer and an invalid one never does at all.
 * 2. Blur and Enter commit: a valid entry is reported and rewritten in
 *    canonical form; an invalid one keeps its text and shows the error.
 * 3. A `value` changed from outside resets the text, but only while the field
 *    is not focused. A parent re-render mid-typing would otherwise eat the
 *    user's keystrokes.
 */
export function useTypedValue({
  value,
  format,
  evaluate,
  onChange,
  onValidityChange,
  onEmptyChange,
}: UseTypedValueOptions) {
  const [text, setText] = useState(() => format(value));
  const [error, setError] = useState<string | null>(null);
  const focused = useRef(false);

  useEffect(() => {
    if (focused.current) return;
    setText(format(value));
    setError(null);
    // `format` is a pure module-level function in both callers; depending on
    // it would only re-run this on identity churn.
  }, [value]);

  // What committing right now would do to the current text, independent of
  // whether the user has actually committed (blurred or pressed Enter) yet.
  const commitOutcome = evaluate(text, 'commit');
  const resolvable = commitOutcome.kind === 'empty' || commitOutcome.kind === 'commit';
  const currentlyEmpty = commitOutcome.kind === 'empty';

  const onValidityChangeRef = useRef(onValidityChange);
  onValidityChangeRef.current = onValidityChange;
  const lastReported = useRef<boolean | null>(null);
  useEffect(() => {
    if (lastReported.current === resolvable) return;
    lastReported.current = resolvable;
    onValidityChangeRef.current?.(resolvable);
  }, [resolvable]);

  const onEmptyChangeRef = useRef(onEmptyChange);
  onEmptyChangeRef.current = onEmptyChange;
  const lastEmptyReported = useRef<boolean | null>(null);
  useEffect(() => {
    if (lastEmptyReported.current === currentlyEmpty) return;
    lastEmptyReported.current = currentlyEmpty;
    onEmptyChangeRef.current?.(currentlyEmpty);
  }, [currentlyEmpty]);

  const apply = (nextText: string, phase: TypedPhase): boolean => {
    const outcome = evaluate(nextText, phase);
    switch (outcome.kind) {
      case 'empty':
        setError(null);
        if (phase === 'commit') setText('');
        if (value !== null) onChange(null);
        return true;
      case 'commit':
        setError(null);
        if (phase === 'commit') setText(outcome.canonical);
        if (outcome.value !== value) onChange(outcome.value);
        return true;
      case 'wait':
        setError(null);
        return false;
      case 'error':
        setError(outcome.message);
        return false;
    }
  };

  return {
    text,
    error,
    handleChange: (event: ChangeEvent<HTMLInputElement>) => {
      setText(event.target.value);
      apply(event.target.value, 'typing');
    },
    handleFocus: () => {
      focused.current = true;
    },
    handleBlur: () => {
      focused.current = false;
      apply(text, 'commit');
    },
    /** Blur/Enter semantics without leaving the field. */
    commit: () => apply(text, 'commit'),
    /** Sets a value chosen by other means (a calendar day, Clear), text and all. */
    replace: (next: string | null) => {
      setText(format(next));
      setError(null);
      if (next !== value) onChange(next);
    },
  };
}
