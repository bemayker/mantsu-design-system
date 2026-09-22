import React from 'react';
import { cn } from './cn';
import { useEscapeKey } from './useEscapeKey';

/** SideDrawer — slide-in panel from the right. */
export interface SideDrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}
export const SideDrawer: React.FC<SideDrawerProps> = ({
  open, onClose, title, children, footer, width = '420px',
}) => {
  // Shared stack, same reason as `Modal`: an overlay opened inside the drawer
  // closes itself on Escape without taking the drawer with it.
  useEscapeKey(open, onClose);
  return (
    <div className={cn('fixed inset-0 z-50', !open && 'pointer-events-none')}>
      <div
        className={cn('absolute inset-0 bg-midnight/40 transition-opacity', open ? 'opacity-100' : 'opacity-0')}
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        style={{ width }}
        className={cn(
          'absolute right-0 top-0 h-full bg-white shadow-mantsu-lg flex flex-col transition-transform',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="text-h3 text-midnight">{title}</h2>
            <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-midnight text-xl leading-none">×</button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-5 text-body text-midnight">{children}</div>
        {footer && <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">{footer}</div>}
      </aside>
    </div>
  );
};
export default SideDrawer;
