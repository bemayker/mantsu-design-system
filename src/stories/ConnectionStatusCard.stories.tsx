import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ConnectionStatusCard, type ConnectionStatusRow } from '../components/ConnectionStatusCard';

const meta: Meta<typeof ConnectionStatusCard> = {
  title: 'Components/ConnectionStatusCard',
  component: ConnectionStatusCard,
  tags: ['autodocs'],
};
export default meta;

const labels = {
  heading: 'Connection status',
  checking: 'Checking…',
  unavailable: 'Status unavailable',
  refresh: 'Refresh status',
  test: 'Test connection',
  testing: 'Testing…',
};

const noop = () => undefined;
const timestampLine = 'Settings read at 20/08/2026 14:01';

const broker: ConnectionStatusRow = { key: 'broker', state: 'connected', stateLabel: 'Connected' };

export const SingleConnected: StoryObj = {
  render: () => (
    <ConnectionStatusCard testId="mqtt-status" rows={[broker]} loading={false} labels={labels}
      timestampLine={timestampLine} onRefresh={noop} onTest={noop} />
  ),
};

export const SingleError: StoryObj = {
  render: () => (
    <ConnectionStatusCard testId="mqtt-status" loading={false} labels={labels} timestampLine={timestampLine}
      onRefresh={noop} onTest={noop}
      rows={[{ key: 'broker', state: 'error', stateLabel: 'Error', reason: 'Broker unreachable',
        detail: 'connect ECONNREFUSED 10.0.0.4:1883' }]} />
  ),
};

export const ConsumerAndProducer: StoryObj = {
  render: () => (
    <ConnectionStatusCard testId="redpanda-status" loading={false} labels={labels} timestampLine={timestampLine}
      onRefresh={noop} onTest={noop}
      rows={[
        { key: 'consumer', label: 'Consumer', state: 'connected', stateLabel: 'Connected' },
        { key: 'producer', label: 'Producer', state: 'disconnected', stateLabel: 'Off', reason: 'Disabled in settings' },
      ]} />
  ),
};

export const Checking: StoryObj = {
  render: () => <ConnectionStatusCard testId="c" rows={null} loading labels={labels} onRefresh={noop} />,
};

export const Unavailable: StoryObj = {
  render: () => <ConnectionStatusCard testId="c" rows={null} loading={false} labels={labels} onRefresh={noop} />,
};

export const WithoutTest: StoryObj = {
  render: () => (
    <ConnectionStatusCard testId="c" rows={[broker]} loading={false} labels={labels} onRefresh={noop} />
  ),
};

const Interactive = ({ pass }: { pass: boolean }) => {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; lines: string[] } | null>(null);
  const run = () => {
    setTesting(true);
    setResult(null);
    setTimeout(() => {
      setTesting(false);
      setResult(pass
        ? { ok: true, lines: ['Connection test passed'] }
        : { ok: false, lines: ['Connection test failed', 'Broker: connection refused'] });
    }, 800);
  };
  return (
    <ConnectionStatusCard testId="c" rows={[broker]} loading={false} labels={labels} timestampLine={timestampLine}
      onRefresh={noop} onTest={run} testing={testing} testResult={result} />
  );
};

export const TestPassed: StoryObj = { render: () => <Interactive pass /> };

export const TestFailed: StoryObj = { render: () => <Interactive pass={false} /> };
