/**
 * The two outcomes a toast reports.
 *
 * Deliberately not the four-way `info | success | warning | error` the previous
 * `Toast` in this package had. Both apps that render toasts only ever raise
 * them after an action resolved or rejected, and a variant nothing can produce
 * is a styling decision pretending to be an API. A third is a change to make
 * when a screen needs it.
 */
export type ToastVariant = 'success' | 'error';

/** One toast in the provider's queue. */
export interface ToastMessage {
  id: string;
  variant: ToastVariant;
  message: string;
}
