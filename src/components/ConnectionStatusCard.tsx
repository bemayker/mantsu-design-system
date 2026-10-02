import React from 'react';
import { cn } from './cn';

/**
 * ConnectionStatusCard — the Technical settings connection light (QM-CAP-3.1).
 *
 * Core's Redpanda status header (CORE-TECH-11) as a component: a bordered card,
 * the heading with a state badge, a reason line, an error detail, a timestamp
 * line, and "Refresh status" (plus an optional "Test connection") on the right.
 * The values are Core's, so an administrator moving between Mantsu apps sees the
 * same light everywhere.
 *
 * Two things Core's single connection does not need:
 *
 * 1. It renders N connections. A module with a producer and a consumer that fail
 *    separately gets one labelled line each under the shared heading, so a dead
 *    consumer cannot hide behind a healthy producer. With one row the layout is
 *    Core's: the badge sits on the heading line.
 * 2. `detail` and the test-result lines are rendered verbatim. The backend
 *    composes them; it is the only party that knows what happened.
 *
 * Chrome only: this package carries no i18n, so every string, including each
 * badge's text, arrives already translated. Replaces the local copy in
 * Downtimes (DT-CAP-8).
 */
export type ConnectionState = 'connected' | 'disconnected' | 'error';

export interface ConnectionStatusRow {
  /** Stable key, used for the `data-testid` suffixes. */
  key: string;
  /** Already translated. Omit for a single-connection card, where the heading is the label. */
  label?: string;
  state: ConnectionState;
  /** Badge text for `state`, already translated, e.g. `Connected`. */
  stateLabel: string;
  /** Short cause, already translated. */
  reason?: string | null;
  /** Backend-composed detail, rendered verbatim in the error colour. */
  detail?: string | null;
}

export interface ConnectionStatusCardLabels {
  /** Card heading, e.g. `Connection status`. */
  heading: string;
  /** Shown while the first read is in flight, e.g. `Checking…`. */
  checking: string;
  /** Shown when the read failed, e.g. `Status unavailable`. */
  unavailable: string;
  /** The refresh button, e.g. `Refresh status`. */
  refresh: string;
  /** The test button, e.g. `Test connection`. Needed with `onTest`. */
  test?: string;
  /** The test button while a probe runs, e.g. `Testing…`. Falls back to `test`. */
  testing?: string;
}

export interface ConnectionStatusCardProps {
  /**
   * `data-testid` of the card. The parts get `-state-{key}` (with `data-state`),
   * `-reason-{key}`, `-detail-{key}`, `-row-{key}`, `-checking`, `-unavailable`,
   * `-refresh`, `-test`, `-timestamp` and `-test-result` (with `data-ok`).
   */
  testId: string;
  /** `null` while the first read is in flight or after it failed. */
  rows: ConnectionStatusRow[] | null;
  /** A read is in flight; disables refresh and, with `rows === null`, shows `checking`. */
  loading: boolean;
  labels: ConnectionStatusCardLabels;
  /** Already formatted and translated, e.g. `Settings read at 20/08/2026 14:01`. */
  timestampLine?: string | null;
  onRefresh: () => void;
  /** Omit to render no test button (a section that cannot probe). */
  onTest?: () => void;
  /** A probe is in flight; disables the test button. */
  testing?: boolean;
  /** Outcome of the last probe, one line per target. */
  testResult?: { ok: boolean; lines: string[] } | null;
  className?: string;
}

const STATE_BADGE_CLASS: Record<ConnectionState, string> = {
  connected: 'bg-success-bg text-success',
  disconnected: 'bg-slate-200 text-slate-600',
  error: 'bg-error/10 text-error',
};

const actionClass =
  'flex items-center gap-1 text-body-xs text-primary-blue hover:underline disabled:opacity-50 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue rounded-sm';

/** lucide `rotate-cw` (ISC); the package does not depend on lucide-react. */
const RotateCwIcon = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
);

export const ConnectionStatusCard: React.FC<ConnectionStatusCardProps> = ({
  testId, rows, loading, labels, timestampLine, onRefresh, onTest, testing = false, testResult,
  className,
}) => {
  const headingId = React.useId();
  const part = (suffix: string) => `${testId}-${suffix}`;
  const single = rows !== null && rows.length === 1 ? rows[0] : null;

  const badge = (row: ConnectionStatusRow) => (
    <span
      data-testid={part(`state-${row.key}`)}
      data-state={row.state}
      className={cn('rounded-md px-2 py-0.5 text-body-xs-emphasis', STATE_BADGE_CLASS[row.state])}
    >
      {row.stateLabel}
    </span>
  );

  const detail = (row: ConnectionStatusRow) =>
    row.detail ? (
      <p data-testid={part(`detail-${row.key}`)} className="text-body-xs text-error">
        {row.detail}
      </p>
    ) : null;

  return (
    <section
      data-testid={testId}
      aria-labelledby={headingId}
      aria-busy={loading || testing}
      className={cn('flex flex-col gap-1 rounded-md border border-slate-200 bg-slate-50 p-3', className)}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span id={headingId} className="text-body-sm-emphasis text-primary-neutral">
            {labels.heading}
          </span>
          {single && badge(single)}
          {rows === null && loading && (
            <span data-testid={part('checking')} role="status" className="text-body-xs text-slate-500">
              {labels.checking}
            </span>
          )}
          {rows === null && !loading && (
            <span data-testid={part('unavailable')} role="status" className="text-body-xs text-slate-500">
              {labels.unavailable}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {onTest !== undefined && (
            <button type="button" data-testid={part('test')} className={actionClass}
              disabled={testing} onClick={onTest}>
              {testing ? (labels.testing ?? labels.test) : labels.test}
            </button>
          )}
          <button type="button" data-testid={part('refresh')} className={actionClass}
            disabled={loading} onClick={onRefresh}>
            <RotateCwIcon />
            {labels.refresh}
          </button>
        </div>
      </div>

      {single && (
        <>
          {single.reason && (
            <p data-testid={part(`reason-${single.key}`)} className="text-body-xs text-slate-600">
              {single.reason}
            </p>
          )}
          {detail(single)}
        </>
      )}

      {rows !== null && rows.length > 1 && (
        <ul className="flex flex-col gap-1">
          {rows.map((row) => (
            <li key={row.key} data-testid={part(`row-${row.key}`)} className="flex flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-body-sm text-primary-neutral">{row.label}</span>
                {badge(row)}
                {row.reason && (
                  <span data-testid={part(`reason-${row.key}`)} className="text-body-xs text-slate-600">
                    {row.reason}
                  </span>
                )}
              </div>
              {detail(row)}
            </li>
          ))}
        </ul>
      )}

      {timestampLine && (
        <p data-testid={part('timestamp')} className="text-body-xs text-slate-500">
          {timestampLine}
        </p>
      )}

      {testResult && (
        <div
          data-testid={part('test-result')}
          data-ok={testResult.ok ? 'true' : 'false'}
          role="status"
          className={cn(
            'flex flex-col gap-0.5 rounded-md px-2 py-1.5 text-body-xs',
            testResult.ok ? 'bg-success-bg text-success' : 'bg-error/10 text-error',
          )}
        >
          {testResult.lines.map((line, index) => (
            <span key={index}>{line}</span>
          ))}
        </div>
      )}
    </section>
  );
};
