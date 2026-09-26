import React from 'react';
/**
 * Toast — one piece of feedback after an action, with a dismiss control.
 *
 * ## This REPLACED an earlier `Toast`, and the replacement was the point
 *
 * Until UI-6 this package exported a different component under this name:
 * `title`/`description`/`onClose`, a coloured bar, always `role="status"`, four
 * variants. Nothing imported it. Meanwhile Core and Downtimes each shipped the
 * component below — `message`/`onDismiss`, an icon, `role="alert"` on errors —
 * and neither could adopt the package's, because the two only shared a name.
 *
 * UI-5 recorded that as an open question and deliberately left Core's copy in
 * Core, since one app's divergence is not evidence of anything. UI-6 supplies
 * the second data point: the two apps' copies are the SAME component, down to
 * the variant class strings. So the package now carries the one the screens
 * actually render, and the unused one is gone rather than kept beside it under
 * a second name that nobody would reach for either.
 *
 * `role="alert"` for errors and `role="status"` otherwise is load-bearing and
 * was absent from the old one: a failure has to interrupt a screen reader,
 * where a success must not.
 *
 * ## What 1.3.0 got wrong, recorded because the method failed, not the merge
 *
 * The promotion compared the two apps' props, their variant styles and their
 * bodies, concluded they were the same component, and took Core's. They WERE
 * the same component; Downtimes' copy also carried `data-toast-variant`, and
 * a prop-level comparison cannot see an attribute. Fifty-seven E2E assertions
 * matched on it. Folding a divergence in means diffing the rendered output,
 * not the interface.
 */
import { CheckCircleIcon, XCircleIcon, XIcon, InfoCircleIcon } from './Toast.icons';

import { cn } from './cn';
import type { ToastVariant } from './Toast.types';

export interface ToastProps {
  /**
   * Unique per-message suffix for the `data-testid`s (coding_standards.md
   * §3.6): several toasts of the same variant can be stacked at once by
   * `ToastProvider`, so the variant name alone would not stay unique.
   * Defaults to the variant for standalone usage (e.g. Storybook).
   */
  id?: string;
  variant: ToastVariant;
  message: string;
  onDismiss: () => void;
  dismissLabel?: string;
}

const VARIANT_STYLES: Record<ToastVariant, { icon: React.FC<{ className?: string }>; classes: string }> = {
  success: { icon: CheckCircleIcon, classes: 'border-success bg-success-bg text-primary-neutral' },
  error: { icon: XCircleIcon, classes: 'border-error bg-error-bg text-primary-neutral' },
  info: { icon: InfoCircleIcon, classes: 'border-primary-blue/20 bg-info-bg text-primary-neutral' },
};

/**
 * A single feedback toast (AC8): success/error variants styled with the
 * matching design-system token, an icon, the message, and a dismiss
 * control. `role="status"` for success (polite, non-interrupting) and
 * `role="alert"` for error (assertive), so screen readers announce failures
 * immediately without stealing focus from either.
 */
export function Toast({ id, variant, message, onDismiss, dismissLabel = 'Dismiss' }: ToastProps) {
  const { icon: Icon, classes } = VARIANT_STYLES[variant];
  const testIdSuffix = id ?? variant;

  return (
    <div
      data-testid={`toast-${testIdSuffix}`}
      role={variant === 'error' ? 'alert' : 'status'}
      // The stable hook Downtimes' E2E specs match on, in 57 places. It is not
      // redundant with the test id beside it: `toast-${id ?? variant}` carries
      // the caller's id when one is supplied, so a spec asserting "a success
      // toast appeared" cannot key on it without knowing which toast fired.
      data-toast-variant={variant}
      className={cn(
        'flex items-center gap-3 rounded-md border px-4 py-3 shadow-mantsu-md',
        classes,
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <p className="text-body-sm text-primary-neutral">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={dismissLabel}
        data-testid={`toast-dismiss-button-${testIdSuffix}`}
        className="ml-auto flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-white/50"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
