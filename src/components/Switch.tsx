import React from 'react';
import { cn } from './cn';

/** Switch — on/off toggle. */
export interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  /** Muted second line under `label` (UI-20.4). */
  description?: string;
  /** `data-testid` on the `role="switch"` button. */
  testId?: string;
  /**
   * Accessible name for a switch rendered without a visible `label`, which is
   * what a settings grid produces: the field's label is a sibling element the
   * grid owns, so the button would otherwise be an unnamed `role="switch"`,
   * unreachable by `getByRole('switch', { name })` and unannounced by a
   * screen reader. Prefer `label` where a visible one belongs to the control.
   */
  ariaLabel?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked, defaultChecked, disabled, onChange, label, description, testId, ariaLabel,
}) => {
  const [internal, setInternal] = React.useState(defaultChecked ?? false);
  const isOn = checked ?? internal;
  const toggle = () => {
    if (disabled) return;
    const next = !isOn;
    if (checked === undefined) setInternal(next);
    onChange?.(next);
  };
  return (
    <label className={cn('inline-flex items-center gap-2', disabled && 'opacity-50')}>
      <button
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-label={ariaLabel}
        data-testid={testId}
        disabled={disabled}
        onClick={toggle}
        className={cn(
          'relative h-6 w-11 rounded-full transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:ring-offset-2',
          isOn ? 'bg-primary-blue' : 'bg-slate-200',
          !disabled && 'cursor-pointer'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-mantsu-sm transition-transform',
            isOn && 'translate-x-5'
          )}
        />
      </button>
      {label && !description && <span className="text-body text-midnight">{label}</span>}
      {label && description && (
        <span className="min-w-0">
          <span className="block text-body text-midnight">{label}</span>
          <span className="block text-body-xs text-slate-400">{description}</span>
        </span>
      )}
    </label>
  );
};
export default Switch;
