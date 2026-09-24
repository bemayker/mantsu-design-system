import { cn } from './cn';

/**
 * The typed-field look shared by `DatePicker`, `TimeField` and
 * `DateTimePicker`. Not exported from the package.
 *
 * Values are `Dropdown`'s trigger (`h-9`, `bg-slate-50`, `border-slate-200`,
 * the `primary-blue` focus ring, the disabled slate fill), so a date field
 * sits flush next to a select in the same form, and `Input`'s error and hint
 * lines. There is no Figma frame for a date field (CORE-FB-23 records the
 * divergence); if one appears, it wins over this file.
 */
export type FieldSize = 'md' | 'lg';

export function fieldClasses({
  size,
  invalid,
  disabled,
  withTrailingButton = false,
}: {
  size: FieldSize;
  invalid: boolean;
  disabled: boolean;
  withTrailingButton?: boolean;
}): string {
  return cn(
    'w-full rounded-md border bg-slate-50 pl-3 text-body text-primary-neutral placeholder:text-slate-400',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue',
    size === 'lg' ? 'h-10' : 'h-9',
    withTrailingButton ? 'pr-10' : 'pr-3',
    invalid ? 'border-error' : 'border-slate-200',
    disabled && 'cursor-not-allowed bg-slate-200 text-slate-400',
  );
}

export const LABEL_CLASSES = 'text-body-sm-emphasis text-primary-neutral';
export const REQUIRED_MARK_CLASSES = 'ml-0.5 text-error';
export const ERROR_CLASSES = 'text-body-xs text-error';
export const HINT_CLASSES = 'text-body-xs text-slate-500';
