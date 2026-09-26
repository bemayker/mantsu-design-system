import React from 'react';
import { cn } from './cn';

/** Tabs — underline-style tab navigation. */
export interface TabItem { id: string; label: string; disabled?: boolean; }
export interface TabsProps {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  className?: string;
  /**
   * `data-testid` prefix (UI-20.5): each tab is `{testIdPrefix}-{id}`. Also the
   * prefix of the ids below when `associatePanels` is on.
   */
  testIdPrefix?: string;
  /**
   * Give each tab the id `tabButtonId(prefix, id)` and `aria-controls` pointing
   * at `tabPanelId(prefix, id)`, for a screen that renders matching
   * `role="tabpanel"` elements. Needs `testIdPrefix`. Default `false`.
   */
  associatePanels?: boolean;
}

export function tabButtonId(prefix: string, id: string): string {
  return `${prefix}-${id}`;
}

export function tabPanelId(prefix: string, id: string): string {
  return `${prefix}-panel-${id}`;
}

export const Tabs: React.FC<TabsProps> = ({
  items, value, defaultValue, onChange, className, testIdPrefix, associatePanels = false,
}) => {
  const [internal, setInternal] = React.useState(defaultValue ?? items[0]?.id);
  const active = value ?? internal;
  const select = (id: string) => {
    if (value === undefined) setInternal(id);
    onChange?.(id);
  };
  const linked = associatePanels && testIdPrefix !== undefined;
  return (
    <div className={cn('flex gap-1 border-b border-slate-200', className)} role="tablist">
      {items.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={linked ? tabButtonId(testIdPrefix, t.id) : undefined}
            aria-controls={linked ? tabPanelId(testIdPrefix, t.id) : undefined}
            data-testid={testIdPrefix ? `${testIdPrefix}-${t.id}` : undefined}
            aria-selected={isActive}
            disabled={t.disabled}
            onClick={() => !t.disabled && select(t.id)}
            className={cn(
              'relative px-4 py-2.5 text-body-sm-emphasis transition-colors -mb-px',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue rounded-t',
              isActive ? 'text-primary-blue border-b-2 border-primary-blue' : 'text-slate-500 hover:text-midnight',
              t.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
};
export default Tabs;
