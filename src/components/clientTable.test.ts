import { describe, expect, it } from 'vitest';

import {
  applyClientTable,
  clientTableValueOf,
  clientTableValueText,
  compareClientTableValues,
  cycleSortState,
  isEmptyClientTableValue,
  type ClientTableColumn,
} from './clientTable';

interface Order {
  id: string;
  material: string;
  planned: number | null;
  due: Date | null;
}

const d = (day: number, month: number, year = 2026) => new Date(year, month - 1, day);

const ORDERS: Order[] = [
  { id: 'o1', material: 'Dry Mix', planned: 200, due: d(21, 10) },
  { id: 'o2', material: 'Cocoa blend', planned: 1200, due: d(5, 10) },
  { id: 'o3', material: 'Waffle base', planned: null, due: null },
  { id: 'o4', material: 'cocoa nibs', planned: 9, due: d(2, 11) },
  { id: 'o5', material: 'Sugar', planned: 50, due: d(30, 9) },
  { id: 'o6', material: 'Flour', planned: 100, due: d(12, 10) },
];

const COLUMNS: ClientTableColumn<Order>[] = [
  { key: 'id' },
  { key: 'material' },
  { key: 'planned', accessor: (row) => row.planned },
  { key: 'due', accessor: (row) => row.due },
];

const ids = (rows: Order[]) => rows.map((row) => row.id);

describe('isEmptyClientTableValue', () => {
  it('treats null, undefined, blank strings, NaN and invalid dates as empty', () => {
    expect(isEmptyClientTableValue(null)).toBe(true);
    expect(isEmptyClientTableValue(undefined)).toBe(true);
    expect(isEmptyClientTableValue('   ')).toBe(true);
    expect(isEmptyClientTableValue(Number.NaN)).toBe(true);
    expect(isEmptyClientTableValue(new Date('not a date'))).toBe(true);
  });

  it('treats zero, a non-blank string and a valid date as values', () => {
    expect(isEmptyClientTableValue(0)).toBe(false);
    expect(isEmptyClientTableValue('x')).toBe(false);
    expect(isEmptyClientTableValue(d(1, 1))).toBe(false);
  });
});

describe('clientTableValueText', () => {
  it('returns strings as is, numbers as text and dates as ISO', () => {
    expect(clientTableValueText('Cocoa')).toBe('Cocoa');
    expect(clientTableValueText(1200)).toBe('1200');
    const date = new Date(Date.UTC(2026, 9, 5));
    expect(clientTableValueText(date)).toBe('2026-10-05T00:00:00.000Z');
  });

  it('returns an empty string for an empty value, an invalid date included', () => {
    expect(clientTableValueText(null)).toBe('');
    expect(clientTableValueText(new Date('nope'))).toBe('');
  });
});

describe('compareClientTableValues', () => {
  it('compares numbers by value, not by text', () => {
    expect(compareClientTableValues(9, 100)).toBeLessThan(0);
    expect(compareClientTableValues(1200, 50)).toBeGreaterThan(0);
  });

  it('compares dates by time even when their dd-mm-yyyy text orders the other way', () => {
    // '30-09-2026' > '05-10-2026' as text, but September comes first.
    expect(compareClientTableValues(d(30, 9), d(5, 10))).toBeLessThan(0);
  });

  it('compares strings numeric-aware and mixed types by their text', () => {
    expect(compareClientTableValues('item 9', 'item 10')).toBeLessThan(0);
    expect(compareClientTableValues(10, 'item')).toBeLessThan(0);
  });
});

describe('clientTableValueOf', () => {
  it('reads the accessor when there is one and row[key] otherwise', () => {
    expect(clientTableValueOf(COLUMNS[2], ORDERS[0])).toBe(200);
    expect(clientTableValueOf(COLUMNS[1], ORDERS[1])).toBe('Cocoa blend');
  });

  it('reads a raw value of another type as text instead of throwing', () => {
    const rows = [{ flag: true }];
    expect(clientTableValueOf<{ flag: boolean }>({ key: 'flag' }, rows[0])).toBe('true');
    expect(clientTableValueOf<{ flag: boolean }>({ key: 'missing' }, rows[0])).toBeUndefined();
  });
});

