import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SearchInput } from './SearchInput';

describe('SearchInput', () => {
  it('renders the controlled value', () => {
    render(
      <SearchInput
        value="mixer"
        onChange={vi.fn()}
        placeholder="Search"
        ariaLabel="Search equipment"
        testId="search"
      />,
    );

    expect(screen.getByTestId('search')).toHaveValue('mixer');
  });

  it('reports each keystroke through onChange', async () => {
    const onChange = vi.fn();
    render(
      <SearchInput
        value=""
        onChange={onChange}
        placeholder="Search"
        ariaLabel="Search equipment"
        testId="search"
      />,
    );

    await userEvent.type(screen.getByTestId('search'), 'ab');

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith('b');
  });

  it('carries an accessible name, because a magnifier glyph is not a label', () => {
    render(
      <SearchInput
        value=""
        onChange={vi.fn()}
        placeholder="Search"
        ariaLabel="Search equipment"
        testId="search"
      />,
    );

    expect(screen.getByRole('searchbox', { name: 'Search equipment' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
  });
});
