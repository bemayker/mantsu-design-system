import React from 'react';
import { cn } from './cn';

/**
 * FormField — label, required marker, control and inline error (UI-20.4).
 *
 * Promoted from the Order Cockpit, whose copy carried the recorded Make
 * values; the Downtimes and Lists fields converge on it.
 *
 * Three control sizes, because the designs record three: `default` is the
 * 40px field (px 12, text `#0c1222`), `compact` the 36px one (px 8) and
 * `registration` the 36px one of the registration dialogs (px 12). They are
 * enumerated rather than passed as class overrides, so a recorded value is
 * never half-applied.
 *
 * `control` renders an `input`, a `textarea` or a native `select`. A control
 * this package does not own (a date picker bound to an app's translations)
 * is passed as `children` instead; the label, marker and error still come
 * from here, and the child takes `fieldId` as its id.
 */
export type FormFieldVariant = 'default' | 'compact' | 'registration';
export type FormFieldControl = 'input' | 'textarea' | 'select';
export type FormFieldInputType = 'text' | 'number' | 'time' | 'email' | 'password';

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormFieldProps {
  /** Id of the control, its `data-testid`, and the prefix of `-error`. */
  fieldId: string;
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  /** Colour of the required marker. Default `#ef4444`. */
  requiredColor?: string;
  /** Gap under the label: `sm` 4px (default), `md` 6px. */
  labelGap?: 'sm' | 'md';
  variant?: FormFieldVariant;
  control?: FormFieldControl;
  type?: FormFieldInputType;
  step?: string;
  inputMode?: 'decimal' | 'numeric' | 'text';
  /** A non-empty value marks the control invalid and renders the error box. */
  error?: string | null;
  disabled?: boolean;
  placeholder?: string;
  /** `textarea` only. Default 3. */
  rows?: number;
  maxLength?: number;
  autoFocus?: boolean;
  autoComplete?: string;
  /** `select` only. */
  options?: ReadonlyArray<FormFieldOption>;
  onBlur?: () => void;
  /**
   * Extra native attributes for the built-in `input` (`min`, `max`, a native
   * `onChange` for a caller that reads the event), spread last.
   */
  inputProps?: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'>;
  /** Custom control, rendered instead of the built-in one. */
  children?: React.ReactNode;
  /**
   * `false` leaves the error text to the custom control (a control that
   * renders its own), so it is not shown twice. Default `true`.
   */
  showError?: boolean;
  className?: string;
}

const CONTROL_BASE =
  'w-full rounded-md border bg-slate-50 leading-6 outline-none disabled:cursor-not-allowed disabled:opacity-50';

const CONTROL_SIZE: Record<FormFieldVariant, string> = {
  default: 'h-10 px-3 text-[14px] text-[#0c1222]',
  compact: 'h-9 px-2 text-[14px] text-primary-neutral',
  registration: 'h-9 px-3 text-[14px] text-primary-neutral',
};

export const FormField: React.FC<FormFieldProps> = ({
  fieldId, label, value = '', onChange, required = false, requiredColor = '#ef4444',
  labelGap = 'sm', variant = 'default', control = 'input', type = 'text', step, inputMode,
  error = null, disabled = false, placeholder, rows = 3, maxLength, autoFocus = false,
  autoComplete, options, onBlur, inputProps, children, showError = true, className,
}) => {
  const errorId = `${fieldId}-error`;
  const invalid = error !== null && error !== '';

  const controlClassName = cn(
    CONTROL_BASE,
    control === 'textarea' ? 'resize-none px-3 py-2 text-[14px] text-[#0c1222]' : CONTROL_SIZE[variant],
    invalid ? 'border-[#ef4444]' : 'border-slate-200 focus:border-primary-blue',
    'placeholder:text-slate-400',
  );

  const shared = {
    id: fieldId,
    'data-testid': fieldId,
    value,
    disabled,
    placeholder,
    autoFocus,
    onBlur,
    'aria-invalid': invalid || undefined,
    'aria-describedby': invalid ? errorId : undefined,
    'aria-required': required || undefined,
    className: controlClassName,
  };

  const emit = (next: string) => onChange?.(next);

  return (
    <div className={cn('flex flex-col', className)}>
      <label
        htmlFor={fieldId}
        className={cn('text-[14px] font-bold leading-6 text-[#0c1222]', labelGap === 'sm' ? 'mb-1' : 'mb-1.5')}
      >
        {label}
        {required && (
          <span aria-hidden style={{ color: requiredColor }}>
            *
          </span>
        )}
      </label>

      {children ?? (control === 'textarea' ? (
        <textarea {...shared} rows={rows} maxLength={maxLength} onChange={(e) => emit(e.target.value)} />
      ) : control === 'select' ? (
        <select {...shared} onChange={(e) => emit(e.target.value)}>
          {(options ?? []).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      ) : (
        <input {...shared} type={type} step={step} inputMode={inputMode} maxLength={maxLength}
          autoComplete={autoComplete} onChange={(e) => emit(e.target.value)} {...inputProps} />
      ))}

      {invalid && showError && (
        <p id={errorId} data-testid={errorId} role="alert"
          className="mt-2 rounded-md border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[14px] leading-5 text-[#dc2626]">
          {error}
        </p>
      )}
    </div>
  );
};
export default FormField;
