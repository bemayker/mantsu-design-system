import { describe, expect, it } from 'vitest';

import {
  addDays,
  addMonths,
  endOfWeek,
  formatFullDate,
  formatIsoToDisplay,
  formatMonthYear,
  fromDayNumber,
  isValidIsoDate,
  localTodayIso,
  monthGrid,
  parseDisplayDate,
  parseIsoDate,
  resolveLocale,
  startOfWeek,
  toDayNumber,
  toIsoDate,
  weekdayIndex,
  weekdayNames,
} from './DatePicker.dates';

describe('ISO calendar dates', () => {
  it('formats an ISO date as DD/MM/YYYY, zero-padded', () => {
    expect(formatIsoToDisplay('2026-07-06')).toBe('06/07/2026');
    expect(formatIsoToDisplay('0999-01-02')).toBe('02/01/0999');
  });

  it('renders nothing for null, an empty string or a date that does not exist', () => {
    expect(formatIsoToDisplay(null)).toBe('');
    expect(formatIsoToDisplay('')).toBe('');
    expect(formatIsoToDisplay('2026-02-30')).toBe('');
    expect(formatIsoToDisplay('2026-7-6')).toBe('');
    expect(formatIsoToDisplay('2026-07-06T00:00:00')).toBe('');
  });

  it('accepts only real YYYY-MM-DD calendar dates', () => {
    expect(parseIsoDate('2024-02-29')).toEqual({ year: 2024, month: 2, day: 29 });
    expect(isValidIsoDate('2023-02-29')).toBe(false);
    expect(isValidIsoDate('0000-01-01')).toBe(false);
    expect(isValidIsoDate(undefined)).toBe(false);
  });
});

describe('parseDisplayDate', () => {
  it.each([
    ['06/07/2026', '2026-07-06'],
    ['6/7/2026', '2026-07-06'],
    ['06-07-2026', '2026-07-06'],
    ['06.07.2026', '2026-07-06'],
    ['6.7.2026', '2026-07-06'],
    ['  06/07/2026  ', '2026-07-06'],
  ])('reads %s day first as %s with a four-digit year', (text, iso) => {
    expect(parseDisplayDate(text)).toEqual({ status: 'valid', iso, yearDigits: 4 });
  });

  it('never reads month first, whatever the value would mean in US order', () => {
    expect(parseDisplayDate('12/01/2026')).toMatchObject({ iso: '2026-01-12' });
    expect(parseDisplayDate('01/12/2026')).toMatchObject({ iso: '2026-12-01' });
  });

  it.each([
    ['05/02/26', '2026-02-05'],
    ['5/2/26', '2026-02-05'],
    ['31/12/99', '2099-12-31'],
    ['01/01/00', '2000-01-01'],
  ])('expands the two-digit year in %s to 20xx (%s) and flags it as two-digit', (text, iso) => {
    expect(parseDisplayDate(text)).toEqual({ status: 'valid', iso, yearDigits: 2 });
  });

  it.each(['6', '06/', '06/07', '06/07/', '06/07/2', '06/07/202'])(
    'treats %s as still being typed',
    (text) => {
      expect(parseDisplayDate(text).status).toBe('incomplete');
    },
  );

  it.each([
    ['31/02/2026', 4],
    ['29/02/2025', 4],
    ['29/02/2100', 4],
    ['00/01/2026', 4],
    ['01/13/2026', 4],
    ['31/04/26', 2],
  ])('rejects %s as not a calendar date', (text, yearDigits) => {
    expect(parseDisplayDate(text)).toEqual({ status: 'invalid', yearDigits });
  });

  it.each(['abc', '06/07/2026x', '06/07/20261', '2026-07-06', '06//2026', '123/07/2026'])(
    'rejects the shape of %s outright',
    (text) => {
      expect(parseDisplayDate(text).status).toBe('invalid');
    },
  );

  it('honours leap years, including the century rules', () => {
    expect(parseDisplayDate('29/02/2024').status).toBe('valid');
    expect(parseDisplayDate('29/02/2000').status).toBe('valid');
    expect(parseDisplayDate('29/02/1900').status).toBe('invalid');
  });

  it('reports an empty or blank entry as empty', () => {
    expect(parseDisplayDate('')).toEqual({ status: 'empty' });
    expect(parseDisplayDate('   ')).toEqual({ status: 'empty' });
  });

  it('applies inclusive min and max bounds', () => {
    const bounds = { min: '2026-07-01', max: '2026-07-31' };
    expect(parseDisplayDate('01/07/2026', bounds).status).toBe('valid');
    expect(parseDisplayDate('31/07/2026', bounds).status).toBe('valid');
    expect(parseDisplayDate('30/06/2026', bounds)).toEqual({ status: 'beforeMin', iso: '2026-06-30', yearDigits: 4 });
    expect(parseDisplayDate('01/08/2026', bounds)).toEqual({ status: 'afterMax', iso: '2026-08-01', yearDigits: 4 });
  });

  it('ignores a bound that is not an ISO date instead of rejecting everything', () => {
    expect(parseDisplayDate('06/07/2026', { min: '', max: 'not a date' }).status).toBe('valid');
  });
});

