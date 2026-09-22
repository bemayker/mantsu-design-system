import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Table, type Column } from './Table';

/**
 * The default output of a column with no `render`.
 *
 * This is the one place where the two vendored copies and this package
 * disagreed on behaviour rather than on a missing prop, so the rule here is
 * neither of theirs and needs its own cases. The copies returned the raw row
 * value (renders JSX, throws on a plain object); this package returned
 * `String(value ?? '')` (never throws, prints `[object Object]`, and prints
 * `"false"` where the copies print nothing).
 */

interface Row {
  id: string;
  [key: string]: unknown;
}

function renderWith(value: unknown) {
  const columns: Column<Row>[] = [{ key: 'cell', header: 'Cell' }];
  return render(<Table<Row> columns={columns} data={[{ id: '1', cell: value }]} />);
}

describe('Table, default cell output', () => {
  it('renders a string', () => {
    renderWith('Mechanical');
    expect(screen.getByText('Mechanical')).toBeInTheDocument();
  });

  it('renders a number, including zero', () => {
    renderWith(0);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders JSX rather than stringifying it', () => {
    renderWith(<em>emphasis</em>);
    expect(screen.getByText('emphasis').tagName).toBe('EM');
  });

  it('renders nothing for null and undefined', () => {
    const { container } = renderWith(null);
    expect(container.querySelector('tbody td')).toBeEmptyDOMElement();
  });

  it('renders nothing for false', () => {
    const { container } = renderWith(false);
    expect(container.querySelector('tbody td')).toBeEmptyDOMElement();
  });

  it('stringifies a plain object instead of throwing', () => {
    // The case that decided the rule. React refuses an object as a child
    // ("Objects are not valid as a React child"), so returning the raw value
    // would take the page down over a column someone forgot to give a
    // `render`. A shared component prints something instead.
    expect(() => renderWith({ nested: true })).not.toThrow();
    expect(screen.getByText('[object Object]')).toBeInTheDocument();
  });

  it('stringifies a Date instead of throwing', () => {
    expect(() => renderWith(new Date('2026-01-02T03:04:05Z'))).not.toThrow();
  });

  it('still prefers an explicit render function', () => {
    const columns: Column<Row>[] = [
      { key: 'cell', header: 'Cell', render: (row) => <b>{String(row.cell)}</b> },
    ];
    render(<Table<Row> columns={columns} data={[{ id: '1', cell: { nested: true } }]} />);

    expect(screen.getByText('[object Object]').tagName).toBe('B');
  });
});
