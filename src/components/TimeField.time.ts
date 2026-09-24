/**
 * 24-hour `HH:MM` parsing for `TimeField`. Pure, no `Date`, no time zone: a
 * wall-clock time typed into a form is a pair of numbers until the consumer
 * decides which day and which zone it belongs to.
 */

export type TimeParseResult =
  | { status: 'empty' }
  /**
   * `deferred` marks a form that is also the start of a longer valid entry
   * (`805` on the way to `0805`), so it may be reported on commit only.
   */
  | { status: 'valid'; value: string; deferred: boolean }
  | { status: 'incomplete' }
  | { status: 'invalid'; deferred: boolean };

const TIME_VALUE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const WITH_SEPARATOR = /^(\d{1,2})[:.](\d{2})$/;
const FOUR_DIGITS = /^(\d{2})(\d{2})$/;
const THREE_DIGITS = /^(\d)(\d{2})$/;
/** What a user can have typed on the way to a full time. */
const TIME_PREFIX = /^(?:\d{0,2}(?:[:.]\d?)?)$/;

const pad = (value: number) => String(value).padStart(2, '0');

/** True for a canonical `HH:MM` between `00:00` and `23:59`. */
export function isValidTimeValue(value: string | null | undefined): value is string {
  return typeof value === 'string' && TIME_VALUE.test(value);
}

function build(hoursText: string, minutesText: string, deferred: boolean): TimeParseResult {
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  if (hours > 23 || minutes > 59) return { status: 'invalid', deferred };
  return { status: 'valid', value: `${pad(hours)}:${pad(minutes)}`, deferred };
}

/**
 * Accepts `H:MM`, `HH:MM` (with `:` or `.`), `HHMM`, and `HMM`. Midnight is
 * `00:00`; `24:00` is rejected, so the value can never be the `h24` rendering
 * some ICU builds produce for `en-GB`.
 */
export function parseTimeText(text: string): TimeParseResult {
  const trimmed = text.trim();
  if (trimmed === '') return { status: 'empty' };

  const separated = WITH_SEPARATOR.exec(trimmed);
  if (separated) return build(separated[1], separated[2], false);
  const four = FOUR_DIGITS.exec(trimmed);
  if (four) return build(four[1], four[2], false);
  const three = THREE_DIGITS.exec(trimmed);
  if (three) return build(three[1], three[2], true);

  return TIME_PREFIX.test(trimmed) ? { status: 'incomplete' } : { status: 'invalid', deferred: false };
}
