import React from 'react';
import { cn } from './cn';

/**
 * Button — Mantsu Design System
 *
 * Variants derived from the Figma component set "Button" with axes:
 *   Variant: Default | Secondary | Outline | Link | Gradient
 *   State:   Default | Hover | Disabled   (hover handled via CSS :hover)
 *   Size:    sm | default | lg
 *   Icon Style (icon-only): iconOnly
 *
 * "Default" = the navy primary. "Gradient" is the signature magenta→coral
 * call-to-action button (e.g. the "New" button in the app).
 */

export type ButtonVariant =
  | 'default' | 'secondary' | 'outline' | 'link' | 'gradient'
  | 'primary' | 'primary-outline' | 'success-outline' | 'ghost';
export type ButtonSize = 'xs' | 'sm' | 'default' | 'lg';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Render as a square icon-only button. */
  iconOnly?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

const base =
  'inline-flex items-center justify-center gap-2 font-bold rounded-md ' +
  'transition-colors duration-150 focus-visible:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:ring-offset-2 ' +
  'disabled:cursor-not-allowed select-none whitespace-nowrap';

const sizes: Record<ButtonSize, string> = {
  xs: 'h-7 px-3 text-xs',
  sm: 'h-9 px-3 text-body-sm-emphasis',
  default: 'h-11 px-4 text-body-sm-emphasis',
  lg: 'h-12 px-6 text-body-lg',
};

const iconSizes: Record<ButtonSize, string> = {
  xs: 'h-7 w-7 p-0',
  sm: 'h-9 w-9 p-0',
  default: 'h-11 w-11 p-0',
  lg: 'h-12 w-12 p-0',
};

const variants: Record<ButtonVariant, string> = {
  default:
    'bg-midnight text-white hover:bg-atlantic disabled:bg-slate-200 disabled:text-slate-400',
  secondary:
    'bg-frost text-midnight hover:bg-sky-mist disabled:bg-slate-50 disabled:text-slate-400',
  outline:
    'bg-transparent text-midnight border border-slate-200 hover:bg-frost disabled:text-slate-400 disabled:border-slate-200',
  link:
    'bg-transparent text-primary-blue underline-offset-4 hover:underline px-0 disabled:text-slate-400',
  gradient:
    'text-white bg-primary-gradient hover:opacity-90 disabled:opacity-50',
  // UI-20.4: the four Lists palettes the Make screens use, folded in so the
  // module's own Button could go. `primary` is the primary-blue action,
  // `primary-outline` and `success-outline` the bordered pair, `ghost` the
  // borderless text action.
  primary:
    'bg-primary-blue text-white shadow-mantsu-sm hover:bg-[#3588db] disabled:bg-primary-blue/40',
  'primary-outline':
    'border border-primary-blue bg-white text-primary-blue shadow-mantsu-sm hover:bg-info-bg disabled:border-slate-200 disabled:text-slate-400',
  'success-outline':
    'border border-success bg-white text-green-600 shadow-mantsu-sm hover:bg-success-bg disabled:border-slate-200 disabled:text-slate-400',
  ghost:
    'bg-transparent text-primary-blue hover:bg-[#e8f1fb] disabled:text-slate-400',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'default',
      size = 'default',
      iconOnly = false,
      leadingIcon,
      trailingIcon,
      className,
      children,
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      className={cn(
        base,
        iconOnly ? iconSizes[size] : sizes[size],
        variants[variant],
        className
      )}
      {...props}
    >
      {leadingIcon}
      {!iconOnly && children}
      {iconOnly && children}
      {trailingIcon}
    </button>
  )
);

Button.displayName = 'Button';
export default Button;
