import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Button, Badge, DatePicker, DateTimePicker, EmptyState, TimeField } from '../components/index';

// A minimal render check per component family. The point is not coverage but
// a tripwire: the published bundle must actually mount in a consumer.
describe('components render', () => {
  it('renders a Button with its token-driven classes', () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeInTheDocument();
    expect(button.className).toContain('bg-midnight');
  });

  it('renders a Badge', () => {
    render(<Badge>3</Badge>);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders an EmptyState', () => {
    render(<EmptyState title="No downtimes" />);
    expect(screen.getByText('No downtimes')).toBeInTheDocument();
  });

  it('renders the date and time fields from the package root', () => {
    render(
      <>
        <DatePicker value="2026-07-06" onChange={() => undefined} testId="smoke-date" />
        <TimeField value="00:00" onChange={() => undefined} testId="smoke-time" />
        <DateTimePicker value="2026-07-06T08:00" onChange={() => undefined} testId="smoke-dt" />
      </>,
    );
    expect(screen.getByTestId('smoke-date')).toHaveValue('06/07/2026');
    expect(screen.getByTestId('smoke-time')).toHaveValue('00:00');
    expect(screen.getByTestId('smoke-dt-time')).toHaveValue('08:00');
  });
});
