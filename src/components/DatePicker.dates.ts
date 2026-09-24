/**
 * Calendar-date arithmetic for `DatePicker`, with no `Date` built from a value.
 *
 * Every value here is an ISO calendar date string (`YYYY-MM-DD`) or its
 * `{ year, month, day }` parts. Nothing parses a value with `new Date(string)`
 * or `Date.parse`: `new Date('06/07/2026')` reads US month-first order and
 * `new Date('2026-07-06')` is a UTC instant that shifts a day in any zone west
 * of Greenwich. Both are the bugs CORE-FB-23 removes, and a whole-day value in
 * the consuming apps (CORE-FB-24) must reach the wire exactly as it was typed.
 *
 * Arithmetic runs on a day number (days since 1970-01-01, proleptic
 * Gregorian), converted with Howard Hinnant's `days_from_civil` algorithm. It
 * is exact for every year 1..9999 and needs no time zone at all.
 *
 * The only `Date` objects this module creates are for `Intl` month and weekday
 * names, built from numbers in UTC and formatted with `timeZone: 'UTC'`, so the
 * browser's zone never enters either.
 */

export interface DateParts {
  year: number;
  /** 1-12. */
  month: number;
  /** 1-31. */
  day: number;
}

export interface CalendarCell extends DateParts {
  iso: string;
  /** False for the leading and trailing days borrowed from adjacent months. */
  inMonth: boolean;
}

export type DateParseResult =
  | { status: 'empty' }
  | { status: 'valid'; iso: string; yearDigits: 2 | 4 }
  /** A prefix of something that could still become a valid date. */
  | { status: 'incomplete' }
  /** Not a calendar date (31/02, month 13, letters). `yearDigits` when the shape matched. */
  | { status: 'invalid'; yearDigits?: 2 | 4 }
  | { status: 'beforeMin'; iso: string; yearDigits: 2 | 4 }
  | { status: 'afterMax'; iso: string; yearDigits: 2 | 4 };

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
/** Day, month, year with `/`, `-` or `.` between them; any year length, judged below. */
const DISPLAY_DATE = /^(\d{1,2})[./-](\d{1,2})[./-](\d+)$/;
/** What a user can have typed on the way to a full date. */
const DISPLAY_PREFIX = /^\d{0,2}(?:[./-]\d{0,2}(?:[./-]\d{0,3})?)?$/;
/**
 * Digits with no separator: `DDMMYY` or `DDMMYYYY` (CORE-FB-23). The iPad
 * numeric keypad `inputMode="numeric"` opens has no `/`, `-`, `.` or `:`, so
 * operators on shop-floor tablets have no separator key to press.
 */
const DIGITS_ONLY = /^\d+$/;

const pad = (value: number, width: number) => String(value).padStart(width, '0');

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isValidParts({ year, month, day }: DateParts): boolean {
  return (
    Number.isInteger(year) && year >= 1 && year <= 9999 &&
    Number.isInteger(month) && month >= 1 && month <= 12 &&
    Number.isInteger(day) && day >= 1 && day <= daysInMonth(year, month)
  );
}

