import React from 'react';
import { cn } from './cn';
import { useEscapeKey } from './useEscapeKey';

/**
 * Modal — the Make dialog chrome (UI-20.2, 2.0.0).
 *
 * A panel over a `bg-black/50` backdrop: radius 16, `shadow-mantsu-lg`, an
 * optional 48px featured-icon slot, title 18/23 bold with an optional
 * supporting line, a close button top-right, the body, and a right-aligned
 * action row. Header `pt 24 px 24 pb 20 gap 16`, actions `pt 32 px 24 pb 24
 * gap 12`. These are the values the Order Cockpit's copy recorded from the
 * designs; the Downtimes and Lists copies converge on them.
 *
 * Behaviour: Escape closes through the shared `useEscapeKey` stack (a dropdown
 * open inside the dialog takes the press first); a press that STARTS on the
 * backdrop closes, so a text selection dragged out of the panel does not;
 * focus moves into the panel on open unless a child already took it, Tab is
 * trapped inside the panel, and focus returns to the trigger on close.
 * `dismissible={false}` locks every dismissal path, for a pending save.
 */
export type ModalWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** The dialog's accessible name. */
  title?: string;
  /** Supporting line under the title. */
  subtitle?: React.ReactNode;
  /** Contents of the 48px featured-icon slot, e.g. a 24px icon. */
  icon?: React.ReactNode;
  /** 420, 500 (default), 600, 880 or 1000px. */
  width?: ModalWidth;
  /** Right-aligned action row. Cancel first, confirm last. */
  actions?: React.ReactNode;
  /** @deprecated since 2.0.0: use `actions`. Rendered in the same row. */
  footer?: React.ReactNode;
  /** Accessible name of the close button, already translated. Default `Close`. */
  closeLabel?: string;
  /** `above` stacks the dialog over another open one. Default `base`. */
  layer?: 'base' | 'above';
  /**
   * `auto` (default) caps the panel at the viewport and scrolls it. `visible`
   * lets a dropdown menu float past the panel edge; use it only for content
   * that cannot outgrow the viewport.
   */
  overflow?: 'auto' | 'visible';
  /** `false` locks the close button, the backdrop and Escape. Default `true`. */
  dismissible?: boolean;
  /**
   * `data-testid` of the panel. The backdrop gets `-backdrop`, the close
   * button `-close`, the title `-title` and the supporting line `-subtitle`.
   */
  testId?: string;
  className?: string;
  children?: React.ReactNode;
}

const PANEL_WIDTH: Record<ModalWidth, string> = {
  sm: 'max-w-[420px]',
  md: 'max-w-[500px]',
  lg: 'max-w-[600px]',
  xl: 'max-w-[880px]',
  '2xl': 'max-w-[1000px]',
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), ' +
  'select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
  </svg>
);

export const Modal: React.FC<ModalProps> = ({
  open, onClose, title, subtitle, icon, width = 'md', actions, footer,
  closeLabel = 'Close', layer = 'base', overflow = 'auto', dismissible = true,
  testId, className, children,
}) => {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const baseId = React.useId();
  const idFor = (part: string) => (testId ? `${testId}-${part}` : `${baseId}-${part}`);
  const part = (suffix: string) => (testId ? `${testId}-${suffix}` : undefined);
  const close = () => { if (dismissible) onClose(); };

  useEscapeKey(open && dismissible, onClose);

  React.useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    // A child that focused itself on mount (a search field that opens ready
    // to type) ran its effect first; taking focus back would undo it.
    if (panel && !panel.contains(document.activeElement)) {
      (panel.querySelector<HTMLElement>(FOCUSABLE) ?? panel).focus();
    }
    return () => previouslyFocused?.focus?.();
  }, [open]);

  if (!open) return null;

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'Tab' || !panelRef.current) return;
    const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const actionRow = actions ?? footer;
  const hasHeader = Boolean(icon || title || subtitle);

  return (
    <div
      data-testid={part('backdrop')}
      onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}
      className={cn(
        'fixed inset-0 flex items-center justify-center bg-black/50 p-4',
        layer === 'above' ? 'z-50' : 'z-40',
      )}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? idFor('title') : undefined}
        aria-describedby={subtitle ? idFor('subtitle') : undefined}
        data-testid={testId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={cn(
          'relative w-full rounded-xl bg-white shadow-mantsu-lg outline-none',
          overflow === 'auto' ? 'max-h-[calc(100vh-32px)] overflow-y-auto' : 'overflow-visible',
          PANEL_WIDTH[width],
          className,
        )}
      >
        <button
          type="button"
          onClick={close}
          disabled={!dismissible}
          aria-label={closeLabel}
          data-testid={part('close')}
          className="absolute right-4 top-4 rounded-md p-2.5 text-primary-neutral hover:bg-[#f3f4f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CloseIcon />
        </button>

        {hasHeader && (
          <div className="flex flex-col gap-4 px-6 pb-5 pt-6">
            {icon && (
              <span aria-hidden
                className="flex size-12 items-center justify-center rounded-[10px] border border-slate-50 shadow-mantsu-sm">
                {icon}
              </span>
            )}
            <div className="flex flex-col gap-1 pr-10">
              {title && (
                <h2 id={idFor('title')} data-testid={part('title')}
                  className="text-[18px] font-bold leading-[23px] text-primary-neutral">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p id={idFor('subtitle')} data-testid={part('subtitle')}
                  className="text-[14px] leading-6 text-[#64748b]">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        )}

        {children && (
          <div className={cn('px-6', !hasHeader && 'pt-6 pr-16', !actionRow && 'pb-6')}>{children}</div>
        )}

        {actionRow && <div className="flex justify-end gap-3 px-6 pb-6 pt-8">{actionRow}</div>}
      </div>
    </div>
  );
};
export default Modal;
