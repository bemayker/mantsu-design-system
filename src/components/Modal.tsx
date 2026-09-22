import React from 'react';
import { cn } from './cn';
import { useEscapeKey } from './useEscapeKey';

/** Modal — centered dialog with overlay. */
export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}
export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, footer, className }) => {
  // Through the shared stack, not a listener of its own: a dropdown or a
  // context menu open inside this dialog must take the Escape press itself and
  // leave the dialog standing.
  useEscapeKey(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-midnight/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className={cn('relative w-full max-w-lg rounded-lg bg-white shadow-mantsu-lg', className)}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="text-h3 text-midnight">{title}</h2>
            <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-midnight text-xl leading-none">×</button>
          </div>
        )}
        <div className="px-6 py-5 text-body text-midnight">{children}</div>
        {footer && <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
};
export default Modal;
