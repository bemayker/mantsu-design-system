import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Switch } from './Switch';

/**
 * `testId` and `ariaLabel` were added by Downtimes' vendored copy and marked
 * there as "candidates to push upstream; neither is Downtimes-specific". They
 * are here now, so the copy has nothing left to re-apply.
 *
 * `ariaLabel` is the one that matters: a switch inside a settings grid has no
 * visible `label` of its own, because the grid owns it as a sibling element.
 * Without an accessible name the control is an unnamed `role="switch"`,
 * unreachable by `getByRole('switch', { name })` and unannounced.
 */

describe('Switch', () => {
  it('toggles and reports the new value', () => {
    const onChange = vi.fn();
    render(<Switch onChange={onChange} />);

    fireEvent.click(screen.getByRole('switch'));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('is nameable without a visible label', () => {
    render(<Switch ariaLabel="MQTT ingestion" />);

    expect(screen.getByRole('switch', { name: 'MQTT ingestion' })).toBeInTheDocument();
  });

  it('carries a test id', () => {
    render(<Switch testId="mqtt-ingestion-switch" />);

    expect(screen.getByTestId('mqtt-ingestion-switch')).toHaveAttribute('role', 'switch');
  });

  it('still takes its name from a visible label when one is given', () => {
    render(<Switch label="MQTT ingestion" />);

    expect(screen.getByText('MQTT ingestion')).toBeInTheDocument();
  });

  it('does not toggle while disabled', () => {
    const onChange = vi.fn();
    render(<Switch disabled onChange={onChange} />);

    fireEvent.click(screen.getByRole('switch'));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('emits no aria-label or test id attribute when neither is passed', () => {
    render(<Switch label="Plain" />);

    const control = screen.getByRole('switch');
    expect(control).not.toHaveAttribute('aria-label');
    expect(control).not.toHaveAttribute('data-testid');
  });
});
