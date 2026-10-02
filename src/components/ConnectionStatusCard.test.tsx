import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConnectionStatusCard, type ConnectionStatusRow } from './ConnectionStatusCard';

const labels = {
  heading: 'Connection status',
  checking: 'Checking…',
  unavailable: 'Status unavailable',
  refresh: 'Refresh status',
  test: 'Test connection',
  testing: 'Testing…',
};

const broker: ConnectionStatusRow = {
  key: 'broker', state: 'error', stateLabel: 'Error', reason: 'Broker unreachable',
  detail: 'connect ECONNREFUSED 10.0.0.4:1883',
};

const consumer: ConnectionStatusRow = { key: 'consumer', label: 'Consumer', state: 'connected', stateLabel: 'Connected' };
const producer: ConnectionStatusRow = {
  key: 'producer', label: 'Producer', state: 'disconnected', stateLabel: 'Off', reason: 'Disabled',
};

describe('ConnectionStatusCard', () => {
  it('puts a single connection on the heading line, Core style', () => {
    render(<ConnectionStatusCard testId="mqtt" rows={[broker]} loading={false} labels={labels}
      onRefresh={() => undefined} timestampLine="Settings read at 20/08/2026 14:01" />);

    const card = screen.getByRole('region', { name: 'Connection status' });
    expect(card).toHaveAttribute('data-testid', 'mqtt');
    const badge = screen.getByTestId('mqtt-state-broker');
    expect(badge).toHaveTextContent('Error');
    expect(badge).toHaveAttribute('data-state', 'error');
    expect(badge.className).toContain('bg-error/10');
    expect(badge.className).toContain('text-error');
    expect(screen.getByTestId('mqtt-reason-broker')).toHaveTextContent('Broker unreachable');
    expect(screen.getByTestId('mqtt-detail-broker')).toHaveTextContent('connect ECONNREFUSED 10.0.0.4:1883');
    expect(screen.getByTestId('mqtt-timestamp')).toHaveTextContent('Settings read at 20/08/2026 14:01');
    expect(screen.queryByTestId('mqtt-row-broker')).toBeNull();
  });

  it('gives each of several connections its own labelled badge', () => {
    render(<ConnectionStatusCard testId="rp" rows={[consumer, producer]} loading={false} labels={labels}
      onRefresh={() => undefined} />);

    const consumerRow = screen.getByTestId('rp-row-consumer');
    expect(within(consumerRow).getByText('Consumer')).toBeInTheDocument();
    expect(screen.getByTestId('rp-state-consumer')).toHaveAttribute('data-state', 'connected');
    expect(screen.getByTestId('rp-state-consumer').className).toContain('text-success');
    const producerRow = screen.getByTestId('rp-row-producer');
    expect(within(producerRow).getByTestId('rp-state-producer')).toHaveTextContent('Off');
    expect(screen.getByTestId('rp-state-producer').className).toContain('bg-slate-200');
    expect(screen.getByTestId('rp-reason-producer')).toHaveTextContent('Disabled');
    expect(screen.queryByTestId('rp-reason-consumer')).toBeNull();
  });

  it('shows checking while the first read is in flight and disables refresh', () => {
    render(<ConnectionStatusCard testId="c" rows={null} loading labels={labels} onRefresh={() => undefined} />);

    expect(screen.getByTestId('c-checking')).toHaveTextContent('Checking…');
    expect(screen.getByRole('button', { name: 'Refresh status' })).toBeDisabled();
    expect(screen.getByTestId('c')).toHaveAttribute('aria-busy', 'true');
  });

  it('shows unavailable when the read failed', () => {
    const onRefresh = vi.fn();
    render(<ConnectionStatusCard testId="c" rows={null} loading={false} labels={labels} onRefresh={onRefresh} />);

    expect(screen.getByTestId('c-unavailable')).toHaveTextContent('Status unavailable');
    expect(screen.queryByTestId('c-checking')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh status' }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('renders no test button without onTest', () => {
    render(<ConnectionStatusCard testId="c" rows={[broker]} loading={false} labels={labels} onRefresh={() => undefined} />);

    expect(screen.queryByTestId('c-test')).toBeNull();
  });

  it('runs a test and disables the button while it is in flight', () => {
    const onTest = vi.fn();
    const { rerender } = render(<ConnectionStatusCard testId="c" rows={[broker]} loading={false} labels={labels}
      onRefresh={() => undefined} onTest={onTest} />);

    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));
    expect(onTest).toHaveBeenCalledTimes(1);

    rerender(<ConnectionStatusCard testId="c" rows={[broker]} loading={false} labels={labels}
      onRefresh={() => undefined} onTest={onTest} testing />);
    expect(screen.getByRole('button', { name: 'Testing…' })).toBeDisabled();
  });

  it('reports a passed and a failed test', () => {
    const { rerender } = render(<ConnectionStatusCard testId="c" rows={[broker]} loading={false} labels={labels}
      onRefresh={() => undefined} onTest={() => undefined} testResult={{ ok: true, lines: ['Connection test passed'] }} />);

    const passed = screen.getByTestId('c-test-result');
    expect(passed).toHaveAttribute('data-ok', 'true');
    expect(passed).toHaveAttribute('role', 'status');
    expect(passed.className).toContain('bg-success-bg');

    rerender(<ConnectionStatusCard testId="c" rows={[broker]} loading={false} labels={labels}
      onRefresh={() => undefined} onTest={() => undefined}
      testResult={{ ok: false, lines: ['Connection test failed', 'Broker: connection refused'] }} />);
    const failed = screen.getByTestId('c-test-result');
    expect(failed).toHaveAttribute('data-ok', 'false');
    expect(failed.className).toContain('bg-error/10');
    expect(failed).toHaveTextContent('Broker: connection refused');
  });
});
