/**
 * The toast queue: one provider per application area that raises toasts.
 *
 * Promoted at UI-6 alongside `Toast` itself. Core's copy is the one here rather
 * than Downtimes', because it carries `dismissLabel`: Downtimes hardcodes the
 * English "Dismiss" on the close button, and a package cannot ship a string an
 * app is unable to translate.
 *
 * Mounted around the screens that raise toasts, not at the very root of a
 * multi-module shell: a toast raised in one module should not outlive a
 * navigation out of it.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, } from 'react';

import type { ToastMessage, ToastVariant } from './Toast.types';
import { Toast } from './Toast';

/** Default auto-dismiss delay (AC8: "success toast on success ... error toast on failure"). */
export const DEFAULT_TOAST_DURATION_MS = 4000;
/** Caps the stack so a burst of failures cannot fill the viewport indefinitely. */
export const MAX_QUEUED_TOASTS = 5;

interface ToastContextValue {
  show: (variant: ToastVariant, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export interface ToastProviderProps {
  children: ReactNode;
  /** Overridable for tests; defaults to `DEFAULT_TOAST_DURATION_MS`. */
  durationMs?: number;
  /** Overridable for tests; defaults to `MAX_QUEUED_TOASTS`. */
  maxToasts?: number;
  /**
   * Localized label for every toast's dismiss button (coding_standards.md
   * §3.3: keep text i18n-ready rather than hardcoding it). Defaults to the
   * English fallback, matching `DrawerHeader.closeLabel`'s convention; the
   * app root passes a translated value once a screen starts using toasts.
   */
  dismissLabel?: string;
}

/**
 * App-root provider for the shared toast primitive (AC8). Mounted once
 * (`App.tsx`); consuming screens call `useToast()` to surface success/error
 * feedback after an async action. Renders a fixed, bottom-right, stacked
 * viewport; each toast auto-dismisses after `durationMs` or on manual
 * dismiss, whichever comes first. The queue is capped at `maxToasts`,
 * dropping the oldest entry once the cap is exceeded.
 */
export function ToastProvider({
  children,
  durationMs = DEFAULT_TOAST_DURATION_MS,
  maxToasts = MAX_QUEUED_TOASTS,
  dismissLabel,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  // Tracks pending auto-dismiss timers so they can be cleared on unmount;
  // otherwise a timer firing after the provider unmounts (e.g. in tests, or
  // a full app teardown) calls `setState` on an unmounted component. Typed
  // as `number` (what the DOM `window.setTimeout` always returns), not
  // derived via `ReturnType<typeof window.setTimeout>`: that derivation
  // resolves ambiguously once any `@types/node` ambient declarations are
  // reachable in the compile (e.g. transitively via Storybook's Vite typings
  // in `.stories.tsx`), since Node's global `setTimeout` returns a different
  // `Timeout` type.
  const timeoutsRef = useRef<Map<string, number>>(new Map());

  useEffect(
    () => () => {
      for (const timeoutId of timeoutsRef.current.values()) {
        window.clearTimeout(timeoutId);
      }
      timeoutsRef.current.clear();
    },
    [],
  );

  const dismiss = useCallback((id: string) => {
    const timeoutId = timeoutsRef.current.get(id);
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      timeoutsRef.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (variant: ToastVariant, message: string) => {
      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      setToasts((current) => {
        const next = [...current, { id, variant, message }];
        return next.length > maxToasts ? next.slice(next.length - maxToasts) : next;
      });

      timeoutsRef.current.set(
        id,
        window.setTimeout(() => dismiss(id), durationMs),
      );
    },
    [dismiss, durationMs, maxToasts],
  );

  const value = useMemo<ToastContextValue>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        data-testid="toast-viewport"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              id={toast.id}
              variant={toast.variant}
              message={toast.message}
              onDismiss={() => dismiss(toast.id)}
              dismissLabel={dismissLabel}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Internal accessor; `useToast` (the public API) wraps this. */
export function useToastContext(): ToastContextValue {
  const context = useContext(ToastContext);
  if (context === null) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
}