describe('day arithmetic', () => {
  it('counts days from 1970-01-01 and back, exactly, across centuries', () => {
    expect(toDayNumber({ year: 1970, month: 1, day: 1 })).toBe(0);
    expect(toDayNumber({ year: 1969, month: 12, day: 31 })).toBe(-1);
    for (const iso of ['0001-01-01', '1600-02-29', '1999-12-31', '2000-02-29', '2026-07-06', '9999-12-31']) {
      const parts = parseIsoDate(iso)!;
      expect(toIsoDate(fromDayNumber(toDayNumber(parts)))).toBe(iso);
    }
  });

  it('agrees with consecutive calendar days for two full years', () => {
    let iso = '2023-12-31';
    for (let step = 0; step < 731; step += 1) {
      const next = addDays(iso, 1);
      expect(toDayNumber(parseIsoDate(next)!) - toDayNumber(parseIsoDate(iso)!)).toBe(1);
      expect(isValidIsoDate(next)).toBe(true);
      iso = next;
    }
    expect(iso).toBe('2025-12-31');
  });

  it('moves by days across month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
  });

  it('moves by months, clamping the day to the target month', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonths('2026-03-15', -12)).toBe('2025-03-15');
    expect(addMonths('2026-12-10', 1)).toBe('2027-01-10');
  });

  it('numbers weekdays Monday first', () => {
    expect(weekdayIndex('2026-07-06')).toBe(0);
    expect(weekdayIndex('2026-07-12')).toBe(6);
    expect(startOfWeek('2026-07-09')).toBe('2026-07-06');
    expect(endOfWeek('2026-07-09')).toBe('2026-07-12');
  });

  it('lays a month out as six Monday-first weeks', () => {
    const cells = monthGrid(2026, 7);
    expect(cells).toHaveLength(42);
    expect(cells[0].iso).toBe('2026-06-29');
    expect(cells[2]).toMatchObject({ iso: '2026-07-01', inMonth: true });
    expect(cells.filter((cell) => cell.inMonth)).toHaveLength(31);
    expect(cells[41].iso).toBe('2026-08-09');
  });

  it('reads today from the local calendar, not from UTC', () => {
    // 23:30 local on 5 July: still the 5th here whatever UTC says.
    expect(localTodayIso(new Date(2026, 6, 5, 23, 30))).toBe('2026-07-05');
  });
});

describe('Intl names', () => {
  it('names months in the given language', () => {
    expect(formatMonthYear(2026, 3, 'en')).toBe('March 2026');
    expect(formatMonthYear(2026, 3, 'nl')).toBe('maart 2026');
  });

  it('names weekdays Monday first in the given language', () => {
    expect(weekdayNames('en').map((name) => name.short)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(weekdayNames('nl')[0].long).toBe('maandag');
    expect(weekdayNames('nl')[6].long).toBe('zondag');
  });

  it('announces a full date day first in English as well as Dutch', () => {
    expect(formatFullDate('2026-07-06', 'en')).toMatch(/^Monday,? 6 July 2026$/);
    expect(formatFullDate('2026-07-06', 'nl')).toBe('maandag 6 juli 2026');
  });

  it('falls back to en-GB for a missing, bare-English or unusable locale', () => {
    expect(resolveLocale(undefined)).toBe('en-GB');
    expect(resolveLocale('en')).toBe('en-GB');
    expect(resolveLocale('nl')).toBe('nl');
    expect(resolveLocale('not a locale!')).toBe('en-GB');
  });
});
