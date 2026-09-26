import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Pagination, getPageRange } from './Pagination';

const labels = { first: 'First page', previous: 'Previous page', next: 'Next page', last: 'Last page' };

describe('Pagination', () => {
  it('names the four buttons and shows the summary', () => {
    render(<Pagination page={2} pageCount={3} onPageChange={() => undefined}
      summary="11 to 20 of 23" labels={labels} testId="pager" />);

    for (const name of Object.values(labels)) {
      expect(screen.getByRole('button', { name })).toBeEnabled();
    }
    expect(screen.getByTestId('pager-summary')).toHaveTextContent('11 to 20 of 23');
  });

  it('reports the target page', () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} pageCount={3} onPageChange={onPageChange}
      summary="" labels={labels} testId="pager" />);

    fireEvent.click(screen.getByTestId('pager-first'));
    fireEvent.click(screen.getByTestId('pager-prev'));
    fireEvent.click(screen.getByTestId('pager-next'));
    fireEvent.click(screen.getByTestId('pager-last'));

    expect(onPageChange.mock.calls.map(([p]) => p)).toEqual([1, 1, 3, 3]);
  });

  it('disables the buttons at either end', () => {
    render(<Pagination page={1} pageCount={1} onPageChange={() => undefined}
      summary="" labels={labels} testId="pager" />);

    for (const id of ['first', 'prev', 'next', 'last']) {
      expect(screen.getByTestId(`pager-${id}`)).toBeDisabled();
    }
  });

  it('can leave out first and last', () => {
    render(<Pagination page={1} pageCount={2} onPageChange={() => undefined}
      summary="" labels={labels} showFirstLast={false} testId="pager" />);

    expect(screen.queryByTestId('pager-first')).toBeNull();
    expect(screen.queryByTestId('pager-last')).toBeNull();
    expect(screen.getByTestId('pager-next')).toBeEnabled();
  });
});

describe('getPageRange', () => {
  it('computes the rows on a page', () => {
    expect(getPageRange(3, 10, 23)).toEqual({ page: 3, pageCount: 3, from: 21, to: 23 });
  });

  it('clamps a page past the end', () => {
    expect(getPageRange(9, 10, 23)).toEqual({ page: 3, pageCount: 3, from: 21, to: 23 });
  });

  it('keeps one page for an empty result', () => {
    expect(getPageRange(1, 10, 0)).toEqual({ page: 1, pageCount: 1, from: 0, to: 0 });
  });
});
