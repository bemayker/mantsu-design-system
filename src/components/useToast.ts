import { useMemo } from 'react';

import type { ToastVariant } from './Toast.types';
import { useToastContext } from './ToastProvider';

export interface UseToastResult {
  /** Convenience for `show({ variant: 'success', message })` (AC8). */
  success: (message: string) => void;
  /** Convenience for `show({ variant: 'error', message })` (AC8). */
  error: (message: string) => void;
  info: (message: string) => void;
  show: (input: { variant: ToastVariant; message: string }) => void;
}

/**
 * Public accessor for the shared toast primitive (AC8). Consuming screens
 * call `success`/`error` after an async action resolves/rejects; throws if
 * used outside a `ToastProvider` (mounted once in `App.tsx`).
 */
export function useToast(): UseToastResult {
  const { show } = useToastContext();

  return useMemo(
    () => ({
      success: (message: string) => show('success', message),
      error: (message: string) => show('error', message),
      info: (message: string) => show('info', message),
      show: ({ variant, message }: { variant: ToastVariant; message: string }) => show(variant, message),
    }),
    [show],
  );
}