export function toIsoDate({ year, month, day }: DateParts): string {
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

/** `{year, month, day}` for a real `YYYY-MM-DD` calendar date, else `null`. */
export function parseIsoDate(iso: string | null | undefined): DateParts | null {
  if (typeof iso !== 'string') return null;
  const match = ISO_DATE.exec(iso);
  if (!match) return null;
  const parts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  return isValidParts(parts) ? parts : null;
}

export function isValidIsoDate(iso: string | null | undefined): iso is string {
  return parseIsoDate(iso) !== null;
}

/** `'2026-07-06'` → `'06/07/2026'`. Empty string for null or anything not a real date. */
export function formatIsoToDisplay(iso: string | null | undefined): string {
  const parts = parseIsoDate(iso);
  if (!parts) return '';
  return `${pad(parts.day, 2)}/${pad(parts.month, 2)}/${pad(parts.year, 4)}`;
}

type Bounds = { min?: string; max?: string };

/**
 * Builds the result for a day/month/year triad already read from the text,
 * shared by the separated and digit-only forms below. `yearDigits` also
 * drives commit timing in `DatePicker`: `2` defers to blur/Enter (a two-digit
 * year, or `DDMMYY`, might still be the start of a longer entry), `4` commits
 * on the keystroke that completes it (`DDMM` plus a four-digit year, or
 * `DDMMYYYY`).
 */
function resolveParts(day: number, month: number, yearText: string, yearDigits: 2 | 4, bounds: Bounds): DateParseResult {
  const parts: DateParts = { day, month, year: yearDigits === 2 ? 2000 + Number(yearText) : Number(yearText) };
  if (!isValidParts(parts)) return { status: 'invalid', yearDigits };

  // ISO dates with four-digit years order lexicographically, so a string
  // comparison is a date comparison here.
  const iso = toIsoDate(parts);
  if (isValidIsoDate(bounds.min) && iso < bounds.min) return { status: 'beforeMin', iso, yearDigits };
  if (isValidIsoDate(bounds.max) && iso > bounds.max) return { status: 'afterMax', iso, yearDigits };
  return { status: 'valid', iso, yearDigits };
}

/**
 * `DDMMYY` (6 digits) or `DDMMYYYY` (8 digits), with no separator at all
 * (CORE-FB-23: the iPad numeric keypad has none to offer). Any other
 * digit-only length is still a possible prefix of one of those two (so
 * `incomplete`, the way a partial separated date is) except nine digits or
 * more, which cannot become either by typing further (`invalid` outright, the
 * way an overlong separated year is). There is no guessing at a bare 4-digit
 * `DDMM`: it is `incomplete` until it reaches 6 or 8 digits.
 */
function parseDigitsOnlyDate(digits: string, bounds: Bounds): DateParseResult {
  if (digits.length === 6 || digits.length === 8) {
    const yearDigits = digits.length === 6 ? 2 : 4;
    return resolveParts(Number(digits.slice(0, 2)), Number(digits.slice(2, 4)), digits.slice(4), yearDigits, bounds);
  }
  return digits.length < 9 ? { status: 'incomplete' } : { status: 'invalid' };
}

/**
 * Reads what a user typed. Day first, always (product decision, CORE-FB-23),
 * whatever the language. Separators `/`, `-` and `.` are all accepted, and so
 * is no separator at all (`DDMMYY` or `DDMMYYYY`, for a numeric keypad with no
 * separator key). A two-digit year means 20xx (2000-2099, no pivot); a one-
 * or three-digit separated year is still being typed; five or more separated
 * digits is invalid. `min`/`max` are inclusive ISO dates.
 */
export function parseDisplayDate(text: string, bounds: Bounds = {}): DateParseResult {
  const trimmed = text.trim();
  if (trimmed === '') return { status: 'empty' };

  if (DIGITS_ONLY.test(trimmed)) return parseDigitsOnlyDate(trimmed, bounds);

  const match = DISPLAY_DATE.exec(trimmed);
  if (!match) {
    return DISPLAY_PREFIX.test(trimmed) ? { status: 'incomplete' } : { status: 'invalid' };
  }

  const yearText = match[3];
  if (yearText.length === 1 || yearText.length === 3) return { status: 'incomplete' };
  if (yearText.length > 4) return { status: 'invalid' };

  const yearDigits = yearText.length as 2 | 4;
  return resolveParts(Number(match[1]), Number(match[2]), yearText, yearDigits, bounds);
}

/** True when `iso` lies within the inclusive bounds (a missing or invalid bound is open). */
export function isWithinBounds(iso: string, min?: string, max?: string): boolean {
  if (isValidIsoDate(min) && iso < min) return false;
  if (isValidIsoDate(max) && iso > max) return false;
  return true;
}

/* ------------------------------------------------------------ day numbers */

/** Days since 1970-01-01 (Hinnant, `days_from_civil`). */
export function toDayNumber({ year, month, day }: DateParts): number {
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yearOfEra = y - era * 400;
  const dayOfYear = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
  const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146097 + dayOfEra - 719468;
}

/** Inverse of `toDayNumber` (Hinnant, `civil_from_days`). */
export function fromDayNumber(dayNumber: number): DateParts {
  const z = dayNumber + 719468;
  const era = Math.floor(z / 146097);
  const dayOfEra = z - era * 146097;
  const yearOfEra = Math.floor(
    (dayOfEra - Math.floor(dayOfEra / 1460) + Math.floor(dayOfEra / 36524) - Math.floor(dayOfEra / 146096)) / 365,
  );
  const dayOfYear = dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const mp = Math.floor((5 * dayOfYear + 2) / 153);
  const day = dayOfYear - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  return { year: yearOfEra + era * 400 + (month <= 2 ? 1 : 0), month, day };
}

function requireParts(iso: string): DateParts {
  const parts = parseIsoDate(iso);
  if (!parts) throw new RangeError(`Not an ISO calendar date: ${iso}`);
  return parts;
}

/** Keeps a result inside the years this module supports. */
function clampToRange(parts: DateParts): string {
  if (parts.year < 1) return '0001-01-01';
  if (parts.year > 9999) return '9999-12-31';
  return toIsoDate(parts);
}

export function addDays(iso: string, days: number): string {
  return clampToRange(fromDayNumber(toDayNumber(requireParts(iso)) + days));
}

/** Moves by whole months, clamping the day (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(iso: string, months: number): string {
  const { year, month, day } = requireParts(iso);
  const index = year * 12 + (month - 1) + months;
  const nextYear = Math.floor(index / 12);
  const nextMonth = (index % 12) + 1;
  if (nextYear < 1 || nextYear > 9999) return clampToRange({ year: nextYear, month: nextMonth, day: 1 });
  return toIsoDate({ year: nextYear, month: nextMonth, day: Math.min(day, daysInMonth(nextYear, nextMonth)) });
}

/** 0 = Monday … 6 = Sunday. 1970-01-01 was a Thursday. */
export function weekdayIndex(iso: string): number {
  return (((toDayNumber(requireParts(iso)) + 3) % 7) + 7) % 7;
}

export function startOfWeek(iso: string): string {
  return addDays(iso, -weekdayIndex(iso));
}

export function endOfWeek(iso: string): string {
  return addDays(iso, 6 - weekdayIndex(iso));
}

/** Six Monday-first weeks (42 cells) covering the given month. */
export function monthGrid(year: number, month: number): CalendarCell[] {
  const first = toIsoDate({ year, month, day: 1 });
  const start = toDayNumber(requireParts(first)) - weekdayIndex(first);
  return Array.from({ length: 42 }, (_, offset) => {
    const parts = fromDayNumber(start + offset);
    return { ...parts, iso: toIsoDate(parts), inMonth: parts.year === year && parts.month === month };
  });
}

/**
 * The browser's local calendar date. "Today" is the one place the device clock
 * is the right answer: it is what the operator sees on the wall. A consumer
 * whose "today" is the plant's must bound or preset the value itself.
 */
export function localTodayIso(now: Date = new Date()): string {
  return toIsoDate({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() });
}

/* ------------------------------------------------------------ Intl names */

const FALLBACK_LOCALE = 'en-GB';

/**
 * The locale used for month and weekday names. A bare `'en'` resolves to
 * `en-GB` so the full-date names announced on day cells read day first like
 * the field does; an unknown or malformed tag falls back to `en-GB` rather
 * than throwing inside a render.
 */
export function resolveLocale(locale?: string): string {
  const candidate = !locale || locale === 'en' ? FALLBACK_LOCALE : locale;
  try {
    return Intl.DateTimeFormat.supportedLocalesOf([candidate]).length > 0 ? candidate : FALLBACK_LOCALE;
  } catch {
    return FALLBACK_LOCALE;
  }
}

/**
 * Formatters are cached per locale and options: a popover render names 42 day
 * cells, 7 weekdays and the month, and constructing an `Intl.DateTimeFormat`
 * is the expensive part of formatting.
 */
const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatter(locale: string | undefined, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const resolved = resolveLocale(locale);
  const key = `${resolved}|${JSON.stringify(options)}`;
  let cached = formatterCache.get(key);
  if (!cached) {
    cached = new Intl.DateTimeFormat(resolved, { ...options, timeZone: 'UTC' });
    formatterCache.set(key, cached);
  }
  return cached;
}

/** A `Date` at UTC midnight of the given parts, for `Intl` formatting only. */
function utcDate({ year, month, day }: DateParts): Date {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

/** `'July 2026'`, `'juli 2026'`. */
export function formatMonthYear(year: number, month: number, locale?: string): string {
  return formatter(locale, { month: 'long', year: 'numeric' }).format(utcDate({ year, month, day: 1 }));
}

/** `'Monday 6 July 2026'`, `'maandag 6 juli 2026'`: the accessible name of a day cell. */
export function formatFullDate(iso: string, locale?: string): string {
  return formatter(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(
    utcDate(requireParts(iso)),
  );
}

/** Monday-first weekday names, short and long, in the given locale. */
export function weekdayNames(locale?: string): Array<{ short: string; long: string }> {
  const short = formatter(locale, { weekday: 'short' });
  const long = formatter(locale, { weekday: 'long' });
  // 2024-01-01 was a Monday.
  return Array.from({ length: 7 }, (_, index) => {
    const date = utcDate({ year: 2024, month: 1, day: 1 + index });
    return { short: short.format(date), long: long.format(date) };
  });
}