describe('applyClientTable sort', () => {
  it('keeps the input order when unsorted', () => {
    expect(ids(applyClientTable(ORDERS, COLUMNS, null, {}))).toEqual(['o1', 'o2', 'o3', 'o4', 'o5', 'o6']);
  });

  it('sorts numbers by value ascending with the empty value last', () => {
    const rows = applyClientTable(ORDERS, COLUMNS, { key: 'planned', direction: 'asc' }, {});
    expect(ids(rows)).toEqual(['o4', 'o5', 'o6', 'o1', 'o2', 'o3']);
  });

  it('sorts numbers descending and still puts the empty value last', () => {
    const rows = applyClientTable(ORDERS, COLUMNS, { key: 'planned', direction: 'desc' }, {});
    expect(ids(rows)).toEqual(['o2', 'o1', 'o6', 'o5', 'o4', 'o3']);
  });

  it('sorts dates by time in both directions with the empty date last', () => {
    expect(ids(applyClientTable(ORDERS, COLUMNS, { key: 'due', direction: 'asc' }, {})))
      .toEqual(['o5', 'o2', 'o6', 'o1', 'o4', 'o3']);
    expect(ids(applyClientTable(ORDERS, COLUMNS, { key: 'due', direction: 'desc' }, {})))
      .toEqual(['o4', 'o1', 'o6', 'o2', 'o5', 'o3']);
  });

  it('sinks every kind of empty value in both directions', () => {
    const rows = [
      { id: 'a', v: undefined }, { id: 'b', v: 2 }, { id: 'c', v: Number.NaN },
      { id: 'd', v: 1 }, { id: 'e', v: null },
    ] as { id: string; v: number | null | undefined }[];
    const columns: ClientTableColumn<(typeof rows)[number]>[] = [{ key: 'v', accessor: (r) => r.v }];
    expect(applyClientTable(rows, columns, { key: 'v', direction: 'asc' }, {}).map((r) => r.id))
      .toEqual(['d', 'b', 'a', 'c', 'e']);
    expect(applyClientTable(rows, columns, { key: 'v', direction: 'desc' }, {}).map((r) => r.id))
      .toEqual(['b', 'd', 'a', 'c', 'e']);
  });

  it('keeps the input order on ties', () => {
    const rows = [
      { id: 'a', group: 'x' }, { id: 'b', group: 'y' }, { id: 'c', group: 'x' }, { id: 'd', group: 'x' },
    ];
    const result = applyClientTable(rows, [{ key: 'group' }], { key: 'group', direction: 'asc' }, {});
    expect(result.map((r) => r.id)).toEqual(['a', 'c', 'd', 'b']);
  });

  it('never mutates the input array', () => {
    const input = [...ORDERS];
    applyClientTable(input, COLUMNS, { key: 'planned', direction: 'desc' }, { material: 'o' });
    expect(ids(input)).toEqual(ids(ORDERS));
  });

  it('ignores a sort key that names no column', () => {
    const rows = applyClientTable(ORDERS, COLUMNS, { key: 'nope', direction: 'asc' }, {});
    expect(ids(rows)).toEqual(ids(ORDERS));
  });
});

describe('applyClientTable filter', () => {
  it('matches a case-insensitive substring of the column value', () => {
    expect(ids(applyClientTable(ORDERS, COLUMNS, null, { material: 'COCOA' }))).toEqual(['o2', 'o4']);
  });

  it('combines two column searches with AND', () => {
    expect(ids(applyClientTable(ORDERS, COLUMNS, null, { material: 'cocoa', planned: '12' }))).toEqual(['o2']);
  });

  it('ignores a blank query and a key that names no column', () => {
    expect(ids(applyClientTable(ORDERS, COLUMNS, null, { material: '   ', nope: 'zzz' }))).toEqual(ids(ORDERS));
  });

  it('trims the query and never matches an empty value', () => {
    expect(ids(applyClientTable(ORDERS, COLUMNS, null, { material: '  blend ' }))).toEqual(['o2']);
    expect(ids(applyClientTable(ORDERS, COLUMNS, null, { planned: 'null' }))).toEqual([]);
  });

  it('filters, then sorts', () => {
    const rows = applyClientTable(ORDERS, COLUMNS, { key: 'planned', direction: 'desc' }, { material: 'cocoa' });
    expect(ids(rows)).toEqual(['o2', 'o4']);
  });
});

describe('cycleSortState', () => {
  it('cycles none, ascending, descending, none', () => {
    const asc = cycleSortState(null, 'planned');
    expect(asc).toEqual({ key: 'planned', direction: 'asc' });
    const desc = cycleSortState(asc, 'planned');
    expect(desc).toEqual({ key: 'planned', direction: 'desc' });
    expect(cycleSortState(desc, 'planned')).toBeNull();
  });

  it('restarts at ascending when another column is clicked', () => {
    expect(cycleSortState({ key: 'planned', direction: 'desc' }, 'due')).toEqual({ key: 'due', direction: 'asc' });
    expect(cycleSortState(undefined, 'due')).toEqual({ key: 'due', direction: 'asc' });
  });
});
